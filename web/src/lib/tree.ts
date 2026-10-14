import type { Fossil, TreeNode } from "../types";

export type TreeIndex = {
  root: TreeNode;
  byId: Map<string, TreeNode>;
  parent: Map<string, string>;
  depth: Map<string, number>;
};

export function indexTree(root: TreeNode): TreeIndex {
  const byId = new Map<string, TreeNode>();
  const parent = new Map<string, string>();
  const depth = new Map<string, number>();
  const walk = (node: TreeNode, d: number) => {
    byId.set(node.id, node);
    depth.set(node.id, d);
    for (const c of node.children) {
      parent.set(c.id, node.id);
      walk(c, d + 1);
    }
  };
  walk(root, 0);
  return { root, byId, parent, depth };
}

/** 자기 자신부터 루트까지의 id 목록. */
export function ancestorsOf(idx: TreeIndex, id: string): string[] {
  if (!idx.byId.has(id)) return [];
  const out = [id];
  let cur = idx.parent.get(id);
  while (cur) {
    out.push(cur);
    cur = idx.parent.get(cur);
  }
  return out;
}

/** 서브트리의 현생종 잎 (깊이 우선 순서). */
export function modernLeaves(node: TreeNode): TreeNode[] {
  if (node.kind === "modern") return [node];
  return node.children.flatMap(modernLeaves);
}

function isInSubtree(idx: TreeIndex, id: string, ancestorId: string): boolean {
  return ancestorsOf(idx, id).includes(ancestorId);
}

export type TodayPath = {
  /** 하이라이트할 노드 전체 (출발 노드 → 갈림 조상 → 현생종들). */
  nodes: string[];
  /** 출발 노드와 현생종이 공유하는 가장 가까운 조상. */
  pivot: string;
  modern: string[];
};

/**
 * 오늘로 이어보기: 출발 노드에서 위로 올라가 현생 자손이 있는 첫 조상(pivot)을 찾고,
 * 출발 노드 → pivot, pivot → 각 현생종 경로를 합친다. "직계 조상"이 아니라 친척 관계를 보여주는 경로다.
 */
export function pathToToday(idx: TreeIndex, startId: string): TodayPath | null {
  const up = ancestorsOf(idx, startId);
  for (let i = 0; i < up.length; i++) {
    const pivotNode = idx.byId.get(up[i])!;
    const leaves = modernLeaves(pivotNode);
    if (leaves.length === 0) continue;
    const nodes = new Set(up.slice(0, i + 1));
    for (const leaf of leaves) {
      for (const a of ancestorsOf(idx, leaf.id)) {
        nodes.add(a);
        if (a === pivotNode.id) break;
      }
    }
    return { nodes: [...nodes], pivot: pivotNode.id, modern: leaves.map((l) => l.id) };
  }
  return null;
}

/**
 * 역방향 탐색: 현생종의 조상을 가까운 순으로 올라가며, 그 조상의 서브트리에 속한 화석 중
 * 가장 구체적인(깊은) 노드에 연결된 화석을 고른다.
 */
export function nearestFossilFor(
  idx: TreeIndex,
  fossils: Fossil[],
  speciesNodeId: string,
): { fossil: Fossil; sharedAncestor: string } | null {
  for (const a of ancestorsOf(idx, speciesNodeId)) {
    const candidates = fossils.filter((f) => isInSubtree(idx, f.tree_node_id, a));
    if (candidates.length === 0) continue;
    candidates.sort((x, y) => (idx.depth.get(y.tree_node_id) ?? 0) - (idx.depth.get(x.tree_node_id) ?? 0));
    return { fossil: candidates[0], sharedAncestor: a };
  }
  return null;
}
