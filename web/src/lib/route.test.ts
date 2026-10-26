import { describe, expect, it } from "vitest";
import { formatRoute, parseHash } from "./route";

describe("route", () => {
  it("parses era, timeline and falls back to home", () => {
    expect(parseHash("#/era/cretaceous")).toEqual({ page: "era", eraId: "cretaceous" });
    expect(parseHash("#/timeline")).toEqual({ page: "timeline" });
    expect(parseHash("")).toEqual({ page: "home" });
    expect(parseHash("#/era")).toEqual({ page: "home" });
    expect(parseHash("#/nope")).toEqual({ page: "home" });
  });

  it("round-trips", () => {
    for (const r of [{ page: "home" as const }, { page: "timeline" as const }, { page: "era" as const, eraId: "ice_age" }])
      expect(parseHash(formatRoute(r))).toEqual(r);
  });
});
