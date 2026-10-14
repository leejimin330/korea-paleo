import { describe, expect, it } from "vitest";
import type { Fossil } from "../types";
import { coordFor, formatAgoKo, formatMa, visibleFossils } from "./markers";

const f = (id: string, era: string, group: string, marker: Fossil["marker_type"] = "korea"): Fossil =>
  ({
    id, era_id: era, taxon_group: group, marker_type: marker,
    location: { name: "", modern: { lat: 35, lng: 128 }, paleo: { lat: 43, lng: 140 } },
  } as Fossil);

const all = [f("a", "cretaceous", "theropod"), f("b", "cretaceous", "sauropod"), f("c", "cretaceous", "marine_reptile", "east_asia_reference"), f("d", "paleozoic", "invertebrate")];

describe("visibleFossils", () => {
  it("filters by era; empty groups means all", () => {
    expect(visibleFossils(all, "cretaceous", { groups: [], showReference: true }).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("filters by group and hides reference layer", () => {
    expect(visibleFossils(all, "cretaceous", { groups: ["theropod", "marine_reptile"], showReference: false }).map((x) => x.id)).toEqual(["a"]);
  });
});

describe("coordFor", () => {
  it("uses paleo coords only in paleo mode", () => {
    expect(coordFor(all[0], "paleo")).toEqual({ lat: 43, lng: 140 });
    expect(coordFor(all[0], "modern")).toEqual({ lat: 35, lng: 128 });
    expect(coordFor(all[0], "overlay")).toEqual({ lat: 35, lng: 128 });
  });
});

describe("formatting", () => {
  it("formats ages", () => {
    expect(formatAgoKo(100)).toBe("약 1억 년 전");
    expect(formatAgoKo(480)).toBe("약 4.8억 년 전");
    expect(formatAgoKo(0.02)).toBe("약 2만 년 전");
    expect(formatMa(100)).toBe("100 Ma");
    expect(formatMa(0.02)).toBe("20 ka");
  });
});
