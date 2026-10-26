import type { Era, ImageInfo, Species, TreeNode } from "../types";
import { ancestorsOf, pathToToday, type TreeIndex } from "./tree";

export type Relative = { species: Species; shared: string };

export type LineageItem =
  | { kind: "clade"; ma: number; node: TreeNode }
  | { kind: "era"; ma: number; era: Era; relatives: Relative[]; more: number; shared: string | null; here: boolean }
  | { kind: "today"; ma: 0; pivot: string; modern: TreeNode[] };

const MAX_RELATIVES = 6;

/**
 * 진화 경로: 고른 생물의 조상 무리가 나타난 시점과, 전시 시대마다 그 생물과 가장 가까운 친척(도감 항목)을
 * 오래된 순서로 늘어놓고, 마지막에 오늘 살아 있는 친척을 둔다.
 * 시대별 친척 = 그 시대 도감에서 고른 생물과의 공통 조상이 가장 깊은(가까운) 항목들. 동물계만 공유하면 친척으로 치지 않는다.
 */
export function buildLineage(idx: TreeIndex, species: Species[], eras: Era[], nodeId: string, selectedSpeciesId: string | null): LineageItem[] {
  const up = ancestorsOf(idx, nodeId);
  const onLine = new Set(up);
  const rootDepth = idx.depth.get(idx.root.id) ?? 0;

  const shared = (s: Species) => ancestorsOf(idx, s.tree_node_id).find((a) => onLine.has(a));

  const items: LineageItem[] = up
    .map((id) => idx.byId.get(id)!)
    .filter((n) => n.kind === "clade")
    .map((node) => ({ kind: "clade" as const, ma: node.time_ma, node }));

  for (const era of eras) {
    const here = species.filter((s) => s.era_id === era.id);
    let best = rootDepth;
    const withShared = here.map((s) => {
      const a = shared(s);
      const d = a ? (idx.depth.get(a) ?? rootDepth) : rootDepth;
      if (d > best) best = d;
      return { s, a, d };
    });
    const close = best > rootDepth ? withShared.filter((x) => x.d === best) : [];
    close.sort(
      (x, y) =>
        Number(y.s.id === selectedSpeciesId) - Number(x.s.id === selectedSpeciesId) ||
        Number(x.s.region !== "korea") - Number(y.s.region !== "korea") ||
        Number(!x.s.scientific_name) - Number(!y.s.scientific_name),
    );
    items.push({
      kind: "era",
      ma: era.age_ma,
      era,
      relatives: close.slice(0, MAX_RELATIVES).map((x) => ({ species: x.s, shared: x.a! })),
      more: Math.max(close.length - MAX_RELATIVES, 0),
      shared: close[0]?.a ?? null,
      here: here.some((s) => s.id === selectedSpeciesId),
    });
  }

  const node = idx.byId.get(nodeId)!;
  const today = node.kind === "modern" ? { pivot: nodeId, modern: [node] } : (() => {
    const p = pathToToday(idx, nodeId);
    return p ? { pivot: p.pivot, modern: p.modern.map((id) => idx.byId.get(id)!) } : null;
  })();

  // 오래된 것이 위. 같은 연대면 무리 등장을 시대보다 먼저.
  items.sort((a, b) => b.ma - a.ma || Number(a.kind === "era") - Number(b.kind === "era"));
  if (today) items.push({ kind: "today", ma: 0, ...today });
  return items;
}

/**
 * 생물 사진: 속 이름으로 찾고, 없으면 그 생물이 속한 무리(가까운 조상부터)의 사진을 쓴다.
 * fallback이 있으면 "무리 대표 사진"이라고 밝혀야 한다.
 */
export function imageFor(
  images: Record<string, ImageInfo>,
  idx: TreeIndex,
  sci: string | null,
  nodeId: string,
): { image: ImageInfo; fallback: TreeNode | null } | null {
  const genus = sci?.split(" ")[0];
  if (genus && images[genus]) return { image: images[genus], fallback: null };
  if (sci && images[sci]) return { image: images[sci], fallback: null };
  for (const id of ancestorsOf(idx, nodeId)) {
    const n = idx.byId.get(id)!;
    if (images[n.name]) return { image: images[n.name], fallback: n };
  }
  return null;
}
