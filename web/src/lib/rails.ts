import type { Fossil, TreeNode } from "../types";
import { ancestorsOf, type TreeIndex } from "./tree";

/** 계통 레일의 시간축: 캄브리아기 시작(541 Ma) → 오늘, 선형. 0~100(%). */
export const AXIS_MA = 541;
export const xPct = (ma: number) => ((AXIS_MA - Math.min(ma, AXIS_MA)) / AXIS_MA) * 100;

type GroupDef = { id: string; label: string; anchor: string; exclude?: string };

/** 위에서부터 그리는 순서. 잎은 anchor 서브트리에 있고 exclude 서브트리에 없는 첫 그룹에 속한다. */
export const RAIL_GROUPS: GroupDef[] = [
  { id: "birds", label: "조류 BIRDS — 수각류 공룡의 후손", anchor: "theropoda", exclude: "dromaeosauridae" },
  { id: "dinosaurs", label: "공룡 DINOSAURS", anchor: "dinosauria" },
  { id: "reptiles", label: "파충류 REPTILES", anchor: "sauropsida" },
  { id: "mammals", label: "포유류 MAMMALS", anchor: "synapsida" },
  { id: "fishes", label: "어류 FISHES", anchor: "vertebrata" },
  { id: "invertebrates", label: "무척추동물 INVERTEBRATES", anchor: "animalia" },
];
const DISPLAY_ORDER = ["invertebrates", "fishes", "mammals", "reptiles", "dinosaurs", "birds"];

export type RailDot = { pct: number; fossilIds: string[]; title: string };

export type Lane = {
  id: string;
  name: string;
  clade: string;
  extinct: boolean;
  dashed: boolean;
  /** 가는 구간(큰 무리) 시작 → 굵은 구간(자기 무리) 시작 → 끝, 모두 Ma. */
  thinFromMa: number;
  thickFromMa: number;
  endMa: number;
  dots: RailDot[];
};

export type RailGroup = { id: string; label: string; lanes: Lane[] };

function leaves(node: TreeNode): TreeNode[] {
  return node.children.length ? node.children.flatMap(leaves) : [node];
}

export function buildRails(idx: TreeIndex, fossils: Fossil[], eraId: string): RailGroup[] {
  const groups = new Map<string, Lane[]>(RAIL_GROUPS.map((g) => [g.id, []]));
  // 범례가 "이 시대 한반도 화석"이므로 동아시아 참고 화석은 레일에 찍지 않는다.
  const eraFossils = fossils.filter((f) => f.era_id === eraId && f.marker_type === "korea");

  for (const leaf of leaves(idx.root)) {
    const up = ancestorsOf(idx, leaf.id);
    const g = RAIL_GROUPS.find((d) => up.includes(d.anchor) && !(d.exclude && up.includes(d.exclude)));
    if (!g) continue;
    const anchor = idx.byId.get(g.anchor)!;
    const anchorDepth = idx.depth.get(g.anchor)!;
    // 무척추동물은 동물계 바로 아래 문(門)을 큰 무리로 쓴다.
    const bigGroup = g.id === "invertebrates" ? idx.byId.get(up[up.length - 2])! : anchor;
    const parent = idx.byId.get(up[1])!;
    const thickFrom = leaf.kind === "modern" ? parent.time_ma : leaf.time_ma;

    const lineage = up.slice(1, up.indexOf(bigGroup.id) + 1).reverse();
    const clade = lineage.slice(-3).map((id) => idx.byId.get(id)!.name_ko).join(" › ");

    const byPct = new Map<number, RailDot>();
    for (const f of eraFossils) {
      if (!up.includes(f.tree_node_id)) continue;
      if ((idx.depth.get(f.tree_node_id) ?? 0) < anchorDepth) continue;
      // 2% 간격으로 묶어 점이 겹치지 않게 한다.
      const pct = Math.round(xPct((f.age_range_ma[0] + f.age_range_ma[1]) / 2) / 2) * 2;
      const dot = byPct.get(pct) ?? { pct, fossilIds: [], title: "" };
      dot.fossilIds.push(f.id);
      dot.title = dot.title ? `${dot.title}, ${f.name_ko}` : f.name_ko;
      byPct.set(pct, dot);
    }

    groups.get(g.id)!.push({
      id: leaf.id,
      name: leaf.name_ko,
      clade,
      extinct: leaf.extinct_ma != null,
      dashed: leaf.kind !== "modern" && leaf.uncertain,
      thinFromMa: Math.max(bigGroup.time_ma, thickFrom),
      thickFromMa: thickFrom,
      endMa: leaf.extinct_ma ?? 0,
      dots: [...byPct.values()],
    });
  }

  return DISPLAY_ORDER.map((id) => {
    const def = RAIL_GROUPS.find((g) => g.id === id)!;
    return { id, label: def.label, lanes: groups.get(id)! };
  }).filter((g) => g.lanes.length > 0);
}
