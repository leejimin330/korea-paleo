import { whereLabel } from "../../lib/catalog";
import { BADGES, FOSSIL_TYPES, formatMa, GROUPS } from "../../lib/markers";
import { ancestorsOf, pathToToday } from "../../lib/tree";
import { useAppStore } from "../../store/useAppStore";
import { Photo } from "../Photo/Photo";
import type { Fossil } from "../../types";

const FACTS = [
  "수장룡·어룡·모사사우루스·익룡은 공룡이 아니에요.",
  "새는 수각류 공룡에서 갈라져 나온 계통이에요.",
  "고래는 육지 포유류가 다시 바다로 돌아간 경우예요.",
  "고지리 지도는 판 구조 모델 기반 추정이에요.",
];

function EmptyState() {
  return (
    <div className="specimen-body empty">
      <div className="specimen-placeholder" aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M32 8c-8 10-8 38 0 48M32 8c8 10 8 38 0 48" />
          <path d="M14 20c10 4 26 4 36 0M12 32h40M14 44c10-4 26-4 36 0" />
        </svg>
      </div>
      <h3>표본을 골라 보세요</h3>
      <p>위의 생물 도감에서 이름을 누르거나, 지도에서 화석 마커를 누르면 여기에 표본 카드가 열려요.</p>
    </div>
  );
}

const PBDB_TAXON_URL = "https://paleobiodb.org/classic/checkTaxonInfo?taxon_no=";
const RANK_KO: Record<string, string> = { species: "종", subspecies: "아종", genus: "속", subgenus: "아속" };

/** 이 마커에 묶인 PBDB 분류군 목록. 대표종처럼 자기 자신 하나뿐이면 생략. */
function TaxaList({ fossil }: { fossil: Fossil }) {
  const taxa = fossil.taxa ?? [];
  if (taxa.length === 0 || (taxa.length === 1 && taxa[0].name === fossil.scientific_name)) return null;
  const items = taxa.map((t) => (
    <li key={t.name}>
      <a href={`${PBDB_TAXON_URL}${t.pbdb_no}`} target="_blank" rel="noreferrer">
        <i>{t.name}</i>
      </a>
      <span>
        {RANK_KO[t.rank] ?? t.rank} · {t.n}건
      </span>
    </li>
  ));
  const label = fossil.badges.includes("auto_pbdb") ? "묶인 분류군" : "이 지점의 PBDB 분류군";
  return taxa.length <= 6 ? (
    <div className="taxa">
      <h4>{label} {taxa.length}</h4>
      <ul>{items}</ul>
    </div>
  ) : (
    <details className="taxa">
      <summary>
        <h4>{label} {taxa.length}</h4>
        <span>펼치기</span>
      </summary>
      <ul>{items}</ul>
    </details>
  );
}

