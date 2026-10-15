"""[3] 수작업 화석지 + PBDB 집계 + GPlates 좌표 복원 → fossils.json, pbdb_points.json"""
import json
import math
from collections import Counter, defaultdict

from common import ERA_TIMES, MANUAL, PROCESSED, reconstruct_points, write_json
from build_tree import read_rows
from fetch_fossils import fetch
from pbdb_taxa import auto_markers, featured_markers, load_map, load_places

ERA_RANGES = {
    "paleozoic": (500, 443),
    "late_paleozoic": (358.9, 251.9),
    "cretaceous": (145, 66),
    "miocene": (23.03, 5.33),
    "ice_age": (0.13, 0.0117),
}


def era_of(max_ma, min_ma):
    """기록의 연대 범위가 통째로 들어가는 시대 id (없으면 None)."""
    for era, (old, young) in ERA_RANGES.items():
        if max_ma <= old + 0.5 and min_ma >= young - 0.005:
            return era
    return None


def aggregate_pbdb(records):
    """PBDB 산출 기록을 (시대, 좌표 0.01°) 단위 지점으로 묶는다."""
    groups = defaultdict(list)
    for r in records:
        try:
            lat, lng = float(r["lat"]), float(r["lng"])
            era = era_of(float(r["max_ma"]), float(r["min_ma"]))
        except (KeyError, TypeError, ValueError):
            continue
        if era is None:
            continue
        groups[(era, round(lat, 2), round(lng, 2))].append(r)
    points = []
    for (era, lat, lng), recs in sorted(groups.items()):
        names = Counter(r.get("identified_name") or r.get("accepted_name") for r in recs)
        points.append({
            "era_id": era,
            "modern": {"lat": lat, "lng": lng},
            "n": len(recs),
            "taxa": [n for n, _ in names.most_common(6) if n],
            "classes": sorted({r.get("class") for r in recs if r.get("class") and r.get("class") != "NO_CLASS_SPECIFIED"}),
        })
    return points


def km_between(a, b):
    lat1, lng1, lat2, lng2 = map(math.radians, (a["lat"], a["lng"], b["lat"], b["lng"]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def pbdb_count_near(site, points, radius_km=15):
    return sum(
        p["n"] for p in points
        if p["era_id"] == site["era_id"] and km_between(site["location"]["modern"], p["modern"]) <= radius_km
    )


def attach_paleo(items, get_modern, set_paleo):
    """시대별로 묶어 GPlates로 과거 좌표를 붙인다."""
    by_era = defaultdict(list)
    for it in items:
        by_era[it["era_id"]].append(it)
    for era, its in by_era.items():
        pts = [(get_modern(i)["lng"], get_modern(i)["lat"]) for i in its]
        for it, (lng, lat) in zip(its, reconstruct_points(pts, ERA_TIMES[era])):
            set_paleo(it, {"lat": lat, "lng": lng})


def main():
    sites = json.loads((MANUAL / "korea_fossil_sites.json").read_text(encoding="utf-8"))
    records = fetch("KR")
    points = aggregate_pbdb(records)
    for s in sites:
        s["pbdb_nearby"] = pbdb_count_near(s, points) if s["marker_type"] == "korea" else None

    rows, rules, places = read_rows(MANUAL / "taxa.csv"), load_map(), load_places()
    featured = json.loads((MANUAL / "featured_taxa.json").read_text(encoding="utf-8"))
    auto, attach, skipped = auto_markers(records, era_of, rules, places, rows, sites)
    for s in sites:
        if s["id"] in attach:
            s["taxa"] = attach[s["id"]]
    feat = featured_markers(records, era_of, rules, places, rows, featured)
    print(f"auto markers {len(auto)} ({dict(Counter(m['era_id'] for m in auto))}), featured {len(feat)}, "
          f"attached to manual sites {len(attach)}, skipped unmapped records {skipped}")
    sites = sites + feat + auto
    attach_paleo(sites, lambda s: s["location"]["modern"], lambda s, p: s["location"].__setitem__("paleo", p))
    attach_paleo(points, lambda p: p["modern"], lambda p, q: p.__setitem__("paleo", q))
    write_json(PROCESSED / "fossils.json", sites)
    write_json(PROCESSED / "pbdb_points.json", points)
    print(f"sites {len(sites)}, pbdb points {len(points)} {dict(Counter(p['era_id'] for p in points))}")



if __name__ == "__main__":
    main()
