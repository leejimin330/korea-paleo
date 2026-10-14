"""[2] PBDB 화석 기록 수집 (cc=KR) → data/raw/pbdb_kr.json"""
from common import RAW, cached_get, write_json

PBDB_URL = "https://paleobiodb.org/data1.2/occs/list.json"


def fetch(cc="KR"):
    body = cached_get(PBDB_URL, {"cc": cc, "show": "coords,class,loc", "vocab": "pbdb"})
    write_json(RAW / f"pbdb_{cc.lower()}.json", body)
    return body["records"]


if __name__ == "__main__":
    print(len(fetch()), "records")
