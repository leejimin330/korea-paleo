"""전체 파이프라인 실행 후 web/public/data 로 복사."""
import json
import shutil

import build_bathymetry
import build_fossils
import build_tree
import fetch_images
import fetch_paleogeo
from common import MANUAL, PROCESSED, WEB_DATA, write_json


def main():
    fetch_paleogeo.main()
    build_fossils.main()
    build_tree.main()
    build_bathymetry.main()
    fetch_images.main()
    write_json(PROCESSED / "eras.json", json.loads((MANUAL / "eras.json").read_text(encoding="utf-8")))
    shutil.copy(MANUAL / "environments.geojson", PROCESSED / "environments.geojson")
    if WEB_DATA.exists():
        shutil.rmtree(WEB_DATA)
    shutil.copytree(PROCESSED, WEB_DATA)
    print("copied to", WEB_DATA)


if __name__ == "__main__":
    main()
