"""[3b] 시대별 생물 도감: 한반도 + 주변 지역 PBDB 기록에서 시대마다 40~50속을 고른다 → species.json

- 주변 지역 = 경도 115–145°, 위도 30–50° (중국 북동부·일본·러시아 극동). 한반도(KR·KP) 기록이 있으면 '한반도', 없으면 '주변 지역'.
- 수작업 화석지·대표종(이미 fossils.json에 있는 마커)은 그대로 도감 항목이 되고, 나머지를 PBDB 속(genus)으로 채운다.
- 속은 계통수 노드별로 (속 수)^0.4에 비례한 몫을 받고, 한 노드는 6속까지 (조개·삼엽충처럼 기록이 많은 무리만 고르지 않도록).
- 한국어 이름은 manual/species_names_ko.json. 이름이 없는 속은 고르지 않는다.
"""
import json
import math
from collections import Counter, defaultdict

from common import ERA_TIMES, MANUAL, PROCESSED, RAW, cached_get, reconstruct_points, write_json
from build_tree import read_rows
from pbdb_taxa import group_for, km_between, load_map, map_taxon

PBDB_URL = "https://paleobiodb.org/data1.2/occs/list.json"
BBOX = {"lngmin": 115, "lngmax": 145, "latmin": 30, "latmax": 50}
KOREA_CC = {"KR", "KP"}
NEARBY_CC = {"CN": "중국", "JP": "일본", "RU": "러시아", "MN": "몽골"}
TARGET = 48
MIN_PBDB = 30  # 수작업 마커가 많은 시대(백악기)도 PBDB 속을 최소 이만큼 더한다.
NODE_CAP = 6
VERTEBRATE_BONUS = 1.8
KOREA_CENTER = {"lat": 36.5, "lng": 127.8}

# PBDB state 값 → 한국어 지명. 없는 값은 나라 이름만 쓴다.
STATES_KO = {
    "Liaoning": "랴오닝성", "Jilin": "지린성", "Heilongjiang": "헤이룽장성", "Hebei": "허베이성", "Shandong": "산둥성",
    "Nei Mongol": "네이멍구", "Inner Mongolia": "네이멍구", "Beijing": "베이징", "Tianjin": "톈진", "Jiangsu": "장쑤성",
    "Anhui": "안후이성", "Shanxi": "산시성", "Henan": "허난성", "Zhejiang": "저장성", "Shanghai": "상하이", "Hubei": "후베이성",
    "Jiangxi": "장시성", "Fujian": "푸젠성", "Hunan": "후난성",
    "Hokkaido": "홋카이도", "Aomori": "아오모리현", "Iwate": "이와테현", "Miyagi": "미야기현", "Akita": "아키타현",
    "Yamagata": "야마가타현", "Fukushima": "후쿠시마현", "Ibaraki": "이바라키현", "Tochigi": "도치기현", "Gunma": "군마현",
    "Saitama": "사이타마현", "Chiba": "지바현", "Tokyo": "도쿄도", "Kanagawa": "가나가와현", "Niigata": "니가타현",
    "Toyama": "도야마현", "Ishikawa": "이시카와현", "Fukui": "후쿠이현", "Yamanashi": "야마나시현", "Nagano": "나가노현",
    "Gifu": "기후현", "Shizuoka": "시즈오카현", "Aichi": "아이치현", "Mie": "미에현", "Shiga": "시가현", "Kyoto": "교토부",
    "Osaka": "오사카부", "Hyogo": "효고현", "Nara": "나라현", "Wakayama": "와카야마현", "Tottori": "돗토리현",
    "Shimane": "시마네현", "Okayama": "오카야마현", "Hiroshima": "히로시마현", "Yamaguchi": "야마구치현",
    "Tokushima": "도쿠시마현", "Kagawa": "가가와현", "Ehime": "에히메현", "Kochi": "고치현", "Fukuoka": "후쿠오카현",
    "Saga": "사가현", "Nagasaki": "나가사키현", "Kumamoto": "구마모토현", "Oita": "오이타현", "Miyazaki": "미야자키현",
    "Kagoshima": "가고시마현",
    "Primorye": "연해주", "Primorsky Krai": "연해주", "Primorskiy Kray": "연해주", "Khabarovsk": "하바롭스크주",
    "Sakhalin": "사할린", "Amur": "아무르주", "Amurskaya Oblast": "아무르주", "Jewish Autonomous Oblast": "유대인 자치주",
}


def fetch_region(old, young):
    body = cached_get(
        PBDB_URL,
        {"base_name": "Animalia", "max_ma": old, "min_ma": young, **BBOX, "show": "class,coords,loc", "vocab": "pbdb"},
        timeout=300,
    )
    return body["records"]


