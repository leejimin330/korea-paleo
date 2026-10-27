import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from build_fossils import aggregate_pbdb, era_of, pbdb_count_near  # noqa: E402
from build_tree import build_tree, modern_species, read_rows  # noqa: E402
from common import MANUAL  # noqa: E402
from fetch_paleogeo import round_coords, simplify_fc  # noqa: E402


def test_era_of():
    assert era_of(113, 100.5) == "cretaceous"
    assert era_of(150, 100) is None  # 쥐라기에 걸침
    assert era_of(497, 485.4) == "paleozoic"
    assert era_of(0.126, 0.0117) == "ice_age"
    assert era_of(298.9, 293.5) == "late_paleozoic"
    assert era_of(15.97, 13.82) == "miocene"


def test_aggregate_pbdb_groups_by_rounded_coords_and_era():
    recs = [
        {"lat": "34.9281", "lng": "128.0711", "max_ma": "113", "min_ma": "100.5", "identified_name": "Theropoda indet.", "class": "Reptilia"},
        {"lat": "34.9279", "lng": "128.0722", "max_ma": "113", "min_ma": "100.5", "identified_name": "Sauropoda indet.", "class": "Saurischia"},
        {"lat": "37.0", "lng": "128.0", "max_ma": "400", "min_ma": "390"},  # 대상 시대 아님 (데본기)
        {"lat": None, "lng": "1", "max_ma": "100", "min_ma": "90"},
    ]
    pts = aggregate_pbdb(recs)
    assert len(pts) == 1
    assert pts[0]["n"] == 2 and pts[0]["era_id"] == "cretaceous"
    assert set(pts[0]["taxa"]) == {"Theropoda indet.", "Sauropoda indet."}


def test_pbdb_count_near_respects_radius_and_era():
    pts = [
        {"era_id": "cretaceous", "modern": {"lat": 34.95, "lng": 128.29}, "n": 5},
        {"era_id": "cretaceous", "modern": {"lat": 36.0, "lng": 128.29}, "n": 7},
        {"era_id": "paleozoic", "modern": {"lat": 34.95, "lng": 128.29}, "n": 9},
    ]
    site = {"era_id": "cretaceous", "location": {"modern": {"lat": 34.96, "lng": 128.3}}}
    assert pbdb_count_near(site, pts) == 5


