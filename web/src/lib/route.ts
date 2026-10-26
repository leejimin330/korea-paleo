import type { Page } from "../types";

export type Route = { page: Page; eraId?: string };

/** "#/era/cretaceous" → { page: "era", eraId: "cretaceous" }. 모르는 주소는 메인. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "era" && parts[1]) return { page: "era", eraId: decodeURIComponent(parts[1]) };
  if (parts[0] === "timeline") return { page: "timeline" };
  return { page: "home" };
}

export function formatRoute(r: Route): string {
  if (r.page === "era" && r.eraId) return `#/era/${encodeURIComponent(r.eraId)}`;
  if (r.page === "timeline") return "#/timeline";
  return "#/";
}
