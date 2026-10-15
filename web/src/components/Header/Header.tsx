import { useState } from "react";
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

/** 제목 + 오늘의 생물에서 거슬러 오르기(역방향 탐색). */
export function Header() {
  const modern = useAppStore((s) => s.data?.modern ?? []);
  const path = useAppStore((s) => s.highlightedPath);
  const selectedNode = useAppStore((s) => s.selectedTreeNodeId);
  const reverseSearch = useAppStore((s) => s.reverseSearch);
  const [q, setQ] = useState("");

  const query = q.trim();
  const shown = query ? modern.filter((m) => m.name_ko.includes(query) || m.scientific_name.toLowerCase().includes(query.toLowerCase())) : modern;

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
          {shown.map((m) => {
            const on = path.includes(m.id) || selectedNode === m.id;
            return (
              <button key={m.id} type="button" aria-pressed={on} className={on ? "on" : ""} title={m.scientific_name} onClick={() => reverseSearch(m.id)}>
                {m.name_ko}
              </button>
            );
          })}
          {shown.length === 0 && <span className="muted">'{query}'은(는) 아직 목록에 없어요.</span>}
        </div>
      </form>
    </header>
  );
}
