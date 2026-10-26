import type { Species } from "../types";

export type Region = "all" | "korea" | "nearby";
export type CatalogFilter = { region: Region; group: string | null };

export const COUNTRY_KO: Record<string, string> = { KR: "한반도", CN: "중국", JP: "일본", RU: "러시아", MN: "몽골" };

/** 그 시대 도감: 한반도 먼저, 그다음 무리(척추동물 쪽이 앞), 이름 순. */
const GROUP_ORDER = [
  "theropod", "sauropod", "ornithopod", "ceratopsian", "dinosaur", "bird", "pterosaur", "marine_reptile", "reptile",
  "mammal", "amphibian", "fish", "insect", "mollusk", "invertebrate",
];

export function eraSpecies(all: Species[], eraId: string): Species[] {
  const rank = (g: string) => (GROUP_ORDER.indexOf(g) + 1 || GROUP_ORDER.length + 1);
  return all
    .filter((s) => s.era_id === eraId)
    .sort(
      (a, b) =>
        Number(a.region !== "korea") - Number(b.region !== "korea") ||
        rank(a.taxon_group) - rank(b.taxon_group) ||
        a.name_ko.localeCompare(b.name_ko, "ko"),
    );
}

export function filterSpecies(list: Species[], f: CatalogFilter): Species[] {
  return list.filter((s) => (f.region === "all" || s.region === f.region) && (!f.group || s.taxon_group === f.group));
}

/** 무리별 개수 (필터 칩에 쓴다), 많은 순. */
export function groupCounts(list: Species[]): [string, number][] {
  const m = new Map<string, number>();
  for (const s of list) m.set(s.taxon_group, (m.get(s.taxon_group) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** "일본·중국" 같은 산출 나라 표기. 수작업 항목은 나라 목록이 없으니 지명을 쓴다. */
export function whereLabel(s: Species): string {
  if (s.region === "korea") return "한반도";
  const c = s.countries.filter((x) => x !== "KR").map((x) => COUNTRY_KO[x] ?? x);
  return c.length ? c.join("·") : s.location.name;
}
