import type { Badge, Fossil, LngLat, MapMode } from "../types";

export type MarkerFilter = { groups: string[]; showReference: boolean };

export const GROUPS: Record<string, { label: string; color: string }> = {
  theropod: { label: "수각류", color: "#F06A3A" },
  sauropod: { label: "용각류", color: "#5BB06A" },
  ornithopod: { label: "조각류", color: "#9CC24A" },
  ceratopsian: { label: "각룡류", color: "#C99A3A" },
  dinosaur: { label: "공룡(미분류)", color: "#E0507A" },
  bird: { label: "조류", color: "#4F9BEA" },
  pterosaur: { label: "익룡", color: "#A07CF0" },
  marine_reptile: { label: "해양 파충류", color: "#3FB0B0" },
  fish: { label: "어류", color: "#6B7CF0" },
  invertebrate: { label: "무척추동물", color: "#C26AE0" },
  mammal: { label: "포유류", color: "#A9785E" },
  reptile: { label: "기타 파충류", color: "#7A8F3A" },
  insect: { label: "곤충·거미", color: "#2E7D9A" },
  mollusk: { label: "연체동물", color: "#E07FA8" },
  amphibian: { label: "양서류", color: "#5E9F8A" },
};

export const BADGES: Record<Badge, { label: string; hint: string }> = {
  not_dinosaur: { label: "공룡 아님", hint: "익룡·수장룡·어룡·모사사우루스는 공룡과 다른 계통이에요." },
  species_unidentified: { label: "종 특정 불가", hint: "발자국·알·조각 화석은 종을 정할 수 없어 그룹 단위로 연결했어요." },
  east_asia_reference: { label: "주변 지역", hint: "한반도 밖(중국·일본·러시아 극동)에서 나온 같은 시대 화석이에요. 한반도에서는 아직 나오지 않았어요." },
  trace_fossil: { label: "흔적 화석", hint: "몸이 아니라 발자국 같은 활동 흔적이에요." },
  disputed: { label: "논쟁 중", hint: "분류 위치에 대해 학계 의견이 갈려요." },
  auto_pbdb: { label: "자동 수집", hint: "PBDB 산출 기록에서 자동으로 만든 항목이에요. 설명도 자동으로 만들어요." },
};

export const FOSSIL_TYPES: Record<Fossil["fossil_type"], string> = {
  trackway: "발자국",
  egg: "알",
  skeleton: "골격",
  tooth: "이빨·미화석",
  record: "산출 기록 묶음",
};

export function visibleFossils(fossils: Fossil[], eraId: string, filter: MarkerFilter): Fossil[] {
  return fossils.filter(
    (f) =>
      f.era_id === eraId &&
      (filter.groups.length === 0 || filter.groups.includes(f.taxon_group)) &&
      (filter.showReference || f.marker_type === "korea"),
  );
}

/** 과거 지도에서는 판 복원 좌표, 현재 지도 계열에서는 실제 발견지 좌표. */
export function coordFor(f: { location: { modern: LngLat; paleo: LngLat } }, mode: MapMode): LngLat {
  return mode === "paleo" ? f.location.paleo : f.location.modern;
}

export function formatMa(ma: number): string {
  return ma >= 1 ? `${Math.round(ma)} Ma` : `${Math.round(ma * 1000)} ka`;
}

/** 한국어 연대 표기: 100 → "약 1억 년 전", 0.02 → "약 2만 년 전". */
export function formatAgoKo(ma: number): string {
  const years = ma * 1_000_000;
  if (years >= 100_000_000) {
    const eok = years / 100_000_000;
    return `약 ${Number.isInteger(eok) ? eok : eok.toFixed(1)}억 년 전`;
  }
  if (years >= 10_000) return `약 ${Math.round(years / 10_000).toLocaleString()}만 년 전`;
  return `약 ${Math.round(years).toLocaleString()}년 전`;
}
