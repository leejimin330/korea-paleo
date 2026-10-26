import type { CSSProperties } from "react";
import { eraSpecies } from "../../lib/catalog";
import { formatAgoKo } from "../../lib/markers";
import { periodAt, PERIODS } from "../../lib/periods";
import { useAppStore } from "../../store/useAppStore";
import type { Era, Species } from "../../types";
import { TraceSearch } from "../Trace/TraceSearch";
import { Footprints } from "./Footprints";

/** 층마다 윗면을 조금씩 다르게 깎아 실제 지층 경계처럼 보이게 한다 (값은 고정, 무작위 아님). */
const EDGES = [
  "0 6px, 18% 0, 41% 7px, 63% 2px, 82% 8px, 100% 3px",
  "0 2px, 22% 8px, 47% 1px, 69% 6px, 88% 0, 100% 5px",
  "0 7px, 15% 2px, 36% 8px, 58% 0, 79% 5px, 100% 1px",
  "0 3px, 26% 0, 44% 6px, 66% 2px, 85% 8px, 100% 4px",
  "0 5px, 19% 8px, 40% 2px, 61% 7px, 83% 1px, 100% 6px",
];

/** 대표 생물 네 가지: 학명이 붙은 생물을 먼저, 계통(노드)이 겹치지 않게 고른다. */
function samples(list: Species[], n = 4): Species[] {
  const out: Species[] = [];
  const seen = new Set<string>();
  const ordered = [...list].sort((a, b) => Number(!a.scientific_name) - Number(!b.scientific_name));
  for (const s of ordered) {
    if (seen.has(s.tree_node_id)) continue;
    seen.add(s.tree_node_id);
    out.push(s);
    if (out.length === n) break;
  }
  return out;
}

function Layer({ era, index, species }: { era: Era; index: number; species: Species[] }) {
  const period = periodAt(era.age_ma);
  const korea = species.filter((s) => s.region === "korea").length;
  const style = {
    "--layer": period?.color ?? "#e8d3b0",
    clipPath: `polygon(${EDGES[index % EDGES.length]}, 100% 100%, 0 100%)`,
  } as CSSProperties;

  return (
    <li className="layer" style={style}>
      <a href={`#/era/${era.id}`} className="layer-link">
        <div className="layer-age">
          <strong>{formatAgoKo(era.age_ma)}</strong>
          <span>{era.period}</span>
        </div>
        <div className="layer-main">
          <h3>{era.name}</h3>
          <p>{era.highlight}</p>
        </div>
        <div className="layer-life">
          <p className="layer-count">
            생물 {species.length}종 <span>한반도 {korea} · 주변 지역 {species.length - korea}</span>
          </p>
          <ul>
            {samples(species).map((s) => (
              <li key={s.id}>{s.name_ko}</li>
            ))}
          </ul>
        </div>
        <span className="layer-go">들어가기</span>
      </a>
    </li>
  );
}

/** 메인: 무엇을 볼 수 있는지 → 어느 시대로 들어갈지 → 다른 길(거슬러 오르기, 연대표). */
export function Home() {
  const data = useAppStore((s) => s.data);
  if (!data) return null;
  // 지층은 위가 최근, 아래가 오래전.
  const eras = [...data.eras].sort((a, b) => a.age_ma - b.age_ma);
  const oldest = eras[eras.length - 1];
  const total = data.species.length;

  return (
    <main className="home">
      <header className="hero">
        <div className="title-row">
          <h1>한반도 생명 연대기</h1>
          <Footprints />
        </div>
        <p className="lede">
          5억 년 전 바다부터 2만 년 전 빙하기까지, 이 땅과 주변에 살았던 생물 {total}종을 시대별로 모았어요. 지층 하나를 골라
          들어가면 지도에서 화석이 나온 곳을 보고, 그 생물이 오늘 어떤 동물과 이어지는지 따라갈 수 있어요.
        </p>
        <div className="hero-actions">
          <a className="primary" href={`#/era/${oldest.id}`}>
            가장 오래된 바다부터 보기
          </a>
          <a className="secondary" href="#/timeline">
            연대표 먼저 보기
          </a>
        </div>
      </header>

      <section className="strata-section" aria-labelledby="strata-title">
        <div className="section-head">
          <h2 id="strata-title">지층을 골라 들어가세요</h2>
          <p>땅을 파 내려가듯, 위가 가장 최근이고 아래로 갈수록 오래된 시대예요.</p>
        </div>
        <div className="column">
          <div className="column-axis" aria-hidden="true">
            <span>지표 · 오늘</span>
            <span>더 깊이 · 더 오래전</span>
          </div>
          <ol className="layers">
            {eras.map((e, i) => (
              <Layer key={e.id} era={e} index={i} species={eraSpecies(data.species, e.id)} />
            ))}
          </ol>
        </div>
      </section>

      <section className="home-more">
        <TraceSearch />
        <a className="chrono-teaser" href="#/timeline">
          <h2>연대표</h2>
          <p>46억 년 전부터 오늘까지, 지질시대마다 한반도와 세계에서 무슨 일이 있었는지 한 표로 정리했어요.</p>
          <div className="teaser-bar" aria-hidden="true">
            {PERIODS.map((p) => (
              <i key={p.id} style={{ background: p.color }} />
            ))}
          </div>
          <span className="teaser-go">연대표 보기</span>
        </a>
      </section>
    </main>
  );
}
