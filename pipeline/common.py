"""파이프라인 공통: 경로, 캐시된 HTTP, GPlates Web Service 호출."""
import hashlib
import json
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
MANUAL = Path(__file__).resolve().parent / "manual"
WEB_DATA = ROOT / "web" / "public" / "data"

GPLATES = "https://gws.gplates.org"
MODEL = "MERDITH2021"  # CC-BY 4.0, 0–1000 Ma

# 시대 id → 복원 기준 연대(Ma). 빙하기(0.02 Ma)는 판 이동이 무시할 수준이라 0으로 둔다.
ERA_TIMES = {"paleozoic": 480, "cretaceous": 100, "ice_age": 0}


def cached_get(url, params=None, *, method="GET", data=None, json_body=None, timeout=180):
    """같은 요청은 data/raw/http_cache 에 저장해 재사용한다 (외부 API를 반복 호출하지 않기 위해)."""
    RAW.mkdir(parents=True, exist_ok=True)
    key_src = json.dumps([method, url, params, data, json_body], sort_keys=True, ensure_ascii=False)
    key = hashlib.sha1(key_src.encode()).hexdigest()[:16]
    path = RAW / "http_cache" / f"{key}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    path.parent.mkdir(parents=True, exist_ok=True)
    if method == "GET":
        r = requests.get(url, params=params, timeout=timeout)
    else:
        r = requests.post(url, params=params, data=data, json=json_body, timeout=timeout)
    r.raise_for_status()
    body = r.json()
    path.write_text(json.dumps(body, ensure_ascii=False), encoding="utf-8")
    return body


def reconstruct_points(points, time):
    """[(lng, lat), ...] → 같은 순서의 [(lng, lat), ...] (time Ma 기준 과거 좌표)."""
    if time == 0 or not points:
        return list(points)
    out = []
    for i in range(0, len(points), 200):
        chunk = points[i : i + 200]
        body = cached_get(
            f"{GPLATES}/reconstruct/reconstruct_points/",
            {"points": ",".join(f"{lng:.4f},{lat:.4f}" for lng, lat in chunk), "time": time, "model": MODEL},
        )
        coords = body["coordinates"]
        if len(coords) != len(chunk):
            raise RuntimeError(f"GPlates returned {len(coords)} points for {len(chunk)}")
        out.extend((round(c[0], 3), round(c[1], 3)) for c in coords)
    return out


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
