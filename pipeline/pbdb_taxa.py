"""PBDB 산출 기록 → 계통수 노드 매핑, 지점×계통 자동 마커, 대표 분류군(featured) 마커."""
import csv
import json
import math
from collections import defaultdict

from common import MANUAL

NAMED_RANKS = {"species", "genus", "subspecies", "subgenus"}
NEAR_SITE_KM = 15
PLACE_MAX_KM = 40

# 계통수 노드 → 지도 마커 그룹(색). 위에서부터 먼저 맞는 조상을 쓴다.
GROUP_BY_NODE = [
    ("aves", "bird"), ("dromaeosauridae", "theropod"), ("theropoda", "theropod"), ("sauropoda", "sauropod"),
    ("ornithopoda", "ornithopod"), ("ceratopsia", "ceratopsian"), ("dinosauria", "dinosaur"),
    ("pterosauria", "pterosaur"), ("plesiosauria", "marine_reptile"), ("mosasauridae", "marine_reptile"),
    ("sauropsida", "reptile"), ("mammalia", "mammal"), ("amphibia", "amphibian"), ("conodonta", "fish"), ("vertebrata", "fish"),
    ("insecta", "insect"), ("arachnida", "insect"), ("mollusca", "mollusk"), ("animalia", "invertebrate"),
]


