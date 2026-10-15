import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from build_fossils import era_of  # noqa: E402
from build_tree import read_rows  # noqa: E402
from common import MANUAL  # noqa: E402
from pbdb_taxa import auto_markers, featured_markers, group_for, load_map, map_taxon, nearest_place  # noqa: E402

RULES = {"family": {"Grallatoridae": "theropoda", "Caseidae": None}, "order": {"Pterosauria": "pterosauria"},
         "class": {"Insecta": "insecta", "Reptilia": None}, "phylum": {"Brachiopoda": "brachiopoda"}}
PLACES = [{"name": "진주", "lat": 35.18, "lng": 128.11}, {"name": "영월", "lat": 37.18, "lng": 128.46}]
ROWS = [
    {"id": "animalia", "parent": "", "name_ko": "동물"},
    {"id": "insecta", "parent": "animalia", "name_ko": "곤충"},
    {"id": "brachiopoda", "parent": "animalia", "name_ko": "완족동물"},
    {"id": "theropoda", "parent": "animalia", "name_ko": "수각류"},
]


def rec(name, cls="Insecta", lat=35.17, lng=128.1, max_ma=113, min_ma=106, rank="species", **kw):
    return {"accepted_name": name, "accepted_rank": rank, "accepted_no": "1", "class": cls,
            "lat": str(lat), "lng": str(lng), "max_ma": max_ma, "min_ma": min_ma, **kw}


def test_map_taxon_prefers_family_and_honours_null_exclusions():
    assert map_taxon({"family": "Grallatoridae", "class": "Reptilia"}, RULES) == "theropoda"
    assert map_taxon({"family": "Other", "class": "Reptilia"}, RULES) is None
    assert map_taxon({"order": "Pterosauria", "class": "Reptilia"}, RULES) == "pterosauria"
    assert map_taxon({"phylum": "Brachiopoda", "class": "Rhynchonellata"}, RULES) == "brachiopoda"
    assert map_taxon({"class": "Mystery"}, RULES) is None


def test_nearest_place_within_limit():
    assert nearest_place({"lat": 35.2, "lng": 128.1}, PLACES) == "진주"
    assert nearest_place({"lat": 33.0, "lng": 124.0}, PLACES) is None


def test_group_for_uses_first_matching_ancestor():
    assert group_for("aves", ["aves", "theropoda", "dinosauria"]) == "bird"
    assert group_for("insecta", ["insecta", "arthropoda", "animalia"]) == "insect"
    assert group_for("bivalvia", ["bivalvia", "mollusca", "animalia"]) == "mollusk"


def test_auto_markers_cluster_by_era_node_place_and_attach_to_manual_sites():
    records = [
        rec("Juramantis jinjuensis"), rec("Juramantis jinjuensis"), rec("Korehelorus jinjuensis"),
        rec("Blattula", rank="genus"),
        rec("Insecta indet.", rank="class"),  # 이름 없는 기록 제외
        rec("Lingulella", cls="Lingulata", phylum="Brachiopoda", lat=37.18, lng=128.46, max_ma=490, min_ma=485),
        rec("Batrachopus", cls="Reptilia"),  # null 규칙 → 제외 건수
        rec("Grallator", cls="Reptilia", family="Grallatoridae"),
    ]
    manual = [{"id": "jinju-theropod", "era_id": "cretaceous", "tree_node_id": "theropoda",
               "location": {"modern": {"lat": 35.16, "lng": 128.1}}}]
    markers, attach, skipped = auto_markers(records, era_of, RULES, PLACES, ROWS, manual)

    assert skipped == 1
    assert {m["id"] for m in markers} == {"pbdb-cretaceous-insecta-진주", "pbdb-paleozoic-brachiopoda-영월"}
    insects = next(m for m in markers if m["tree_node_id"] == "insecta")
    assert insects["name_ko"] == "진주 일대 곤충 화석"
    assert insects["taxa"][0] == {"name": "Juramantis jinjuensis", "rank": "species", "pbdb_no": "1", "n": 2}
    assert len(insects["taxa"]) == 3 and insects["badges"] == ["auto_pbdb"]
    assert insects["age_range_ma"] == [113.0, 106.0]
    assert attach == {"jinju-theropod": [{"name": "Grallator", "rank": "species", "pbdb_no": "1", "n": 1}]}


def test_auto_markers_reject_unknown_nodes():
    with pytest.raises(ValueError):
        auto_markers([rec("X")], era_of, {"class": {"Insecta": "nope"}}, PLACES, ROWS, [])


def test_featured_requires_known_taxon():
    with pytest.raises(ValueError):
        featured_markers([rec("A")], era_of, RULES, PLACES, ROWS, [{"pbdb_name": "B"}])


def test_real_map_and_featured_point_to_existing_nodes():
    ids = {r["id"] for r in read_rows(MANUAL / "taxa.csv")}
    rules = load_map()
    for level in ("family", "order", "class", "phylum"):
        for node in rules[level].values():
            assert node is None or node in ids, node
    featured = json.loads((MANUAL / "featured_taxa.json").read_text(encoding="utf-8"))
    assert len({f["id"] for f in featured}) == len(featured)
    assert all(f["sources"] and f["description"] for f in featured)
