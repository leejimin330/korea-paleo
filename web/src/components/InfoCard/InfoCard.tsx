import { GROUPS } from "../../lib/markers";
import { useAppStore } from "../../store/useAppStore";

const FACTS = [
  "수장룡·어룡·모사사우루스·익룡은 공룡이 아니에요.",
  "새는 수각류 공룡에서 갈라져 나온 계통이에요.",
  "고래는 육지 포유류가 다시 바다로 돌아간 경우예요.",
  "고지리 지도는 판 구조 모델 기반 추정이에요.",
];

/** 마커 필터 + 역방향 탐색 + 교육용 설명. */
export function InfoCard() {
  const data = useAppStore((s) => s.data);
  const eraId = useAppStore((s) => s.selectedEraId);
  const filter = useAppStore((s) => s.markerFilter);
  const showPbdb = useAppStore((s) => s.showPbdb);
  const setGroups = useAppStore((s) => s.setGroups);
  const setShowReference = useAppStore((s) => s.setShowReference);
  const setShowPbdb = useAppStore((s) => s.setShowPbdb);
  const reverseSearch = useAppStore((s) => s.reverseSearch);
  if (!data) return null;

  const era = data.eras.find((e) => e.id === eraId);
  const groupsHere = [...new Set(data.fossils.filter((f) => f.era_id === eraId).map((f) => f.taxon_group))];
  const toggleGroup = (g: string) => {
    const current = filter.groups.length ? filter.groups : groupsHere;
    const next = current.includes(g) ? current.filter((x) => x !== g) : [...current, g];
    setGroups(next.length === groupsHere.length ? [] : next.length === 0 ? ["__none__"] : next);
  };
  const pbdbHere = data.pbdb.filter((p) => p.era_id === eraId).reduce((s, p) => s + p.n, 0);

  return (
    <aside className="info">
      <section>
        <h3>오늘의 생물에서 거슬러 오르기</h3>
        <div className="species-chips">
          {data.modern.map((m) => (
            <button key={m.id} onClick={() => reverseSearch(m.id)} title={m.scientific_name}>
              {m.name_ko}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>마커 필터</h3>
        <div className="filters">
          {groupsHere.map((g) => (
            <label key={g}>
              <input type="checkbox" checked={filter.groups.length === 0 || filter.groups.includes(g)} onChange={() => toggleGroup(g)} />
              <i style={{ background: GROUPS[g]?.color }} /> {GROUPS[g]?.label ?? g}
            </label>
          ))}
        </div>
        <label>
          <input type="checkbox" checked={filter.showReference} onChange={(e) => setShowReference(e.target.checked)} /> 동아시아 참고 화석 (반투명)
        </label>
        <label>
          <input type="checkbox" checked={showPbdb} onChange={(e) => setShowPbdb(e.target.checked)} disabled={pbdbHere === 0} /> PBDB 산출 기록 점 ({pbdbHere}건)
        </label>
      </section>

      {era?.has_sea_level_slider && (
        <section>
          <h3>해수면</h3>
          <input type="range" min={-130} max={0} value={-120} disabled aria-label="해수면 (준비 중)" />
          <p className="muted">-120m · 수심 그리드(GEBCO) 기반 슬라이더는 Phase 2에서 추가돼요. 지금은 '현재 지도 + 당시 환경'에서 개략 범위를 볼 수 있어요.</p>
        </section>
      )}

      <section className="facts">
        <h3>알아두기</h3>
        <ul>
          {FACTS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
