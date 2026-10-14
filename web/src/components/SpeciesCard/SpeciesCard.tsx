import { BADGES, FOSSIL_TYPES, GROUPS } from "../../lib/markers";
import { ancestorsOf, pathToToday } from "../../lib/tree";
import { useAppStore } from "../../store/useAppStore";

export function SpeciesCard() {
  const data = useAppStore((s) => s.data);
  const fossilId = useAppStore((s) => s.selectedFossilId);
  const nodeId = useAppStore((s) => s.selectedTreeNodeId);
  const pivot = useAppStore((s) => s.todayPivot);
  const reverseNote = useAppStore((s) => s.reverseNote);
  const connectToToday = useAppStore((s) => s.connectToToday);
  if (!data) return null;

  const fossil = data.fossils.find((f) => f.id === fossilId);
  const node = nodeId ? data.tree.byId.get(nodeId) : undefined;
  const startNodeId = fossil?.tree_node_id ?? node?.id;
  const today = pivot && startNodeId ? pathToToday(data.tree, startNodeId) : null;

  if (!fossil && !node) {
    return (
      <aside className="card empty">
        <h2>생물 카드</h2>
        <p>지도에서 화석 마커를 누르거나, 계통수에서 가지를 눌러 보세요.</p>
        <p className="hint">예: 백악기 → 「고성 수각류 발자국」 → 오늘로 이어보기</p>
      </aside>
    );
  }

  const lineage = startNodeId
    ? ancestorsOf(data.tree, startNodeId).slice(1, 4).map((id) => data.tree.byId.get(id)!.name_ko).reverse()
    : [];

  return (
    <aside className="card" aria-live="polite">
      {reverseNote && <p className="reverse-note">{reverseNote}</p>}
      {fossil ? (
        <>
          <h2>{fossil.name_ko}</h2>
          {fossil.scientific_name && <p className="sci">{fossil.scientific_name}</p>}
          <div className="badges">
            <span className="chip" style={{ background: GROUPS[fossil.taxon_group]?.color }}>{GROUPS[fossil.taxon_group]?.label ?? fossil.taxon_group}</span>
            {fossil.badges.map((b) => (
              <span key={b} className={`badge badge-${b}`} title={BADGES[b].hint}>{BADGES[b].label}</span>
            ))}
          </div>
          <dl>
            <dt>분류 위치</dt>
            <dd>{[...lineage, data.tree.byId.get(fossil.tree_node_id)?.name_ko].filter(Boolean).join(" › ")}</dd>
            <dt>생존 시기</dt>
            <dd>{fossil.age_range_ma[0]}–{fossil.age_range_ma[1]} Ma (대략)</dd>
            <dt>화석 종류</dt>
            <dd>{FOSSIL_TYPES[fossil.fossil_type]}</dd>
            <dt>발견지</dt>
            <dd>
              {fossil.location.name} <span className="muted">({fossil.location.modern.lat.toFixed(2)}, {fossil.location.modern.lng.toFixed(2)}, 대략)</span>
            </dd>
            {fossil.pbdb_nearby != null && (
              <>
                <dt>PBDB 기록</dt>
                <dd>반경 15km 내 같은 시대 산출 기록 {fossil.pbdb_nearby}건</dd>
              </>
            )}
          </dl>
          <p>{fossil.description}</p>
          <p className="sources">출처: {fossil.sources.join(" · ")}</p>
        </>
      ) : (
        node && (
          <>
            <h2>{node.name_ko}</h2>
            <p className="sci">{node.name}</p>
            <div className="badges">
              {node.kind === "modern" && <span className="chip">현생종</span>}
              {node.extinct_ma != null && <span className="badge">멸종 ({node.extinct_ma} Ma)</span>}
              {node.uncertain && <span className="badge badge-disputed">논쟁 중</span>}
            </div>
            <dl>
              <dt>분류 위치</dt>
              <dd>{lineage.join(" › ") || "—"}</dd>
              {node.kind !== "modern" && (
                <>
                  <dt>등장 시기</dt>
                  <dd>약 {node.time_ma} Ma (대략)</dd>
                </>
              )}
            </dl>
            {node.note && <p>{node.note}</p>}
            <p className="sources">출처: 분기 시점은 문헌 기반 대략값{node.ott_id ? ` · Open Tree ott${node.ott_id}` : ""}</p>
          </>
        )
      )}

      {startNodeId && (fossil || node?.kind !== "modern") && (
        <button className="primary" onClick={() => connectToToday(startNodeId)}>
          오늘로 이어보기 →
        </button>
      )}
      {today && (
        <div className="today">
          <p>
            <b>{data.tree.byId.get(today.pivot)?.name_ko}</b>에서 갈라져 오늘까지 이어진 친척:{" "}
            {today.modern.map((id) => data.tree.byId.get(id)!.name_ko).join(", ")}
          </p>
          <p className="caution">※ 직계 조상이 아니라, 공통 조상에서 갈라진 친척 관계예요.</p>
        </div>
      )}
    </aside>
  );
}
