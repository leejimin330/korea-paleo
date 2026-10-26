import { describe, expect, it } from "vitest";
import type { Species } from "../types";
import { eraSpecies, filterSpecies, groupCounts, whereLabel } from "./catalog";

const sp = (id: string, over: Partial<Species> = {}): Species => ({
  id, era_id: "cretaceous", name_ko: id, scientific_name: null, rank: null, pbdb_no: null, tree_node_id: "x",
  taxon_group: "mollusk", region: "korea", countries: [], n_records: null, age_range_ma: [100, 90],
  location: { name: "한반도", modern: { lat: 0, lng: 0 } }, description: "", source: "pbdb", fossil_id: id, ...over,
});

describe("catalog", () => {
  const list = [
    sp("나", { region: "nearby", taxon_group: "theropod", countries: ["CN", "JP"] }),
    sp("다", { taxon_group: "mollusk" }),
    sp("가", { taxon_group: "theropod" }),
    sp("라", { era_id: "miocene" }),
  ];

  it("keeps one era and puts korea first, then vertebrate groups", () => {
    expect(eraSpecies(list, "cretaceous").map((s) => s.id)).toEqual(["가", "다", "나"]);
  });

  it("filters by region and group", () => {
    const era = eraSpecies(list, "cretaceous");
    expect(filterSpecies(era, { region: "nearby", group: null }).map((s) => s.id)).toEqual(["나"]);
    expect(filterSpecies(era, { region: "all", group: "theropod" }).map((s) => s.id)).toEqual(["가", "나"]);
    expect(groupCounts(era)).toEqual([["theropod", 2], ["mollusk", 1]]);
  });

  it("labels where a species was found", () => {
    expect(whereLabel(list[0])).toBe("중국·일본");
    expect(whereLabel(list[1])).toBe("한반도");
    expect(whereLabel(sp("x", { region: "nearby", location: { name: "일본 후쿠시마현", modern: { lat: 0, lng: 0 } } }))).toBe("일본 후쿠시마현");
  });
});
