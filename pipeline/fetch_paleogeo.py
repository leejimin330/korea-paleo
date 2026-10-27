"""[1] 시대별 고지리 해안선 + 한반도 윤곽 복원 (GPlates Web Service, Natural Earth)."""
import json

from collections import defaultdict

from shapely.geometry import Point, mapping, shape
from shapely.strtree import STRtree
from shapely.ops import unary_union

from common import ERA_TIMES, GPLATES, MODEL, PROCESSED, cached_get, reconstruct_points, write_json

NE_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
    "geojson/ne_50m_admin_0_countries.geojson"
)


# 과거 지도 시간 슬라이더의 시점(Ma). 시대 기준 연대(ERA_TIMES)는 모두 들어간다.
SLIDER_TIMES = sorted({500, 450, 420, 380, 340, 270, 250, 220, 200, 170, 145, 120, 80, 66, 45, 30, 5, *ERA_TIMES.values()}, reverse=True)
# 한반도 중심(대략 대전 부근). 이 점의 과거 위치로 이동 경로와 "그때 위도"를 보여 준다.
KOREA_CENTER = (127.5, 36.5)


# 대륙(지괴) 무리. 판 번호(MERDITH2021)를 먼저 보고, 모르는 판은 Natural Earth 대륙으로 정한다.
GROUP_BY_CONTINENT = {
    "Asia": "other_asia", "Europe": "europe", "Africa": "africa", "North America": "north_america",
    "South America": "south_america", "Oceania": "australia", "Antarctica": "antarctica",
}


def classify(pid, continent, adm0, lng=0.0):
    s = str(pid)
    if continent == "Europe" and lng > 60:
        continent = "Asia"  # Natural Earth는 러시아 전체를 유럽으로 분류한다 (우랄산맥 동쪽은 아시아로 본다)
    if adm0 == "JPN":
        return "japan"
    if s == "601":
        return "north_china"  # 한반도도 이 판(북중국 지괴)에 속한다
    if s.startswith("602"):
        return "south_china"
    if s == "401":
        return "siberia"
    if s == "501":
        return "india"
    if s == "503":
        return "africa"  # 아라비아는 약 2,500만 년 전까지 아프리카와 붙어 있었다
    if s == "802":
        return "antarctica"
    if s.startswith("801"):
        return "australia"
    if len(s) == 3 and s[0] in "1237":
        return {"1": "north_america", "2": "south_america", "3": "europe", "7": "africa"}[s[0]]
    return GROUP_BY_CONTINENT.get(continent, "other_asia")


def label_pieces(coast0, ne):
    """오늘날 해안선 조각마다 대표점·면적·대륙 무리. 반환: [(lng, lat, group, area)]."""
    polys = [shape(f["geometry"]) for f in coast0["features"]]
    pts = [p.representative_point() for p in polys]
    pids = []
    for i in range(0, len(pts), 150):
        chunk = pts[i : i + 150]
        pids += cached_get(f"{GPLATES}/reconstruct/assign_points_plate_ids/",
                           {"points": ",".join(f"{p.x:.3f},{p.y:.3f}" for p in chunk), "model": MODEL})
    countries = [(shape(f["geometry"]), f["properties"]) for f in ne["features"]]
    tree = STRtree([g for g, _ in countries])
    out = []
    for poly, pt, pid in zip(polys, pts, pids):
        props = None
        for i in tree.query(pt):
            if countries[i][0].contains(pt):
                props = countries[i][1]
                break
        if props is None:
            props = countries[tree.nearest(pt)][1]
        out.append((pt.x, pt.y, classify(pid, props.get("CONTINENT"), props.get("ADM0_A3"), pt.x), poly.area))
    return out