def quotas(counts, weights, total, cap=NODE_CAP):
    """노드별 몫: 가중치에 비례, 최소 1, cap과 후보 수를 넘지 않게. 남는 자리는 후보가 남은 노드에 다시 나눈다."""
    out = {n: 0 for n in counts}
    limit = {n: min(counts[n], cap) for n in counts}
    left = total
    while left > 0:
        open_nodes = [n for n in counts if out[n] < limit[n]]
        if not open_nodes:
            break
        weight = sum(weights[n] for n in open_nodes)
        given = 0
        for n in sorted(open_nodes, key=lambda n: (-weights[n], n)):
            share = max(1, round(left * weights[n] / weight))
            share = min(share, limit[n] - out[n], left - given)
            out[n] += share
            given += share
            if given >= left:
                break
        if given == 0:
            break
        left -= given
    return out


def location_name(rec, region):
    """대표 산출 기록 하나의 나라·지역 이름 (나라와 지역이 어긋나지 않도록 같은 기록에서 둘 다 가져온다)."""
    if region == "korea":
        return "한반도"
    state = STATES_KO.get((rec.get("state") or "").strip(), "")
    return f"{NEARBY_CC[rec['cc']]} {state}".strip()


def build_entry(era, genus, recs, node, names_ko_node, ancestors, name_info):
    korea = [r for r in recs if r["cc"] in KOREA_CC]
    region = "korea" if korea else "nearby"
    use = korea or recs
    near = None
    if region == "korea":
        pt = {"lat": round(sum(float(r["lat"]) for r in use) / len(use), 3),
              "lng": round(sum(float(r["lng"]) for r in use) / len(use), 3)}
    else:
        # 주변 지역은 한반도에서 가장 가까운 산출 지점을 대표 위치로 쓴다.
        near = min(use, key=lambda r: km_between({"lat": float(r["lat"]), "lng": float(r["lng"])}, KOREA_CENTER))
        pt = {"lat": round(float(near["lat"]), 3), "lng": round(float(near["lng"]), 3)}
    countries = sorted({("KR" if r["cc"] in KOREA_CC else r["cc"]) for r in recs})
    old = round(max(float(r["max_ma"]) for r in recs), 2)
    young = round(min(float(r["min_ma"]) for r in recs), 2)
    group_name = names_ko_node[node]
    where = ", ".join("한반도" if c == "KR" else NEARBY_CC[c] for c in countries)
    if region == "korea":
        desc = (f"{group_name} 무리에 속하는 속이에요. PBDB에 한반도 산출 기록 {len(korea)}건이 있어요"
                + (f" (주변 지역 포함 전체 {len(recs)}건)." if len(recs) > len(korea) else "."))
    else:
        desc = (f"{group_name} 무리에 속하는 속이에요. 한반도에서는 아직 기록이 없지만, 같은 시대 가까운 {where}에서 "
                f"산출 기록 {len(recs)}건이 나왔어요.")
    if name_info.get("note"):
        desc = f"{name_info['note']} {desc}"
    return {
        "id": f"sp-{era}-{genus.lower()}",
        "era_id": era,
        "name_ko": name_info["ko"],
        "scientific_name": genus,
        "rank": "genus",
        "pbdb_no": recs[0].get("accepted_no") if recs[0].get("accepted_rank") == "genus" else None,
        "tree_node_id": node,
        "taxon_group": group_for(node, ancestors(node)),
        "region": region,
        "countries": countries,
        "n_records": len(recs),
        "age_range_ma": [old, young],
        "location": {"name": location_name(near, region), "modern": pt},
        "description": desc,
        "source": "pbdb",
        "fossil_id": None,
    }


def select(era, recs, rules, tree_rows, names, taken_genera, slots):
    parents = {r["id"]: r["parent"] for r in tree_rows}
    names_ko_node = {r["id"]: r["name_ko"] for r in tree_rows}

    def ancestors(node):
        out = []
        while node:
            out.append(node)
            node = parents.get(node)
        return out

    by_genus = defaultdict(list)
    for r in recs:
        g = (r.get("genus") or "").split(" ")[0]  # "Genus (Subgenus)" → Genus
        if not g or r.get("cc") not in KOREA_CC | NEARBY_CC.keys():
            continue
        by_genus[g].append(r)

    cands = defaultdict(list)  # node → [(genus, recs)]
    unnamed = Counter()
    for g, rs in by_genus.items():
        if g in taken_genera:
            continue
        node = map_taxon(rs[0], rules)
        if node is None:
            continue
        if node not in parents:
            raise ValueError(f"pbdb_taxon_map points to unknown node {node}")
        if g not in names:
            unnamed[node] += 1
            continue
        cands[node].append((g, rs))
    for node in cands:
        # 한반도 기록이 있는 속 먼저, 그다음 기록이 많은 순.
        cands[node].sort(key=lambda x: (-any(r["cc"] in KOREA_CC for r in x[1]), -len(x[1]), x[0]))
    # 척추동물은 기록이 적어도 몫을 더 준다 (관람객이 알아보기 쉬운 생물).
    weights = {n: len(v) ** 0.4 * (VERTEBRATE_BONUS if "vertebrata" in ancestors(n) else 1) for n, v in cands.items()}
    q = quotas({n: len(v) for n, v in cands.items()}, weights, slots)
    out = []
    for node, k in q.items():
        for g, rs in cands[node][:k]:
            out.append(build_entry(era, g, rs, node, names_ko_node, ancestors, names[g]))
    return out, unnamed


