import { Fragment } from "react";
import { CHRONOLOGY, spanLabel, type ChronoRow } from "../../lib/chronology";
import { formatAgoKo } from "../../lib/markers";
import { useAppStore } from "../../store/useAppStore";

const EARTH_MA = 4600;
const PHANEROZOIC_MA = 541;

/** 지구 역사 전체 막대와, 그중 동물 화석이 많은 마지막 5억 4100만 년을 확대한 막대. */
function Scale() {
  const phan = CHRONOLOGY.filter((r) => r.id !== "Pc");
  return (
    <figure className="scale">
      <div className="scale-row">
        <span className="scale-label">지구 역사 46억 년</span>
        <div className="scale-bar">
          <i style={{ flexGrow: EARTH_MA - PHANEROZOIC_MA, background: CHRONOLOGY[0].color }} title="선캄브리아 시대" />
          <i style={{ flexGrow: PHANEROZOIC_MA }} className="scale-zoom" title="고생대 이후" />
        </div>
      </div>
      <svg className="scale-link" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
        <path d={`M${100 - (PHANEROZOIC_MA / EARTH_MA) * 100} 0 L0 20 M100 0 L100 20`} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="scale-row">
        <span className="scale-label">최근 5억 4100만 년</span>
        <div className="scale-bar">
          {phan.map((r) => (
            <i key={r.id} style={{ flexGrow: r.from - r.to, background: r.color }} title={r.name}>
              <span>{r.from - r.to > 40 ? r.name : ""}</span>
            </i>
          ))}
        </div>
      </div>
      <figcaption>
        선캄브리아 시대가 지구 역사의 88%를 차지해요. 눈에 보이는 동물 화석은 대부분 마지막 12%인 캄브리아기 이후에 나와요.
      </figcaption>
    </figure>
  );
}

function ExhibitLinks({ row }: { row: ChronoRow }) {
  const eras = useAppStore((s) => s.data?.eras ?? []);
  if (row.exhibits.length === 0) return <span className="muted">—</span>;
  return (
    <>
      {row.exhibits.map((id) => {
        const era = eras.find((e) => e.id === id);
        return era ? (
          <a key={id} href={`#/era/${id}`} className="exhibit">
            {era.name}
          </a>
        ) : null;
      })}
    </>
  );
}

/** 연대표: 대(代) → 기(紀) 순서로, 각 기마다 한반도와 세계에서 일어난 일. 위가 오래전. */
export function ChronologyPage() {
  // 대마다 묶어 첫 줄에 대 이름 칸을 rowspan으로 건다 (대멸종 줄도 그 대에 포함).
  const blocks: [string, ChronoRow[]][] = [];
  for (const r of CHRONOLOGY) {
    const last = blocks[blocks.length - 1];
    if (last && last[0] === r.era) last[1].push(r);
    else blocks.push([r.era, [r]]);
  }

  return (
    <main className="chrono">
      <header className="section-head page-head">
        <h1>연대표</h1>
        <p>
          지질시대를 '기(紀)' 단위로 나눠, 그때 한반도에 어떤 땅이 있었고 세계에서는 어떤 생물이 나타나고 사라졌는지 정리했어요. 위가
          오래전, 아래가 오늘이에요. 숫자는 백만 년 전이고 국제층서위원회 기준이에요.
        </p>
      </header>

      <Scale />

      <div className="chrono-table-wrap">
        <table className="chrono-table">
          <thead>
            <tr>
              <th scope="col">대</th>
              <th scope="col">기</th>
              <th scope="col">백만 년 전</th>
              <th scope="col">한반도에서는</th>
              <th scope="col">세계에서는</th>
              <th scope="col">전시</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map(([era, rows]) => {
              const span = rows.reduce((n, r) => n + 1 + (r.extinctionAfter ? 1 : 0), 0);
              return rows.map((r, i) => (
                <Fragment key={r.id}>
                  <tr className={r.exhibits.length ? "has-exhibit" : ""}>
                    {i === 0 && (
                      <th scope="rowgroup" rowSpan={span} className="chrono-era">
                        <span>{era}</span>
                      </th>
                    )}
                    <th scope="row" className="chrono-period">
                      <i style={{ background: r.color }} aria-hidden="true" />
                      {r.name}
                    </th>
                    <td className="chrono-span">{spanLabel(r.from, r.to)}</td>
                    <td data-label="한반도에서는">{r.korea}</td>
                    <td data-label="세계에서는">{r.world}</td>
                    <td data-label="전시" className="chrono-exhibits">
                      <ExhibitLinks row={r} />
                    </td>
                  </tr>
                  {r.extinctionAfter && (
                    <tr className="extinction">
                      <td colSpan={5}>
                        <span aria-hidden="true">†</span> {r.extinctionAfter}, {formatAgoKo(r.to)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ));
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
