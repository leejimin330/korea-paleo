import { describe, expect, it } from "vitest";
import type { Era } from "../types";
import { latLabel, mapTime, orderedSteps, unwrapLngs } from "./paleo";

describe("paleo map helpers", () => {
  const era = (age: number) => ({ age_ma: age } as Era);

  it("uses the slider only in paleo mode and maps the ice age to today", () => {
    expect(mapTime(era(100), "paleo", null)).toBe(100);
    expect(mapTime(era(100), "paleo", 250)).toBe(250);
    expect(mapTime(era(100), "modern", 250)).toBe(0);
    expect(mapTime(era(0.02), "paleo", null)).toBe(0);
  });

  it("unwraps longitudes across the antimeridian", () => {
    expect(unwrapLngs([165, -177, 168])).toEqual([165, 183, 168]);
    expect(unwrapLngs([-170, 175])).toEqual([-170, -185]);
  });

  it("orders steps oldest first with continuous longitudes", () => {
    const steps = orderedSteps([
      { t: 170, korea: [168, 52], labels: [] },
      { t: 200, korea: [-177, 53], labels: [] },
      { t: 220, korea: [165, 50], labels: [] },
    ]);
    expect(steps.map((s) => s.t)).toEqual([220, 200, 170]);
    expect(steps.map((s) => s.korea[0])).toEqual([165, 183, 168]);
  });

  it("labels latitude in Korean", () => {
    expect(latLabel(-9.6)).toBe("남위 약 10°");
    expect(latLabel(36.5)).toBe("북위 약 37°");
    expect(latLabel(1.2)).toBe("적도 부근");
  });
});

describe("supercontinentNote", () => {
  it("names the supercontinent stage by age", async () => {
    const { supercontinentNote } = await import("./paleo");
    expect(supercontinentNote(480)).toContain("곤드와나");
    expect(supercontinentNote(250)).toContain("판게아");
    expect(supercontinentNote(200)).toContain("갈라지기");
    expect(supercontinentNote(0)).toBe("오늘의 대륙 배치예요.");
  });
});
