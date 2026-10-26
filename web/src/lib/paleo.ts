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
  return sorted.map((s, i) => ({ t: s.t, korea: [lngs[i], s.korea[1]] }));
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
