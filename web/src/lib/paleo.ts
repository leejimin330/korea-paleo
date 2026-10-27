import type { Era, MapMode, PaleoStep } from "../types";

/** 시대의 기준 지도 연대: 빙하기(1 Ma 미만)는 판 이동이 무시할 수준이라 0. */
export const eraMapTime = (era: Era) => (era.age_ma >= 1 ? era.age_ma : 0);

/** 지도에 그릴 해안선 연대: 과거 모드만 슬라이더(없으면 시대 기준) 연대, 나머지는 오늘. */
export function mapTime(era: Era, mode: MapMode, paleoTime: number | null): number {
  return mode === "paleo" ? (paleoTime ?? eraMapTime(era)) : 0;
}

/**
 * 경도를 이어 붙인다: 날짜변경선(±180°)을 넘을 때 앞 점과 가까운 쪽으로 360°를 더하거나 뺀다.
 * 이동 경로 선이 지도 반대편으로 튀지 않게 한다.
 */
export function unwrapLngs(lngs: number[]): number[] {
  const out: number[] = [];
  for (const lng of lngs) {
    if (!out.length) {
      out.push(lng);
      continue;
    }
    const prev = out[out.length - 1];
    let x = lng;
    while (x - prev > 180) x -= 360;
    while (x - prev < -180) x += 360;
    out.push(x);
  }
  return out;
}

/** 오래된 순(왼쪽이 과거)으로, 경도를 이어 붙인 시점 목록. */
export function orderedSteps(steps: PaleoStep[]): PaleoStep[] {
  const sorted = [...steps].sort((a, b) => b.t - a.t);
  const lngs = unwrapLngs(sorted.map((s) => s.korea[0]));
  return sorted.map((s, i) => ({ ...s, korea: [lngs[i], s.korea[1]] }));
}

/** "남위 약 10°" / "북위 약 36°" / "적도 부근". */
export function latLabel(lat: number): string {
  const r = Math.round(Math.abs(lat));
  if (r < 3) return "적도 부근";
  return `${lat < 0 ? "남위" : "북위"} 약 ${r}°`;
}

/** 위도선(30° 간격, 적도 포함) GeoJSON. 세계 반복 표시를 위해 경도 -540~540까지 긋는다. */
export function graticule() {
  const lats = [-60, -30, 0, 30, 60];
  return {
    type: "FeatureCollection" as const,
    features: lats.map((lat) => ({
      type: "Feature" as const,
      properties: { lat, equator: lat === 0 },
      geometry: { type: "LineString" as const, coordinates: Array.from({ length: 109 }, (_, i) => [-540 + i * 10, lat]) },
    })),
  };
}

/** 대륙(지괴) 무리: 지도 색과 이름. 판 번호와 오늘날 대륙으로 나눴다 (파이프라인 fetch_paleogeo.classify). */
export const CONTINENTS: Record<string, { label: string; color: string }> = {
  north_china: { label: "북중국 지괴 (한반도 포함)", color: "#D9A066" },
  south_china: { label: "남중국 지괴", color: "#C7B26E" },
  siberia: { label: "시베리아", color: "#A7B98A" },
  other_asia: { label: "그 밖의 아시아 지괴", color: "#B4AC9F" },
  japan: { label: "일본 열도", color: "#B8917A" },
  europe: { label: "발티카·유럽", color: "#B6A2C8" },
  north_america: { label: "로렌시아 (북아메리카)", color: "#8FB3C4" },
  south_america: { label: "남아메리카", color: "#CB907C" },
  africa: { label: "아프리카", color: "#D8B784" },
  india: { label: "인도", color: "#E2A5A2" },
  australia: { label: "오스트레일리아", color: "#9DC3A7" },
  antarctica: { label: "남극", color: "#C3CCD6" },
};

/** 그 무렵 대륙 배치 한 줄 설명 (대략적인 연대). */
export function supercontinentNote(t: number): string {
  if (t === 0) return "오늘의 대륙 배치예요.";
  if (t >= 340) return "남반구에 곤드와나 초대륙(아프리카·남아메리카·인도·오스트레일리아·남극)이 있었어요.";
  if (t > 200) return "대륙 대부분이 판게아 초대륙으로 모여 있었어요.";
  if (t > 145) return "판게아가 북쪽 로라시아와 남쪽 곤드와나로 갈라지기 시작했어요.";
  if (t > 66) return "대서양이 열리고 곤드와나가 조각나는 중이에요.";
  return "오늘과 비슷한 대륙 배치에 가까워지는 중이에요.";
}
