import { useMemo } from "react";
import { buildLineage } from "../../lib/lineage";
import { formatAgoKo, GROUPS } from "../../lib/markers";
import { useAppStore } from "../../store/useAppStore";
import { Photo } from "../Photo/Photo";

/** 진화 경로: 고른 생물 하나의 계통만, 오래된 시대부터 오늘까지. 아무것도 고르지 않았으면 안내만 보인다. */
export function Lineage() {
  const data = useAppStore((s) => s.data);
  const nodeId = useAppStore((s) => s.selectedTreeNodeId);
  const speciesId = useAppStore((s) => s.selectedSpeciesId);
  const fossilId = useAppStore((s) => s.selectedFossilId);
  const eraId = useAppStore((s) => s.selectedEraId);
  const selectSpecies = useAppStore((s) => s.selectSpecies);

  const items = useMemo(
    () => (data && nodeId ? buildLineage(data.tree, data.species, [...data.eras], nodeId, speciesId) : []),
    [data, nodeId, speciesId],
  );
  if (!data) return null;

  const node = nodeId ? data.tree.byId.get(nodeId) : undefined;
  const title =
    data.species.find((s) => s.id === speciesId)?.name_ko ?? data.fossils.find((f) => f.id === fossilId)?.name_ko ?? node?.name_ko;
  const name = (id: string) => data.tree.byId.get(id)?.name_ko ?? id;

  const open = (id: string) => {
    selectSpecies(id);
    document.getElementById("stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="lineage" className="lineage" aria-labelledby="lineage-title">
      <div className="section-head">
        <h2 id="lineage-title">{node ? `${title}의 진화 경로` : "진화 경로"}</h2>
        <p>
          {node
            ? "위에서 아래로 시간이 흘러요. 조상 무리가 나타난 때와, 전시된 시대마다 이 생물과 가장 가까운 친척을 보여 줘요. 직계 조상이 아니라 공통 조상을 나눈 친척이에요."
            : "도감이나 지도에서 생물을 고르면, 그 생물의 조상 무리와 시대별 친척을 오늘까지 이어서 보여 줘요."}
        </p>
      </div>

      {node && (
        <ol className="path">
          {items.map((it) => {
            if (it.kind === "clade")
              return (
                <li key={`c-${it.node.id}`} className="path-clade">
                  <span className="path-time">{formatAgoKo(it.ma)}</span>
                  <span className="path-mark" aria-hidden="true" />
                  <p>
                    <strong>{it.node.name_ko}</strong> 무리가 나타났어요
                    {it.node.uncertain && <span className="muted"> (시점·위치 논쟁 중)</span>}
                  </p>
                </li>
              );
            if (it.kind === "era")
              return (
                <li key={`e-${it.era.id}`} className={`path-era${it.era.id === eraId ? " current" : ""}${it.relatives.length ? "" : " none"}`}>
                  <span className="path-time">{formatAgoKo(it.ma)}</span>
                  <span className="path-mark" aria-hidden="true" />
                  <div className="path-body">
                    <h3>
                      {it.era.name}
                      {it.shared && <span>{it.here ? "고른 생물이 산 시대" : `공통 무리: ${name(it.shared)}`}</span>}
                    </h3>
                    {it.relatives.length === 0 ? (
                      <p className="muted">이 시대 도감에는 가까운 친척이 없어요.</p>
                    ) : (
                      <ul className="kin">
                        {it.relatives.map(({ species: s }) => (
                          <li key={s.id}>
                            <button type="button" className={s.id === speciesId ? "on" : ""} aria-pressed={s.id === speciesId} onClick={() => open(s.id)}>
                              <Photo sci={s.scientific_name} nodeId={s.tree_node_id} size="thumb" alt="" />
                              <span className="kin-text">
                                <span className="kin-name">{s.name_ko}</span>
                                <span className="kin-meta">
                                  {GROUPS[s.taxon_group]?.label ?? s.taxon_group}
                                  {s.region === "nearby" ? ", 주변 지역" : ""}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                        {it.more > 0 && <li className="kin-more">외 {it.more}종</li>}
                      </ul>
                    )}
                  </div>
                </li>
              );
            return (
              <li key="today" className="path-today">
                <span className="path-time">오늘</span>
                <span className="path-mark" aria-hidden="true" />
                <div className="path-body">
                  <h3>
                    오늘 살아 있는 친척<span>{name(it.pivot)}에서 갈라졌어요</span>
                  </h3>
                  <ul className="kin">
                    {it.modern.map((m) => (
                      <li key={m.id}>
                        <span className="kin-static">
                          <Photo sci={m.name} nodeId={m.id} size="thumb" alt="" />
                          <span className="kin-text">
                            <span className="kin-name">{m.name_ko}</span>
                            <span className="kin-meta">
                              <i>{m.name}</i>
                            </span>
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
