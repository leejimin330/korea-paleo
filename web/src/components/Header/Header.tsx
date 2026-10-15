import { useState } from "react";
import { ancestorsOf } from "../../lib/tree";
import { useAppStore } from "../../store/useAppStore";

function Footprints() {
  const track = (
    <>
      <ellipse cx="32" cy="46" rx="10" ry="11" stroke="none" />
      <path d="M32 40V10M28 42L14 18M36 42L50 18" strokeWidth="8" fill="none" />
      <path d="M32 10l0-6M14 18l-3-5M50 18l3-5" strokeWidth="3" fill="none" />
    </>
  );
  return (
    <svg className="footprints" width="168" height="64" viewBox="0 0 168 64" aria-hidden="true">
      <g fill="currentColor" stroke="currentColor" strokeLinecap="round">
        <g transform="translate(6 22) rotate(78 22 22) scale(0.62)" opacity="0.28">{track}</g>
        <g transform="translate(60 0) rotate(102 22 22) scale(0.62)" opacity="0.55">{track}</g>
        <g transform="translate(114 20) rotate(78 22 22) scale(0.62)">{track}</g>
      </g>
    </svg>
  );
}

const COLLAPSED = 10;

/** 제목 + 오늘의 생물에서 거슬러 오르기(역방향 탐색). */
export function Header() {
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
    <header className="masthead">
      <div className="masthead-title">
        <div className="eyebrow">KOREAN PENINSULA · 541 MA → TODAY</div>
        <div className="title-row">
          <h1>한반도 생명 연대기</h1>
          <Footprints />
        </div>
        <p className="lede">시간을 거슬러 이 땅에 살았던 생물과, 그 생물이 오늘 어떤 동물로 이어지는지 따라가 보세요.</p>
      </div>
      <form
        className="trace"
        onSubmit={(e) => {
          e.preventDefault();
          if (shown[0]) reverseSearch(shown[0].id);
        }}
      >
        <label htmlFor="trace">오늘의 생물에서 거슬러 오르기</label>
        <div className="trace-input">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input id="trace" type="search" placeholder="까치, 고라니, 붕어…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
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
    </header>
  );
}
