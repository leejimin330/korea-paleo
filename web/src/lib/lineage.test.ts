import { describe, expect, it } from "vitest";
import type { Era, ImageInfo, Species, TreeNode } from "../types";
import { buildLineage, imageFor } from "./lineage";
import { xPct } from "./periods";
import { indexTree } from "./tree";

const n = (id: string, time: number, children: TreeNode[] = [], extra: Partial<TreeNode> = {}): TreeNode => ({
  id, name: id, name_ko: id.toUpperCase(), kind: "clade", time_ma: time, extinct_ma: null, uncertain: false, note: null, ott_id: null, children, ...extra,
});
const modern = (id: string) => n(id, 0, [], { kind: "modern" });

const tree = n("animalia", 600, [
  n("arthropoda", 540, [n("trilobita", 521, [], { extinct_ma: 252 })]),
  n("vertebrata", 520, [
    n("conodonta", 500, [], { extinct_ma: 200 }),
    n("dinosauria", 235, [
      n("sauropoda", 200, [], { extinct_ma: 66 }),
      n("theropoda", 231, [n("aves", 150, [modern("magpie")])]),
    ]),
  ]),
]);
const idx = indexTree(tree);
const era = (id: string, age: number) => ({ id, name: id, age_ma: age } as Era);
const sp = (id: string, era_id: string, node: string, over: Partial<Species> = {}) =>
  ({ id, era_id, tree_node_id: node, region: "korea", scientific_name: id, ...over } as Species);

const eras = [era("paleozoic", 480), era("cretaceous", 100), era("ice_age", 0.02)];
const species = [
  sp("trilo", "paleozoic", "trilobita"),
  sp("cono", "paleozoic", "conodonta"),
  sp("sauro", "cretaceous", "sauropoda"),
  sp("raptor", "cretaceous", "theropoda"),
  sp("bird", "ice_age", "aves"),
];

describe("buildLineage", () => {
  const items = buildLineage(idx, species, eras, "theropoda", "raptor");

  it("orders clades and eras oldest first and ends with living relatives", () => {
    expect(items.map((i) => (i.kind === "clade" ? i.node.id : i.kind === "era" ? `era:${i.era.id}` : "today"))).toEqual([
      "animalia", "vertebrata", "era:paleozoic", "dinosauria", "theropoda", "era:cretaceous", "era:ice_age", "today",
    ]);
    const today = items[items.length - 1];
    expect(today.kind === "today" && today.modern.map((m) => m.id)).toEqual(["magpie"]);
  });

  it("picks only the closest relatives per era, never animal-kingdom-only kin", () => {
    const get = (id: string) => items.find((i) => i.kind === "era" && i.era.id === id) as Extract<(typeof items)[number], { kind: "era" }>;
    expect(get("paleozoic").relatives.map((r) => r.species.id)).toEqual(["cono"]);
    expect(get("paleozoic").shared).toBe("vertebrata");
    expect(get("cretaceous").relatives.map((r) => r.species.id)).toEqual(["raptor"]);
    expect(get("cretaceous").here).toBe(true);
    expect(get("ice_age").shared).toBe("theropoda");

    const trilo = buildLineage(idx, species, eras, "trilobita", null);
    const ice = trilo.find((i) => i.kind === "era" && i.era.id === "ice_age");
    expect(ice?.kind === "era" && ice.relatives).toEqual([]);
  });
});

describe("imageFor", () => {
  const img = (t: string) => ({ thumb: t } as ImageInfo);
  it("prefers the genus image and falls back to the nearest clade", () => {
    const images = { Raptorex: img("g"), dinosauria: img("d") };
    expect(imageFor(images, idx, "Raptorex sp.", "theropoda")).toEqual({ image: img("g"), fallback: null });
    expect(imageFor(images, idx, null, "sauropoda")?.fallback?.id).toBe("dinosauria");
    expect(imageFor({}, idx, null, "sauropoda")).toBeNull();
  });
});

describe("xPct", () => {
  it("maps 541 Ma to 0 and today to 100, clamping older ages", () => {
    expect(xPct(541)).toBe(0);
    expect(xPct(0)).toBe(100);
    expect(xPct(600)).toBe(0);
  });
});
