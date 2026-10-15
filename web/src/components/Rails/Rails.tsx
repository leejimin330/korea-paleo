import { useMemo } from "react";
import { PERIODS } from "../../lib/periods";
import { buildRails, xPct } from "../../lib/rails";
import { useAppStore } from "../../store/useAppStore";

const TICKS = [
  { ma: 541, label: "541 Ma 캄브리아기", align: "start" },
  { ma: 252, label: "252 Ma 페름기 말 대멸종", align: "center" },
  { ma: 66, label: "66 Ma 백악기 말", align: "center" },
  { ma: 0, label: "오늘", align: "end" },
] as const;

/** 계통 레일: 한 줄 = 한 계통. 가는 구간은 큰 무리, 굵은 구간은 자기 무리, 끝은 생존(●) 또는 멸종(†). */
export function Rails() {
  const data = useAppStore((s) => s.data);
  const eraId = useAppStore((s) => s.selectedEraId);
  const path = useAppStore((s) => s.highlightedPath);
  const selectedNode = useAppStore((s) => s.selectedTreeNodeId);
  const selectTreeNode = useAppStore((s) => s.selectTreeNode);
  const selectFossil = useAppStore((s) => s.selectFossil);

  const groups = useMemo(() => (data ? buildRails(data.tree, data.fossils, eraId) : []), [data, eraId]);
  if (!data) return null;
  const era = data.eras.find((e) => e.id === eraId);
  const hot = new Set(path.length ? path : selectedNode ? [selectedNode] : []);
  const band = era ? { left: xPct(era.range_ma[0]), width: Math.max(xPct(era.range_ma[1]) - xPct(era.range_ma[0]), 0.6) } : null;

  return (
    <section id="rails" className="rails" aria-label="계통 레일">
      <div className="rails-head">
        <div>
          <h2>계통 레일</h2>
          <p>한 줄이 하나의 계통이에요. 굵은 구간이 그 생물이 속한 무리, 가는 구간이 그 위의 큰 무리예요. 현재 가장 지지받는 가설이며 시점은 대략값이에요.</p>
        </div>
        <div className="rails-legend">
          <span><i className="lg-thick" aria-hidden="true" />생존 계통</span>
          <span><i className="lg-dash" aria-hidden="true" />분기 위치 논쟁 중</span>
          <span><b aria-hidden="true">†</b>멸종</span>
          <span><i className="lg-dot" aria-hidden="true" />이 시대 한반도 화석</span>
        </div>
      </div>

      <div className="rails-scroll">
        <div className="rails-inner">
          <div className="rails-row rails-axis">
            <div />
            <div>
              <div className="rails-periods" aria-hidden="true">
                {PERIODS.map((p) => (
                  <div key={p.id} style={{ flexGrow: p.from - p.to, background: p.color }} />
                ))}
              </div>
              <div className="rails-ticks">
                {TICKS.map((t) => (
                  <span key={t.ma} className={`tick-${t.align}`} style={{ left: `${xPct(t.ma)}%` }}>{t.label}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rails-body">
            <div className="rails-guides" aria-hidden="true">
              <div style={{ left: `${xPct(252)}%` }} className="guide" />
              <div style={{ left: `${xPct(66)}%` }} className="guide" />
              {band && <div className="band" style={{ left: `${band.left}%`, width: `${band.width}%` }} />}
            </div>

            {groups.map((g) => (
              <div key={g.id} role="group" aria-label={g.label}>
                <div className="rails-group">{g.label}</div>
                {g.lanes.map((l) => {
                  const on = hot.has(l.id);
                  return (
                    <div key={l.id} className={`rails-row lane${on ? " on" : ""}`}>
                      <button type="button" className="lane-name" onClick={() => selectTreeNode(l.id)} aria-pressed={selectedNode === l.id}>
                        <span className="nm">{l.extinct ? "† " : ""}{l.name}</span>
                        <span className="cl">{l.clade}</span>
                      </button>
                      <div className="lane-track">
                        <div
                          className={`thin${l.dashed ? " dashed" : ""}`}
                          style={{ left: `${xPct(l.thinFromMa)}%`, width: `${Math.max(xPct(l.thickFromMa) - xPct(l.thinFromMa), 0)}%` }}
                        />
                        <div
                          className={`thick${l.dashed ? " dashed" : ""}`}
                          style={{ left: `${xPct(l.thickFromMa)}%`, width: `${Math.max(xPct(l.endMa) - xPct(l.thickFromMa), 0.4)}%` }}
                        />
                        {l.extinct ? (
                          <span className="dagger" style={{ left: `calc(${xPct(l.endMa)}% + 6px)` }} aria-label="멸종">†</span>
                        ) : (
                          <span className="alive" aria-hidden="true" />
                        )}
                        {l.dots.map((d) => (
                          <button
                            key={d.pct}
                            type="button"
                            className="fossil-dot"
                            style={{ left: `${d.pct}%` }}
                            title={d.title}
                            aria-label={`화석: ${d.title}`}
                            onClick={() => selectFossil(d.fossilIds[0])}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
