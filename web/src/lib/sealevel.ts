/** 해수면 슬라이더: 오늘의 수심 그리드에서 해수면보다 높은 칸을 육지로 칠한다. */
export type BathyGrid = {
  bbox: [number, number, number, number]; // west, south, east, north
  resolution_deg: number;
  width: number;
  height: number;
  data: number[]; // 북→남 행, 서→동 열. 고도(m), 바다는 음수
};

type RGBA = [number, number, number, number];
export const SEA_COLORS: { sea: RGBA; land: RGBA; exposed: RGBA } = {
  sea: [247, 231, 204, 255],
  land: [223, 194, 150, 255],
  exposed: [196, 166, 102, 255],
};

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const invMercY = (y: number) => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;

export type Classified = "sea" | "land" | "exposed";
export function classify(alt: number, seaLevel: number): Classified {
  if (alt > 0) return "land";
  if (alt > seaLevel) return "exposed";
  return "sea";
}

/** 그리드 바깥 해안선(판 모델)과 직선 경계 없이 섞이도록 가장자리 몇 칸은 점점 투명하게. */
export const EDGE_FADE_CELLS = 12;

/**
 * 해수면 seaLevel(0 ~ -130m)에서의 지도 이미지(RGBA)와 새로 드러난 땅의 면적.
 * 지도는 메르카토르라 위도 간격이 균일하지 않으므로, 출력 행을 메르카토르 y 기준으로 균등하게 다시 샘플링한다.
 */
export function renderSeaLevel(grid: BathyGrid, seaLevel: number) {
  const { width, height, data, resolution_deg: res } = grid;
  const [, south, , north] = grid.bbox;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const yTop = mercY(north);
  const yBottom = mercY(south);
  for (let j = 0; j < height; j++) {
    const lat = invMercY(yTop + ((yBottom - yTop) * (j + 0.5)) / height);
    const src = Math.min(height - 1, Math.max(0, Math.round((north - lat) / res)));
    for (let i = 0; i < width; i++) {
      const o = (j * width + i) * 4;
      rgba.set(SEA_COLORS[classify(data[src * width + i], seaLevel)], o);
      const edge = Math.min(i, j, width - 1 - i, height - 1 - j);
      if (edge < EDGE_FADE_CELLS) rgba[o + 3] = Math.round((255 * edge) / EDGE_FADE_CELLS);
    }
  }

  // 면적은 원래 격자(위경도 균등)에서 칸마다 cos(위도)로 계산한다.
  const kmPerDeg = 111.32;
  let exposedKm2 = 0;
  for (let y = 0; y < height; y++) {
    const cellKm2 = (res * kmPerDeg) ** 2 * Math.cos(((north - y * res) * Math.PI) / 180);
    for (let x = 0; x < width; x++) if (classify(data[y * width + x], seaLevel) === "exposed") exposedKm2 += cellKm2;
  }
  return { rgba, width, height, exposedKm2 };
}

/** 이미지 소스 모서리 좌표 (좌상, 우상, 우하, 좌하). */
export function gridCorners(grid: BathyGrid): [[number, number], [number, number], [number, number], [number, number]] {
  const [w, s, e, n] = grid.bbox;
  const half = grid.resolution_deg / 2;
  return [[w - half, n + half], [e + half, n + half], [e + half, s - half], [w - half, s - half]];
}
