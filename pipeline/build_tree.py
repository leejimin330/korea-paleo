"""[4] taxa.csv → tree.json(중첩) + modern_species.json, Open Tree TNRS로 ott_id 매칭."""
import csv

from common import MANUAL, PROCESSED, cached_get, write_json

TNRS_URL = "https://api.opentreeoflife.org/v3/tnrs/match_names"

# 현생종 그룹 라벨: 가장 가까운 조상 id 기준
GROUP_BY_ANCESTOR = {
    "aves": "bird", "mammalia": "mammal", "actinopterygii": "fish", "chondrichthyes": "fish", "amphibia": "amphibian", "squamata": "reptile",
    "testudines": "reptile", "arthropoda": "invertebrate", "brachiopoda": "invertebrate",
    "mollusca": "invertebrate", "cnidaria": "invertebrate", "echinodermata": "invertebrate", "insecta": "insect", "arachnida": "insect",
}


def read_rows(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def build_tree(rows, ott_ids=None):
    ott_ids = ott_ids or {}
    nodes, roots = {}, []
    for r in rows:
        if r["id"] in nodes:
            raise ValueError(f"duplicate id {r['id']}")
        nodes[r["id"]] = {
            "id": r["id"],
            "name": r["name"],
            "name_ko": r["name_ko"],
            "kind": r["kind"],
            "time_ma": float(r["time_ma"]),
            "extinct_ma": float(r["extinct_ma"]) if r["extinct_ma"] else None,
            "uncertain": r["uncertain"] == "1",
            "note": r["note"] or None,
            "ott_id": ott_ids.get(r["name"]),
            "children": [],
        }
    for r in rows:
        node = nodes[r["id"]]
        if not r["parent"]:
            roots.append(node)
        elif r["parent"] not in nodes:
            raise ValueError(f"{r['id']}: unknown parent {r['parent']}")
        else:
            parent = nodes[r["parent"]]
            if node["time_ma"] > parent["time_ma"]:
                raise ValueError(f"{r['id']} older than parent {r['parent']}")
            parent["children"].append(node)
    if len(roots) != 1:
        raise ValueError(f"expected 1 root, got {len(roots)}")
    return roots[0]


def modern_species(rows):
    parents = {r["id"]: r["parent"] for r in rows}
    out = []
    for r in rows:
        if r["kind"] != "modern":
            continue
        group, cur = "other", r["parent"]
        while cur:
            if cur in GROUP_BY_ANCESTOR:
                group = GROUP_BY_ANCESTOR[cur]
                break
            cur = parents[cur]
        out.append({"id": r["id"], "name_ko": r["name_ko"], "scientific_name": r["name"], "tree_node_id": r["id"], "group": group})
    return out


def match_ott(names):
    try:
        body = cached_get(TNRS_URL, method="POST", json_body={"names": names, "do_approximate_matching": False})
    except Exception as e:  # 매칭 실패해도 빌드는 진행
        print("TNRS failed:", e)
        return {}
    ids = {}
    for res in body.get("results", []):
        if res.get("matches"):
            ids[res["name"]] = res["matches"][0]["taxon"]["ott_id"]
    return ids


def main():
    rows = read_rows(MANUAL / "taxa.csv")
    ott = match_ott([r["name"] for r in rows])
    missing = [r["name"] for r in rows if r["name"] not in ott]
    write_json(PROCESSED / "tree.json", build_tree(rows, ott))
    write_json(PROCESSED / "modern_species.json", modern_species(rows))
    print(f"nodes {len(rows)}, ott matched {len(ott)}, unmatched: {missing}")


if __name__ == "__main__":
    main()