def test_simplify_drops_tiny_polygons_and_rounds():
    big = {"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]}
    tiny = {"type": "Polygon", "coordinates": [[[5, 5], [5.1, 5], [5.1, 5.1], [5, 5]]]}
    fc = simplify_fc({"features": [{"geometry": big}, {"geometry": tiny}, {"geometry": None}]})
    assert len(fc["features"]) == 1
    assert round_coords([[1.23456, 2.0]], 2) == [[1.23, 2.0]]


def row(id, parent, time, kind="clade", extinct=""):
    return {"id": id, "parent": parent, "name": id.title(), "name_ko": id, "kind": kind,
            "time_ma": str(time), "extinct_ma": extinct, "uncertain": "0", "note": ""}


def test_build_tree_nests_and_validates():
    tree = build_tree([row("a", "", 100), row("b", "a", 50), row("c", "b", 0, "modern")], {"B": 123})
    assert tree["children"][0]["id"] == "b" and tree["children"][0]["ott_id"] == 123
    assert tree["children"][0]["children"][0]["kind"] == "modern"
    with pytest.raises(ValueError):
        build_tree([row("a", "", 100), row("b", "x", 50)])
    with pytest.raises(ValueError):
        build_tree([row("a", "", 100), row("b", "a", 150)])


def test_real_taxa_and_sites_are_consistent():
    """수작업 데이터 무결성: 모든 화석이 존재하는 계통수 노드를 가리키고 출처가 있다."""
    rows = read_rows(MANUAL / "taxa.csv")
    build_tree(rows)
    ids = {r["id"] for r in rows}
    sites = json.loads((MANUAL / "korea_fossil_sites.json").read_text(encoding="utf-8"))
    eras = {e["id"] for e in json.loads((MANUAL / "eras.json").read_text(encoding="utf-8"))}
    assert len({s["id"] for s in sites}) == len(sites)
    for s in sites:
        assert s["tree_node_id"] in ids, s["id"]
        assert s["era_id"] in eras, s["id"]
        assert s["sources"], s["id"]
    assert sum(1 for s in sites if s["era_id"] == "cretaceous" and s["marker_type"] == "korea") >= 10
    groups = {m["id"]: m["group"] for m in modern_species(rows)}
    assert groups["pica-serica"] == "bird" and groups["hydropotes-inermis"] == "mammal"


def test_quotas_spread_slots_and_respect_cap_and_supply():
    from build_species import quotas

    counts = {"big": 200, "mid": 20, "small": 2}
    q = quotas(counts, {n: c ** 0.4 for n, c in counts.items()}, 12, cap=6)
    assert sum(q.values()) == 12
    assert q["big"] <= 6 and q["small"] <= 2 and q["mid"] >= 1
    # 후보가 모자라면 있는 만큼만 고른다.
    assert sum(quotas({"a": 1, "b": 2}, {"a": 1, "b": 1}, 10).values()) == 3


def test_location_name_uses_one_record_for_country_and_state():
    from build_species import location_name

    assert location_name({"cc": "JP", "state": "Hokkaido "}, "nearby") == "일본 홋카이도"
    assert location_name({"cc": "CN", "state": "Unknown"}, "nearby") == "중국"
    assert location_name(None, "korea") == "한반도"


def test_built_species_link_to_markers_and_have_names():
    """빌드 결과 무결성: 시대마다 40종 이상, 모든 항목이 존재하는 마커·노드를 가리킨다."""
    from common import WEB_DATA

    species = json.loads((WEB_DATA / "species.json").read_text(encoding="utf-8"))
    fossils = {f["id"]: f for f in json.loads((WEB_DATA / "fossils.json").read_text(encoding="utf-8"))}
    ids = {r["id"] for r in read_rows(MANUAL / "taxa.csv")}
    assert len({s["id"] for s in species}) == len(species)
    for era in ("paleozoic", "late_paleozoic", "cretaceous", "miocene", "ice_age"):
        assert sum(s["era_id"] == era for s in species) >= 40, era
    for s in species:
        assert s["fossil_id"] in fossils, s["id"]
        assert fossils[s["fossil_id"]]["era_id"] == s["era_id"], s["id"]
        assert s["tree_node_id"] in ids, s["id"]
        assert s["name_ko"] and s["name_ko"] != "?", s["id"]
        assert s["region"] in ("korea", "nearby")


def test_image_license_filter_and_html_strip():
    from fetch_images import LICENSE_OK, strip_html

    for ok in ("CC BY-SA 4.0", "CC BY 2.0", "CC0", "Public domain"):
        assert LICENSE_OK.match(ok), ok
    for bad in ("Fair use", "All rights reserved", ""):
        assert not LICENSE_OK.match(bad), bad
    assert strip_html('<a href="x">Kim  &amp; Lee</a>') == "Kim & Lee"


def test_classify_continent_groups():
    from fetch_paleogeo import classify

    assert classify(601, "Asia", "KOR") == "north_china"
    assert classify(6023, "Asia", "CHN") == "south_china"
    assert classify(629, "Asia", "JPN") == "japan"
    assert classify(101, "North America", "USA") == "north_america"
    assert classify(503, "Asia", "SAU") == "africa"
    # 판 번호를 모르면 대륙으로: 러시아 극동은 아시아로 본다.
    assert classify(454, "Europe", "RUS", 135) == "other_asia"
    assert classify(99999, "Europe", "FRA", 2) == "europe"


def test_not_a_photo_filter():
    from fetch_images import NOT_A_PHOTO

    assert NOT_A_PHOTO.search("Carnivora_Distribution.png")
    assert NOT_A_PHOTO.search("Bufo_range_map.svg")
    assert not NOT_A_PHOTO.search("Mammoth_Cave_Cladodus_tooth.jpg")
    assert not NOT_A_PHOTO.search("Plateumaris_species.jpg")