def tag_groups(coast_t, labeled_pts):
    """시점 t의 해안선마다 안에 든 대표점들의 면적 가중 다수결로 무리를 붙이고, 무리별 이름표 위치를 고른다."""
    pts = [Point(lng, lat) for lng, lat, _, _ in labeled_pts]
    tree = STRtree(pts)
    biggest = {}
    for f in coast_t["features"]:
        g = shape(f["geometry"])
        if not g.is_valid:
            g = g.buffer(0)
        votes = defaultdict(float)
        for i in tree.query(g):
            if g.contains(pts[i]):
                votes[labeled_pts[i][2]] += labeled_pts[i][3]
        if votes:
            group = max(votes, key=votes.get)
        else:
            group = labeled_pts[tree.nearest(g.representative_point())][2]
        f["properties"] = {"g": group}
        if g.area > biggest.get(group, (0, None))[0]:
            biggest[group] = (g.area, g.representative_point())
    labels = [[grp, round(p.x, 2), round(p.y, 2)] for grp, (area, p) in sorted(biggest.items()) if area >= 4]
    return labels


def round_coords(obj, nd=2):
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(v, nd) for v in obj]
        return [round_coords(o, nd) for o in obj]
    return obj


def simplify_fc(fc, tolerance=0.1, min_area=0.3, nd=2):
    """해안선 FeatureCollection 단순화: 작은 섬 제거 + Douglas-Peucker + 좌표 반올림."""
    out = []
    for f in fc["features"]:
        geom = f.get("geometry")
        if not geom:
            continue
        g = shape(geom)
        if not g.is_valid:
            g = g.buffer(0)
        if g.area < min_area:
            continue
        g = g.simplify(tolerance, preserve_topology=True)
        if g.is_empty:
            continue
        gj = mapping(g)
        out.append({"type": "Feature", "properties": {}, "geometry": {"type": gj["type"], "coordinates": round_coords(gj["coordinates"], nd)}})
    return {"type": "FeatureCollection", "features": out}


def korea_outline(ne_fc):
    """Natural Earth 국가 경계에서 남·북한을 합친 한반도 윤곽 (작은 섬 제외)."""
    geoms = [shape(f["geometry"]) for f in ne_fc["features"] if f["properties"].get("ADM0_A3") in ("KOR", "PRK")]
    if len(geoms) != 2:
        raise RuntimeError(f"expected KOR+PRK, got {len(geoms)}")
    merged = unary_union(geoms).simplify(0.02, preserve_topology=True)
    polys = getattr(merged, "geoms", [merged])
    polys = [p for p in polys if p.area > 0.05]  # 본토 + 제주 등 큰 섬만
    return {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": round_coords(mapping(p)["coordinates"], 3)}}
        for p in polys
    ]}


def main():
    ne = cached_get(NE_URL)
    korea0 = korea_outline(ne)
    write_json(PROCESSED / "outlines" / "korea_0ma.geojson", korea0)
    coast0 = simplify_fc(cached_get(f"{GPLATES}/reconstruct/coastlines/", {"time": 0, "model": MODEL}))
    pieces = label_pieces(coast0, ne)
    steps = []
    for t in SLIDER_TIMES:
        coast = cached_get(f"{GPLATES}/reconstruct/coastlines/", {"time": t, "model": MODEL})
        simple = simplify_fc(coast)
        moved = reconstruct_points([(x, y) for x, y, _, _ in pieces], t)
        labels = tag_groups(simple, [(lng, lat, g, a) for (lng, lat), (_, _, g, a) in zip(moved, pieces)])
        write_json(PROCESSED / "maps" / f"coastlines_{t}ma.geojson", simple)
        if t > 0:
            rec = cached_get(
                f"{GPLATES}/reconstruct/reconstruct_feature_collection/",
                {"feature_collection": json.dumps(korea0, separators=(",", ":")), "time": t, "model": MODEL},
            )
            write_json(PROCESSED / "outlines" / f"korea_{t}ma.geojson", rec)
        (lng, lat), = reconstruct_points([KOREA_CENTER], t)
        steps.append({"t": t, "korea": [lng, lat], "labels": labels})
        print(f"{t} Ma: coastline features {len(coast['features'])} -> {len(simple['features'])}, korea center {lng}, {lat}")
    write_json(PROCESSED / "paleo_steps.json", steps)


if __name__ == "__main__":
    main()
