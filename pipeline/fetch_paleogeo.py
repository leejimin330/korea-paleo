"""[1] 시대별 고지리 해안선 + 한반도 윤곽 복원 (GPlates Web Service, Natural Earth)."""
import json

from shapely.geometry import mapping, shape
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
    steps = []
    for t in SLIDER_TIMES:
        coast = cached_get(f"{GPLATES}/reconstruct/coastlines/", {"time": t, "model": MODEL})
        simple = simplify_fc(coast)
        write_json(PROCESSED / "maps" / f"coastlines_{t}ma.geojson", simple)
        if t > 0:
            rec = cached_get(
                f"{GPLATES}/reconstruct/reconstruct_feature_collection/",
                {"feature_collection": json.dumps(korea0, separators=(",", ":")), "time": t, "model": MODEL},
            )
            write_json(PROCESSED / "outlines" / f"korea_{t}ma.geojson", rec)
        (lng, lat), = reconstruct_points([KOREA_CENTER], t)
        steps.append({"t": t, "korea": [lng, lat]})
        print(f"{t} Ma: coastline features {len(coast['features'])} -> {len(simple['features'])}, korea center {lng}, {lat}")
    write_json(PROCESSED / "paleo_steps.json", steps)


if __name__ == "__main__":
    main()
