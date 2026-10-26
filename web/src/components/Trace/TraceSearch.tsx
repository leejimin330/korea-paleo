import { useState } from "react";
import { ancestorsOf } from "../../lib/tree";
import { useAppStore } from "../../store/useAppStore";

const COLLAPSED = 10;

/** 오늘의 생물에서 거슬러 오르기(역방향 탐색). 고르면 그 친척 화석이 있는 시대 화면으로 간다. */
export function TraceSearch() {
  const modern = useAppStore((s) => s.data?.modern ?? []);
  const tree = useAppStore((s) => s.data?.tree);
  const path = useAppStore((s) => s.highlightedPath);
  const selectedNode = useAppStore((s) => s.selectedTreeNodeId);
  const reverseSearch = useAppStore((s) => s.reverseSearch);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(false);

  const query = q.trim();
  // 이름·학명뿐 아니라 속한 무리 이름으로도 찾는다 (예: "상어" → 연골어류(상어·가오리) → 백상아리).
  const matches = (id: string, name: string, sci: string) =>
    name.includes(query) ||
    sci.toLowerCase().includes(query.toLowerCase()) ||
    (tree ? ancestorsOf(tree, id).some((a) => tree.byId.get(a)!.name_ko.includes(query)) : false);
  const shown = query ? modern.filter((m) => matches(m.tree_node_id, m.name_ko, m.scientific_name)) : modern;

  // 검색 중이거나 펼친 상태가 아니면 앞쪽 일부만 보이되, 지금 강조된 생물은 항상 보인다.
  const isOn = (id: string) => path.includes(id) || selectedNode === id;
  const visible = query || expanded ? shown : shown.filter((m, i) => i < COLLAPSED || isOn(m.id));
  const hiddenCount = shown.length - visible.length;

  return (
    <form
      id="trace"
      className="trace"
      onSubmit={(e) => {
        e.preventDefault();
        if (shown[0]) reverseSearch(shown[0].id);
      }}
    >
      <label htmlFor="trace-q">오늘의 생물에서 거슬러 오르기</label>
      <p className="trace-help">지금 사는 동물을 고르면, 가장 가까운 친척 화석이 있는 시대로 데려가요.</p>
      <div className="trace-input">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input id="trace-q" type="search" placeholder="까치, 고라니, 붕어…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>
      <div className="chips">
        {visible.map((m) => {
          const on = isOn(m.id);
          return (
            <button key={m.id} type="button" aria-pressed={on} className={on ? "on" : ""} title={m.scientific_name} onClick={() => reverseSearch(m.id)}>
              {m.name_ko}
            </button>
          );
        })}
        {hiddenCount > 0 && (
          <button type="button" className="more" aria-expanded={false} onClick={() => setExpanded(true)}>
            더 보기 +{hiddenCount}
          </button>
        )}
        {expanded && !query && modern.length > COLLAPSED && (
          <button type="button" className="more" aria-expanded={true} onClick={() => setExpanded(false)}>
            접기
          </button>
        )}
        {shown.length === 0 && <span className="muted">'{query}'은(는) 아직 목록에 없어요.</span>}
      </div>
    </form>
  );
}
