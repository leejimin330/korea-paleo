"""[5] 해수면 슬라이더용 수심 그리드: NOAA ETOPO1(ERDDAP)에서 한반도 주변을 잘라 0.05° 격자로 저장."""
from common import PROCESSED, cached_get, write_json

ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.json"
BBOX = (117, 30, 135, 43)  # west, south, east, north
STRIDE = 3  # 1 arc-min × 3 = 0.05°
FLOOR = -200  # 슬라이더 범위(-130m)보다 깊은 곳은 구분할 필요가 없다
CEIL = 1  # 육지는 '0보다 높음'만 알면 된다


def build_grid(rows, bbox=BBOX, res=0.05):
    """ERDDAP 행([lat, lng, alt]) → 북→남, 서→동 순서의 1차원 고도 배열."""
    west, south, east, north = bbox
    width = round((east - west) / res) + 1
    height = round((north - south) / res) + 1
    data = [FLOOR] * (width * height)
    for lat, lng, alt in rows:
        x = round((lng - west) / res)
        y = round((north - lat) / res)
        if 0 <= x < width and 0 <= y < height and alt is not None:
            data[y * width + x] = max(FLOOR, min(CEIL, int(alt)))
    return {"bbox": list(bbox), "resolution_deg": res, "width": width, "height": height,
            "order": "north-to-south rows, west-to-east", "floor_m": FLOOR, "data": data}


def main():
    w, s, e, n = BBOX
    query = f"altitude[({s}):{STRIDE}:({n})][({w}):{STRIDE}:({e})]"
    body = cached_get(f"{ERDDAP}?{query.replace('[', '%5B').replace(']', '%5D')}")
    grid = build_grid(body["table"]["rows"])
    write_json(PROCESSED / "bathymetry.json", grid)
    land = sum(1 for v in grid["data"] if v > 0)
    print(f"bathymetry {grid['width']}x{grid['height']}, land cells {land}")


if __name__ == "__main__":
    main()