def km_between(a, b):
    lat1, lng1, lat2, lng2 = map(math.radians, (a["lat"], a["lng"], b["lat"], b["lng"]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def load_map():
    return json.loads((MANUAL / "pbdb_taxon_map.json").read_text(encoding="utf-8"))


def load_places():
    with open(MANUAL / "places.csv", encoding="utf-8") as f:
        return [{"name": r["name"], "lat": float(r["lat"]), "lng": float(r["lng"])} for r in csv.DictReader(f)]


def map_taxon(rec, rules):
    """family → order → class → phylum 순으로 노드를 찾는다. 규칙 값이 null 이면 제외(None)."""
    for level in ("family", "order", "class", "phylum"):
        value = rec.get(level)
        if value and value in rules.get(level, {}):
            return rules[level][value]
    return None


def nearest_place(pt, places):
    best = min(places, key=lambda p: km_between(pt, p))
    return best["name"] if km_between(pt, best) <= PLACE_MAX_KM else None


def group_for(node_id, ancestors):
    """ancestors: 자기 자신부터 루트까지의 노드 id 목록."""
    for anc, group in GROUP_BY_NODE:
        if anc in ancestors:
            return group
    return "invertebrate"


def taxa_summary(recs):
    by = defaultdict(list)
    for r in recs:
        by[r["accepted_name"]].append(r)
    out = [
        {"name": name, "rank": rs[0].get("accepted_rank"), "pbdb_no": rs[0].get("accepted_no"), "n": len(rs)}
        for name, rs in by.items()
    ]
    return sorted(out, key=lambda t: (-t["n"], t["name"]))


def auto_markers(records, era_of, rules, places, tree_rows, manual_sites):
    """반환: (자동 마커 목록, {수작업 사이트 id: 붙일 분류군 목록}, 제외 건수).

    이름 붙은(속·종) 기록만 쓴다. 같은 시대·같은 노드·같은 시군 기록을 마커 하나로 묶는다.
    같은 노드의 수작업 사이트가 15km 안에 있으면 마커를 만들지 않고 그 사이트에 분류군 목록을 붙인다.
    """
    parents = {r["id"]: r["parent"] for r in tree_rows}
    names_ko = {r["id"]: r["name_ko"] for r in tree_rows}

    def ancestors(node):
        out = []
        while node:
            out.append(node)
            node = parents.get(node)
        return out

    clusters, skipped = defaultdict(list), 0
    for r in records:
        if r.get("accepted_rank") not in NAMED_RANKS:
            continue
        try:
            era = era_of(float(r["max_ma"]), float(r["min_ma"]))
            pt = {"lat": float(r["lat"]), "lng": float(r["lng"])}
        except (KeyError, TypeError, ValueError):
            continue
        if era is None:
            continue
        node = map_taxon(r, rules)
        if node is None:
            skipped += 1
            continue
        if node not in parents:
            raise ValueError(f"pbdb_taxon_map points to unknown node {node}")
        place = nearest_place(pt, places) or f"{round(pt['lat'], 1)},{round(pt['lng'], 1)}"
        clusters[(era, node, place)].append({**r, "_pt": pt})

    markers, attach = [], defaultdict(list)
    for (era, node, place), recs in sorted(clusters.items()):
        center = {
            "lat": round(sum(r["_pt"]["lat"] for r in recs) / len(recs), 3),
            "lng": round(sum(r["_pt"]["lng"] for r in recs) / len(recs), 3),
        }
        taxa = taxa_summary(recs)
        host = next(
            (s for s in manual_sites
             if s["era_id"] == era and s["tree_node_id"] == node and km_between(s["location"]["modern"], center) <= NEAR_SITE_KM),
            None,
        )
        if host:
            attach[host["id"]].extend(taxa)
            continue
        is_place = not place[0].isdigit()
        label = f"{place} 일대" if is_place else "위치 미상 지점"
        top = ", ".join(t["name"] for t in taxa[:3])
        markers.append({
            "id": f"pbdb-{era}-{node}-{place}".replace(",", "_"),
            "name_ko": f"{label} {names_ko[node]} 화석",
            "scientific_name": None,
            "taxon_group": group_for(node, ancestors(node)),
            "tree_node_id": node,
            "fossil_type": "record",
            "era_id": era,
            "age_range_ma": [round(max(float(r["max_ma"]) for r in recs), 1), round(min(float(r["min_ma"]) for r in recs), 1)],
            "location": {"name": f"{label} (가까운 시군 기준 자동 명칭)" if is_place else label, "modern": center},
            "marker_type": "korea",
            "badges": ["auto_pbdb"],
            "description": (
                f"PBDB에 등록된 이 일대의 {names_ko[node]} 산출 기록 {len(recs)}건을 묶은 자동 마커예요. "
                f"학명이 붙은 분류군 {len(taxa)}개가 있으며, 대표적으로 {top} 등이 있어요."
                + ("" if is_place else " PBDB 좌표가 알려진 시군과 40km 이상 떨어져 있어 지명을 붙이지 않았어요.")
            ),
            "sources": ["PBDB 자동 수집 (분류군별 원기재 문헌은 PBDB 참조)"],
            "taxa": taxa,
            "pbdb_nearby": None,
        })
    return markers, dict(attach), skipped


def featured_markers(records, era_of, rules, places, tree_rows, featured):
    """대표 분류군: 수작업 설명을 붙인 개별 마커. PBDB 기록 위치·연대·분류를 그대로 쓴다."""
    parents = {r["id"]: r["parent"] for r in tree_rows}

    def ancestors(node):
        out = []
        while node:
            out.append(node)
            node = parents.get(node)
        return out

    out = []
    for f in featured:
        recs = [r for r in records if r.get("accepted_name") == f["pbdb_name"]]
        if not recs:
            raise ValueError(f"featured taxon not in PBDB records: {f['pbdb_name']}")
        node = map_taxon(recs[0], rules)
        if node is None:
            raise ValueError(f"featured taxon has no tree node: {f['pbdb_name']}")
        era = era_of(float(recs[0]["max_ma"]), float(recs[0]["min_ma"]))
        pts = [(float(r["lat"]), float(r["lng"])) for r in recs]
        center = {"lat": round(sum(p[0] for p in pts) / len(pts), 3), "lng": round(sum(p[1] for p in pts) / len(pts), 3)}
        place = nearest_place(center, places)
        out.append({
            "id": f["id"],
            "name_ko": f["name_ko"],
            "scientific_name": f["pbdb_name"],
            "taxon_group": group_for(node, ancestors(node)),
            "tree_node_id": node,
            "fossil_type": f["fossil_type"],
            "era_id": era,
            "age_range_ma": [round(max(float(r["max_ma"]) for r in recs), 1), round(min(float(r["min_ma"]) for r in recs), 1)],
            "location": {
                "name": f"{place + ' 일대' if place else '위치 미상'} (PBDB 산출 기록 {len(recs)}건 평균 위치)",
                "modern": center,
            },
            "marker_type": "korea",
            "badges": f["badges"],
            "description": f["description"],
            "sources": f["sources"],
            "taxa": taxa_summary(recs),
            "pbdb_nearby": None,
        })
    return out
