import { periodAt, PERIODS, ERAS_GEO } from "../../lib/periods";
import { formatAgoKo, formatMa } from "../../lib/markers";
import { xPct } from "../../lib/rails";
import { useAppStore } from "../../store/useAppStore";

/** 지층 타임라인: 지질시대 띠 위에 바늘, 아래에 시대 정거장. 왼쪽이 과거. */
export function Timeline() {
  const eras = useAppStore((s) => s.data?.eras ?? []);
  const selected = useAppStore((s) => s.selectedEraId);
  const selectEra = useAppStore((s) => s.selectEra);
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
      <div className="strata-stops">
        {sorted.map((e, i) => {
          const pos = xPct(e.age_ma);
          // 다음 정거장이 가까우면(20% 이내) 바늘 왼쪽으로 붙여 겹치지 않게 한다.
          const next = sorted[i + 1];
          const crowded = next !== undefined && xPct(next.age_ma) - pos < 20;
          const shift = i === 0 ? "translateX(-24px)" : i === sorted.length - 1 || crowded ? "translateX(-100%)" : "translateX(-50%)";
          return (
            <button
              key={e.id}
              type="button"
              aria-pressed={e.id === selected}
              className={e.id === selected ? "on" : ""}
              style={{ left: `${Math.max(pos, 0)}%`, transform: shift }}
              onClick={() => selectEra(e.id)}
            >
              <span className="stop-name">
                {e.name}
                {e.status === "preview" && <em> · 미리보기</em>}
              </span>
              <span className="stop-time">
                {formatAgoKo(e.age_ma)} · {formatMa(e.age_ma)}
              </span>
            </button>
          );
        })}
      </div>
      {era && (
        <div className="era-head">
          <h2>{era.period}</h2>
          <div>
            <p className="era-body">{era.description}.</p>
            <p className="era-fact">{era.highlight}</p>
          </div>
        </div>
      )}
    </section>
  );
}