/** 표본 카드: 선택된 화석(또는 계통 노드)의 사진·정보와 진화 경로로 가는 버튼. */
export function SpeciesCard() {
  const data = useAppStore((s) => s.data);
  const eraId = useAppStore((s) => s.selectedEraId);
  const fossilId = useAppStore((s) => s.selectedFossilId);
  const nodeId = useAppStore((s) => s.selectedTreeNodeId);
  const reverseNote = useAppStore((s) => s.reverseNote);
  const speciesId = useAppStore((s) => s.selectedSpeciesId);
  const connectToToday = useAppStore((s) => s.connectToToday);
  if (!data) return null;

  const era = data.eras.find((e) => e.id === eraId);
  const fossil = data.fossils.find((f) => f.id === fossilId);
  // 도감에서 고른 생물이면 그 생물을 제목으로 쓰고, 마커(화석지)는 "나온 곳"으로 보여 준다.
  const species = data.species.find((x) => x.id === speciesId && x.fossil_id === fossilId);
  const hostIsCluster = !!species && !!fossil && species.source === "pbdb" && fossil.id !== species.id;
  const node = nodeId ? data.tree.byId.get(nodeId) : undefined;
  const startNodeId = fossil?.tree_node_id ?? node?.id;
  const startNode = startNodeId ? data.tree.byId.get(startNodeId) : undefined;
  const today = startNodeId && startNode?.kind !== "modern" ? pathToToday(data.tree, startNodeId) : null;
  const name = (id: string) => data.tree.byId.get(id)?.name_ko ?? id;
  const lineage = startNodeId ? ancestorsOf(data.tree, startNodeId).slice(0, 4).reverse().map(name) : [];

  const onConnect = () => {
    if (!startNodeId) return;
    connectToToday(startNodeId);
    document.getElementById("lineage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <aside className="specimen" aria-label="표본 카드" aria-live="polite">
      <div className="specimen-head">
        <span>SPECIMEN · 표본 카드</span>
        <span>{era ? `ERA · ${formatMa(era.age_ma).toUpperCase()}` : ""}</span>
      </div>

      {!fossil && !node ? (
        <EmptyState />
      ) : (
        <div className="specimen-body">
          {reverseNote && <p className="banner">{reverseNote}</p>}
          {startNodeId && (
            <Photo sci={species?.scientific_name ?? fossil?.scientific_name ?? (fossil ? null : (node?.name ?? null))} nodeId={startNodeId} size="card" alt={`${species?.name_ko ?? fossil?.name_ko ?? node?.name_ko} 사진`} />
          )}
          <div className="specimen-title">
            <h3>{species?.name_ko ?? fossil?.name_ko ?? node?.name_ko}</h3>
            {(species?.scientific_name ?? fossil?.scientific_name ?? (fossil ? null : node?.name)) && (
              <p className="sci">{species?.scientific_name ?? fossil?.scientific_name ?? node?.name}</p>
            )}
            <div className="tags">
              {fossil && (
                <span className="tag">
                  <span className="dot" style={{ background: GROUPS[fossil.taxon_group]?.color }} aria-hidden="true" />
                  {GROUPS[fossil.taxon_group]?.label ?? fossil.taxon_group}
                </span>
              )}
              {hostIsCluster && species?.region === "nearby" && <span className="badge badge-east_asia_reference" title={BADGES.east_asia_reference.hint}>{BADGES.east_asia_reference.label}</span>}
              {fossil?.badges.map((b) => (
                <span key={b} className={`badge badge-${b}`} title={BADGES[b].hint}>
                  {BADGES[b].label}
                </span>
              ))}
              {!fossil && node?.kind === "modern" && <span className="tag">현생종</span>}
              {!fossil && node?.extinct_ma != null && <span className="badge">멸종 · {node.extinct_ma} Ma</span>}
              {!fossil && node?.uncertain && <span className="badge badge-disputed">논쟁 중</span>}
            </div>
          </div>

          <dl>
            <dt>분류 위치</dt>
            <dd>{lineage.join(" › ") || "—"}</dd>
            {fossil ? (
              <>
                <dt>생존 시기</dt>
                <dd>{(species ?? fossil).age_range_ma[0]}–{(species ?? fossil).age_range_ma[1]} Ma (대략)</dd>
                {species?.source === "pbdb" && (
                  <>
                    <dt>나온 곳</dt>
                    <dd>
                      {whereLabel(species)}
                      {species.n_records != null && <span className="mono-sub">PBDB 산출 기록 {species.n_records}건</span>}
                    </dd>
                  </>
                )}
                {species?.source !== "pbdb" && (
                  <>
                    <dt>화석 종류</dt>
                    <dd>{FOSSIL_TYPES[fossil.fossil_type]}</dd>
                  </>
                )}
                <dt>{hostIsCluster ? "지도 마커" : species?.source === "pbdb" ? "대표 위치" : "발견지"}</dt>
                <dd>
                  {fossil.location.name}
                  <span className="mono-sub">
                    {fossil.location.modern.lat.toFixed(2)}, {fossil.location.modern.lng.toFixed(2)} · 대략
                  </span>
                </dd>
                {fossil.pbdb_nearby != null && (
                  <>
                    <dt>PBDB 기록</dt>
                    <dd>반경 15km 내 같은 시대 산출 기록 {fossil.pbdb_nearby}건</dd>
                  </>
                )}
              </>
            ) : (
              node &&
              node.kind !== "modern" && (
                <>
                  <dt>등장 시기</dt>
                  <dd>약 {node.time_ma} Ma (대략)</dd>
                </>
              )
            )}
          </dl>

          {species ? (
            <p className="desc">{species.description}</p>
          ) : fossil ? (
            <p className="desc">{fossil.description}</p>
          ) : (
            node?.note && <p className="desc">{node.note}</p>
          )}
          {fossil && <TaxaList fossil={fossil} />}
          <p className="source">
            출처 · {fossil ? fossil.sources.join(" · ") : `분기 시점은 문헌 기반 대략값${node?.ott_id ? ` · Open Tree ott${node.ott_id}` : ""}`}
          </p>

          {today && (
            <div className="specimen-actions">
              <div className="relatives">
                <span>{name(today.pivot)}에서 갈라져 오늘까지 이어진 친척</span>
                <strong>{today.modern.map(name).join(" · ")}</strong>
                <span>직계 조상이 아니라, 공통 조상에서 갈라진 친척 관계예요.</span>
              </div>
              <button type="button" className="primary" onClick={onConnect}>
                진화 경로 보기
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      <details className="facts">
        <summary>
          알아두기 <span>{FACTS.length} +</span>
        </summary>
        <ul>
          {FACTS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </details>
    </aside>
  );
}