def main(fossils=None, report=False):
    from build_fossils import ERA_RANGES, era_of

    rules, tree_rows = load_map(), read_rows(MANUAL / "taxa.csv")
    names = json.loads((MANUAL / "species_names_ko.json").read_text(encoding="utf-8"))
    names.pop("_comment", None)
    if fossils is None:
        fossils = json.loads((PROCESSED / "fossils.json").read_text(encoding="utf-8"))

    species, lines = [], []
    for era, (old, young) in ERA_RANGES.items():
        recs = []
        for r in fetch_region(old, young):
            try:
                if era_of(float(r["max_ma"]), float(r["min_ma"])) == era and r.get("lat") is not None:
                    recs.append(r)
            except (KeyError, TypeError, ValueError):
                continue
        # 수작업·대표 마커는 그대로 도감 항목이 된다.
        own = [f for f in fossils if f["era_id"] == era and "auto_pbdb" not in f["badges"]]
        taken = {f["scientific_name"].split()[0] for f in own if f.get("scientific_name")}
        for f in own:
            species.append({
                "id": f"sp-{f['id']}",
                "era_id": era,
                "name_ko": f["name_ko"],
                "scientific_name": f["scientific_name"],
                "rank": None,
                "pbdb_no": None,
                "tree_node_id": f["tree_node_id"],
                "taxon_group": f["taxon_group"],
                "region": "korea" if f["marker_type"] == "korea" else "nearby",
                "countries": [],
                "n_records": None,
                "age_range_ma": f["age_range_ma"],
                "location": {"name": f["location"]["name"], "modern": f["location"]["modern"]},
                "description": f["description"],
                "source": "manual",
                "fossil_id": f["id"],
            })
        pool = names
        if report:
            # 이름 파일을 채울 때: 이름이 없어도 고른다고 가정하고, 고를 속만 출력한다.
            pool = defaultdict(lambda: {"ko": "?"}, names)
            pool.update({g: names.get(g, {"ko": "?"}) for g in (r["genus"].split(" ")[0] for r in recs if r.get("genus"))})
        picked, unnamed = select(era, recs, rules, tree_rows, pool, taken, max(TARGET - len(own), MIN_PBDB))
        if report:
            lines += [f"{p['era_id']}	{p['tree_node_id']}	{p['scientific_name']}	{p['region']}	{p['n_records']}	{p['location']['name']}	{names.get(p['scientific_name'], {}).get('ko', '')}" for p in picked]
            continue
        species += picked
        print(f"{era}: manual {len(own)} + pbdb {len(picked)} = {len(own) + len(picked)} "
              f"(korea {sum(p['region'] == 'korea' for p in picked)}, unnamed candidates skipped {sum(unnamed.values())})")
    if report:
        (RAW / "species_candidates.tsv").write_text("\n".join(lines), encoding="utf-8")
        print("wrote", RAW / "species_candidates.tsv", len(lines))
        return []
    return species


def link_and_reconstruct(species, fossils):
    """한반도 속은 같은 시대의 자동 마커(묶인 분류군에 그 속이 있는 것)에 연결하고, 나머지는 자기 마커를 만든다."""
    new_markers = []
    for s in species:
        if s["fossil_id"]:
            continue
        genus = s["scientific_name"]
        hosts = [
            f for f in fossils
            if f["era_id"] == s["era_id"] and any(t["name"].split()[0] == genus for t in f.get("taxa") or [])
        ]
        if s["region"] == "korea" and hosts:
            best = max(hosts, key=lambda f: sum(t["n"] for t in f["taxa"] if t["name"].split()[0] == genus))
            s["fossil_id"] = best["id"]
            continue
        marker_id = s["id"]
        s["fossil_id"] = marker_id
        new_markers.append({
            "id": marker_id,
            "name_ko": s["name_ko"],
            "scientific_name": genus,
            "taxon_group": s["taxon_group"],
            "tree_node_id": s["tree_node_id"],
            "fossil_type": "record",
            "era_id": s["era_id"],
            "age_range_ma": s["age_range_ma"],
            "location": {"name": s["location"]["name"], "modern": s["location"]["modern"]},
            "marker_type": "korea" if s["region"] == "korea" else "east_asia_reference",
            "badges": (["east_asia_reference"] if s["region"] == "nearby" else []) + ["auto_pbdb"],
            "description": s["description"],
            "sources": ["PBDB 자동 수집 (원기재 문헌은 PBDB 참조)"],
            "taxa": [{"name": genus, "rank": "genus", "pbdb_no": s["pbdb_no"], "n": s["n_records"]}],
            "pbdb_nearby": None,
        })
    by_era = defaultdict(list)
    for m in new_markers:
        by_era[m["era_id"]].append(m)
    for era, ms in by_era.items():
        pts = reconstruct_points([(m["location"]["modern"]["lng"], m["location"]["modern"]["lat"]) for m in ms], ERA_TIMES[era])
        for m, (lng, lat) in zip(ms, pts):
            m["location"]["paleo"] = {"lat": lat, "lng": lng}
    return new_markers


if __name__ == "__main__":
    import sys

    main(report="--report" in sys.argv)
