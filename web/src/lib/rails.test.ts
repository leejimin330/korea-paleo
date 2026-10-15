import { describe, expect, it } from "vitest";
import type { Fossil, TreeNode } from "../types";
import { buildRails, xPct } from "./rails";
import { indexTree } from "./tree";

const n = (id: string, time: number, children: TreeNode[] = [], extra: Partial<TreeNode> = {}): TreeNode => ({
  id, name: id, name_ko: id.toUpperCase(), kind: "clade", time_ma: time, extinct_ma: null, uncertain: false, note: null, ott_id: null, children, ...extra,
});
const modern = (id: string) => n(id, 0, [], { kind: "modern" });

const tree = n("animalia", 600, [
  n("arthropoda", 540, [n("trilobita", 521, [], { extinct_ma: 252 })]),
  n("vertebrata", 520, [
    n("sauropsida", 320, [
      n("plesiosauria", 203, [], { extinct_ma: 66, uncertain: true }),
      n("dinosauria", 235, [
        n("sauropoda", 200, [], { extinct_ma: 66 }),
        n("theropoda", 231, [n("dromaeosauridae", 167, [], { extinct_ma: 66 }), n("aves", 150, [modern("magpie")])]),
      ]),
    ]),
  ]),
]);
const idx = indexTree(tree);
const fossil = (id: string, node: string, age: [number, number], era = "cretaceous") =>
  ({ id, name_ko: id, tree_node_id: node, era_id: era, age_range_ma: age, marker_type: "korea" } as Fossil);

describe("xPct", () => {
  it("maps 541 Ma to 0 and today to 100, clamping older ages", () => {
    expect(xPct(541)).toBe(0);
    expect(xPct(0)).toBe(100);
    expect(xPct(600)).toBe(0);
  });
});

describe("buildRails", () => {
  const rails = buildRails(idx, [fossil("goseong", "theropoda", [113, 100]), fossil("eggs", "dinosauria", [90, 70]), fossil("trilo", "trilobita", [500, 480], "paleozoic")], "cretaceous");
  const lane = (id: string) => rails.flatMap((g) => g.lanes).find((l) => l.id === id)!;

  it("groups leaves in display order and puts birds apart from non-avian theropods", () => {
    expect(rails.map((g) => g.id)).toEqual(["invertebrates", "reptiles", "dinosaurs", "birds"]);
    expect(rails.find((g) => g.id === "dinosaurs")!.lanes.map((l) => l.id)).toEqual(["sauropoda", "dromaeosauridae"]);
    expect(rails.find((g) => g.id === "birds")!.lanes.map((l) => l.id)).toEqual(["magpie"]);
  });

  it("modern lanes thicken from their parent clade; extinct lanes from themselves", () => {
    expect(lane("magpie")).toMatchObject({ thinFromMa: 231, thickFromMa: 150, endMa: 0, extinct: false, clade: "THEROPODA › AVES" });
    expect(lane("sauropoda")).toMatchObject({ thinFromMa: 235, thickFromMa: 200, endMa: 66, extinct: true });
    expect(lane("trilobita")).toMatchObject({ thinFromMa: 540, thickFromMa: 521, endMa: 252 });
  });

  it("marks only uncertain clade leaves as dashed", () => {
    expect(lane("plesiosauria").dashed).toBe(true);
    expect(lane("magpie").dashed).toBe(false);
  });

  it("places this era's fossils on lanes under the fossil's node, not above the group anchor", () => {
    expect(lane("magpie").dots.map((d) => d.fossilIds)).toEqual([["goseong"]]);
    expect(lane("sauropoda").dots.map((d) => d.fossilIds)).toEqual([["eggs"]]);
    expect(lane("dromaeosauridae").dots.flatMap((d) => d.fossilIds).sort()).toEqual(["eggs", "goseong"]);
    expect(lane("trilobita").dots).toEqual([]); // 다른 시대
  });

  it("skips East Asian reference fossils and merges nearby dots", () => {
    const ref = { ...fossil("futaba", "theropoda", [86, 84]), marker_type: "east_asia_reference" } as Fossil;
    const near = [fossil("a", "aves", [110, 108]), fossil("b", "aves", [109, 107]), ref];
    const l = buildRails(idx, near, "cretaceous").flatMap((g) => g.lanes).find((x) => x.id === "magpie")!;
    expect(l.dots).toHaveLength(1);
    expect(l.dots[0].fossilIds).toEqual(["a", "b"]);
  });
});
