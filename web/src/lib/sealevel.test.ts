import { describe, expect, it } from "vitest";
import { classify, renderSeaLevel, SEA_COLORS, type BathyGrid } from "./sealevel";

describe("classify", () => {
  it("separates today's land, newly exposed seabed, and sea", () => {
    expect(classify(1, -120)).toBe("land");
    expect(classify(0, -120)).toBe("exposed");
    expect(classify(-80, -120)).toBe("exposed");
    expect(classify(-120, -120)).toBe("sea");
    expect(classify(-80, 0)).toBe("sea");
  });
});

describe("renderSeaLevel", () => {
  // 2×2: 북쪽 행 [육지, -50m], 남쪽 행 [-100m, -200m]
  const grid: BathyGrid = { bbox: [120, 34, 120.05, 34.05], resolution_deg: 0.05, width: 2, height: 2, data: [1, -50, -100, -200] };
  const px = (rgba: Uint8ClampedArray, i: number) => Array.from(rgba.slice(i * 4, i * 4 + 4));

  const rgb = (rgba: Uint8ClampedArray, i: number) => Array.from(rgba.slice(i * 4, i * 4 + 3));

  it("paints cells by sea level (colour channels; edges fade out)", () => {
    const today = renderSeaLevel(grid, 0);
    expect(rgb(today.rgba, 0)).toEqual(SEA_COLORS.land.slice(0, 3));
    expect(rgb(today.rgba, 1)).toEqual(SEA_COLORS.sea.slice(0, 3));
    expect(px(today.rgba, 0)[3]).toBe(0); // 2×2 격자는 전부 가장자리
    expect(today.exposedKm2).toBe(0);

    const glacial = renderSeaLevel(grid, -120);
    expect(rgb(glacial.rgba, 1)).toEqual(SEA_COLORS.exposed.slice(0, 3));
    expect(rgb(glacial.rgba, 2)).toEqual(SEA_COLORS.exposed.slice(0, 3));
    expect(rgb(glacial.rgba, 3)).toEqual(SEA_COLORS.sea.slice(0, 3));
  });

  it("keeps interior cells opaque", () => {
    const n = 30;
    const big: BathyGrid = { bbox: [120, 34, 120 + 0.05 * (n - 1), 34 + 0.05 * (n - 1)], resolution_deg: 0.05, width: n, height: n, data: Array(n * n).fill(-10) };
    const { rgba } = renderSeaLevel(big, -120);
    const mid = 15 * n + 15;
    expect(rgba[mid * 4 + 3]).toBe(255);
  });

  it("reports exposed area from cell size and latitude", () => {
    const { exposedKm2 } = renderSeaLevel(grid, -120);
    // 0.05° 칸 ≈ 5.57km × 5.57km × cos(34°) ≈ 25.7km², 두 칸
    expect(exposedKm2).toBeGreaterThan(50);
    expect(exposedKm2).toBeLessThan(53);
  });
});
