import { describe, expect, it } from "vitest";
import type { Fossil, TreeNode } from "../types";
import { ancestorsOf, indexTree, nearestFossilFor, pathToToday } from "./tree";

const n = (id: string, children: TreeNode[] = [], kind: TreeNode["kind"] = "clade"): TreeNode => ({
  id, name: id, name_ko: id, kind, time_ma: 0, extinct_ma: null, uncertain: false, note: null, ott_id: null, children,
});

// root ─ dino ─┬ sauropoda (멸종)
//              └ theropoda ─┬ dromaeo (멸종)
//                           └ aves ─┬ magpie
//                                   └ crane
//      └ mammalia ─ deer
//      └ trilobita (멸종, 현생 자손 없음)
const tree = n("root", [
  n("dino", [n("sauropoda"), n("theropoda", [n("dromaeo"), n("aves", [n("magpie", [], "modern"), n("crane", [], "modern")])])]),
  n("mammalia", [n("deer", [], "modern")]),
  n("trilobita"),
]);
const idx = indexTree(tree);

const fossil = (id: string, node: string, era = "cretaceous"): Fossil =>
  ({ id, tree_node_id: node, era_id: era } as Fossil);

describe("ancestorsOf", () => {
  it("returns node to root", () => {
    expect(ancestorsOf(idx, "aves")).toEqual(["aves", "theropoda", "dino", "root"]);
  });
  it("returns [] for unknown", () => {
    expect(ancestorsOf(idx, "nope")).toEqual([]);
  });
});

describe("pathToToday", () => {
  it("goes straight down when the node itself has living descendants", () => {
    const p = pathToToday(idx, "theropoda")!;
    expect(p.pivot).toBe("theropoda");
    expect(p.modern).toEqual(["magpie", "crane"]);
    expect(new Set(p.nodes)).toEqual(new Set(["theropoda", "aves", "magpie", "crane"]));
  });
  it("climbs to the nearest ancestor with living descendants for extinct groups", () => {
    const p = pathToToday(idx, "sauropoda")!;
    expect(p.pivot).toBe("dino");
    expect(p.nodes).toContain("sauropoda");
    expect(p.nodes).toContain("dino");
    expect(p.modern).toEqual(["magpie", "crane"]);
    expect(p.nodes).not.toContain("dromaeo");
  });
  it("climbs to root when needed", () => {
    const p = pathToToday(idx, "trilobita")!;
    expect(p.pivot).toBe("root");
    expect(p.modern).toEqual(["magpie", "crane", "deer"]);
  });
  it("returns null for unknown node", () => {
    expect(pathToToday(idx, "nope")).toBeNull();
  });
});

describe("nearestFossilFor", () => {
  const fossils = [fossil("goseong", "theropoda"), fossil("eggs", "dino"), fossil("trilo", "trilobita", "paleozoic"), fossil("bear", "mammalia", "ice_age")];
  it("finds the fossil under the closest ancestor", () => {
    const r = nearestFossilFor(idx, fossils, "magpie")!;
    expect(r.fossil.id).toBe("goseong");
    expect(r.sharedAncestor).toBe("theropoda");
  });
  it("matches a fossil whose node is itself an ancestor", () => {
    expect(nearestFossilFor(idx, fossils, "deer")!.fossil.id).toBe("bear");
  });
  it("returns null when nothing found", () => {
    expect(nearestFossilFor(idx, [], "deer")).toBeNull();
  });
});
