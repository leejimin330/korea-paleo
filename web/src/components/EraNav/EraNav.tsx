import { periodAt, PERIODS, ERAS_GEO } from "../../lib/periods";
import { formatAgoKo, formatMa } from "../../lib/markers";
import { xPct } from "../../lib/rails";
import { useAppStore } from "../../store/useAppStore";

const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** 시대 탐험 화면 위쪽: 지질시대 띠 위에 바늘, 아래에 시대 정거장(왼쪽이 과거), 그리고 지금 시대 소개. */
export function EraNav() {
  const eras = useAppStore((s) => s.data?.eras ?? []);
  const selected = useAppStore((s) => s.selectedEraId);
  const selectEra = useAppStore((s) => s.selectEra);
  const count = useAppStore((s) => s.data?.species.filter((x) => x.era_id === s.selectedEraId).length ?? 0);
  const sorted = [...eras].sort((a, b) => b.age_ma - a.age_ma);
  const era = sorted.find((e) => e.id === selected);
  const current = era ? periodAt(era.age_ma) : undefined;

  return (
    <section className="strata" aria-label="시대 선택">
      <div className="strata-eras">
        {ERAS_GEO.map((g) => (
          <div key={g.name} style={{ flexGrow: g.from - g.to }}>{g.name}</div>
        ))}
      </div>
      <div className="strata-bar">
        <div className="strata-periods">
          {PERIODS.map((p) => {
            const on = p.id === current?.id;
            return (
              <div key={p.id} className={on ? "on" : ""} style={{ flexGrow: p.from - p.to, minWidth: p.id === "Q" ? 40 : 0 }}>
                <div className="strata-swatch" style={{ background: p.color }} />
                <div className="strata-label">{p.name}</div>
              </div>
            );
          })}
        </div>
        {era && <div className="strata-needle" aria-hidden="true" style={{ left: `calc(${xPct(era.age_ma)}% - 1.5px)` }} />}
      </div>
      {/* 정거장은 같은 간격으로 두고, 지층 띠 위의 실제 위치까지 지시선을 긋는다 (가까운 시대끼리 겹치지 않게). */}
      <div className="strata-stops" style={{ gridTemplateColumns: `repeat(${sorted.length}, minmax(0, 1fr))` }}>
        <svg className="strata-leaders" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {sorted.map((e, i) => (
            <line
              key={e.id}
              x1={xPct(e.age_ma)}
              y1={0}
              x2={((i + 0.5) / sorted.length) * 100}
              y2={100}
              className={e.id === selected ? "on" : ""}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {sorted.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={e.id === selected}
            className={e.id === selected ? "on" : ""}
            onClick={() => selectEra(e.id)}
          >
            <span className="stop-name">{e.name}</span>
            <span className="stop-time">
              {formatAgoKo(e.age_ma)} · {formatMa(e.age_ma)}
              {e.status === "preview" && <em> · 미리보기</em>}
            </span>
          </button>
        ))}
      </div>
      {era && (
        <div className="era-head">
          <h2>{era.period}</h2>
          <div>
            <p className="era-body">{era.description}.</p>
            <p className="era-fact">{era.highlight}</p>
          </div>
          <nav className="era-jump" aria-label="이 시대에서 볼 것">
            {/* 주소의 #은 화면 이동에 쓰므로, 같은 화면 안 이동은 버튼으로 스크롤한다. */}
            <button type="button" onClick={() => jump("catalog")}>생물 도감 {count}종</button>
            <button type="button" onClick={() => jump("stage")}>화석 지도</button>
            <button type="button" onClick={() => jump("rails")}>계통 레일</button>
          </nav>
        </div>
      )}
    </section>
  );
}
