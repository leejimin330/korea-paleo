import { cluster, hierarchy, scalePow } from "d3";
import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import type { TreeNode } from "../../types";

const ROW = 19;
const WIDTH = 980;
const LEFT = 44;
const RIGHT = 150; // 잎 이름 자리
const MAX_MA = 600;

const AXIS_TICKS = [
  { ma: 541, label: "캄브리아기 시작" },
  { ma: 252, label: "페름기 말 대멸종" },
  { ma: 66, label: "백악기 말 대멸종" },
  { ma: 0, label: "오늘" },
];

/** 가로축 = 시간 (과거 → 현재). 최근을 넓게 보이도록 거듭제곱 스케일. */
const x = scalePow().exponent(0.45).domain([0, MAX_MA]).range([WIDTH - RIGHT, LEFT]);

export function TreeView() {
  const data = useAppStore((s) => s.data);
  const eraId = useAppStore((s) => s.selectedEraId);
  const selectedId = useAppStore((s) => s.selectedTreeNodeId);
  const path = useAppStore((s) => s.highlightedPath);
  const selectTreeNode = useAppStore((s) => s.selectTreeNode);

  const layout = useMemo(() => {
    if (!data) return null;
    const root = hierarchy<TreeNode>(data.tree.root, (d) => d.children);
    const leaves = root.leaves().length;
    cluster<TreeNode>().size([(leaves - 1) * ROW, 1]).separation(() => 1)(root);
    return { nodes: root.descendants(), height: leaves * ROW + 40 };
  }, [data]);

  if (!data || !layout) return null;
  const era = data.eras.find((e) => e.id === eraId);
  const onPath = new Set(path);
  const fossilNodes = new Set(data.fossils.filter((f) => f.era_id === eraId).map((f) => f.tree_node_id));

  return (
    <section className="tree-view" aria-label="계통수">
      <header>
        <h2>계통수</h2>
        <p className="legend">
          <span className="lg-solid" /> 생존 계통 <span className="lg-dash" /> 분기 위치 논쟁 중 <b>†</b> 멸종 <span className="lg-dot" /> 이 시대 한반도 화석
          <span className="muted"> · 현재 가장 지지받는 가설이며, 분기 시점은 대략값이에요.</span>
        </p>
      </header>
      <div className="tree-scroll">
        <svg width={WIDTH} height={layout.height} role="tree">
          {AXIS_TICKS.map((t) => (
            <g key={t.ma} className="axis">
              <line x1={x(t.ma)} x2={x(t.ma)} y1={0} y2={layout.height - 16} />
              <text x={x(t.ma)} y={layout.height - 4} textAnchor="middle">{t.label}</text>
            </g>
          ))}
          {era && (
            <g className="era-band">
              <rect x={x(era.range_ma[0])} width={Math.max(3, x(era.range_ma[1]) - x(era.range_ma[0]))} y={0} height={layout.height - 16} />
            </g>
          )}
          {layout.nodes.map((n) => {
            const d = n.data;
            const y = (n.x ?? 0) + 10;
            const x0 = x(d.time_ma);
            const x1 = n.children ? x(Math.max(...n.children.map((c) => c.data.time_ma))) : x(d.extinct_ma ?? 0);
            const hot = onPath.has(d.id);
            const parent = n.parent;
            return (
              <g key={d.id} className={`tnode${hot ? " hot" : ""}${d.id === selectedId ? " selected" : ""}`}>
                {parent && (
                  <path
                    className={`link${d.uncertain ? " dashed" : ""}`}
                    d={`M${x(parent.data.time_ma)},${(parent.x ?? 0) + 10}V${y}H${x0}`}
                  />
                )}
                {!n.children && <line className={`stem${d.uncertain ? " dashed" : ""}`} x1={x0} x2={x1} y1={y} y2={y} />}
                <g className="hit" onClick={() => selectTreeNode(d.id)} role="treeitem" aria-label={d.name_ko} aria-selected={d.id === selectedId}>
                  <rect x={x0 - 4} y={y - 9} width={Math.max(12, x1 - x0 + 8)} height={18} />
                  <circle cx={x0} cy={y} r={d.id === selectedId ? 5 : 3} />
                  {fossilNodes.has(d.id) && <circle className="fossil-dot" cx={(x0 + x1) / 2} cy={y} r={4.5} />}
                  <text
                    x={n.children ? x0 - 4 : x1 + 6}
                    y={n.children ? y - 4 : y + 4}
                    textAnchor={n.children ? "end" : "start"}
                    className={n.children ? "inner" : "leaf"}
                  >
                    {d.extinct_ma != null && !n.children ? "† " : ""}
                    {d.name_ko}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
