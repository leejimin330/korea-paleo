import { useMemo, useState, type CSSProperties } from "react";
import { eraSpecies, filterSpecies, groupCounts, whereLabel, type Region } from "../../lib/catalog";
import { GROUPS } from "../../lib/markers";
import { useAppStore } from "../../store/useAppStore";
import { Photo } from "../Photo/Photo";

/** 처음에는 이만큼만 보이고, 나머지는 "모두 보기"로 펼친다 (지도까지 너무 멀어지지 않게). */
const COLLAPSED = 24;

const REGIONS: { id: Region; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "korea", label: "한반도" },
  { id: "nearby", label: "주변 지역" },
];

/** 생물 도감: 그 시대 생물을 표본 이름표처럼 늘어놓는다. 누르면 지도와 표본 카드로 간다. */
export function Catalog() {
  const all = useAppStore((s) => s.data?.species);
  const eraId = useAppStore((s) => s.selectedEraId);
  const filter = useAppStore((s) => s.catalogFilter);
  const selected = useAppStore((s) => s.selectedSpeciesId);
  const setFilter = useAppStore((s) => s.setCatalogFilter);
  const selectSpecies = useAppStore((s) => s.selectSpecies);
  const [expanded, setExpanded] = useState(false);

  const list = useMemo(() => (all ? eraSpecies(all, eraId) : []), [all, eraId]);
  const inRegion = filterSpecies(list, { region: filter.region, group: null });
  const matching = filterSpecies(list, filter);
  // 접힌 상태에서도 지금 고른 생물은 보이게 한다.
  const shown = expanded ? matching : matching.filter((s, i) => i < COLLAPSED || s.id === selected);
  const groups = groupCounts(inRegion);
  const regionCount = (r: Region) => filterSpecies(list, { region: r, group: null }).length;

  const open = (id: string) => {
    selectSpecies(id);
    document.getElementById("stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="catalog" className="catalog" aria-labelledby="catalog-title">
      <div className="section-head">
        <h2 id="catalog-title">생물 도감</h2>
        <p>
          이 시대에 살았던 생물 {list.length}종이에요. '주변 지역'은 한반도에서는 아직 나오지 않았지만 같은 시대 중국·일본·러시아 극동에서
          나온 생물이에요. 이름을 누르면 지도에서 나온 곳을 보여 줘요.
        </p>
      </div>

      <div className="catalog-filters">
        <div role="group" aria-label="지역" className="segmented">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={filter.region === r.id}
              className={filter.region === r.id ? "on" : ""}
              onClick={() => setFilter({ region: r.id, group: null })}
            >
              {r.label} <span>{regionCount(r.id)}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="무리" className="group-chips">
          <button type="button" aria-pressed={!filter.group} className={!filter.group ? "on" : ""} onClick={() => setFilter({ group: null })}>
            모든 무리
          </button>
          {groups.map(([g, n]) => (
            <button
              key={g}
              type="button"
              aria-pressed={filter.group === g}
              className={filter.group === g ? "on" : ""}
              onClick={() => setFilter({ group: filter.group === g ? null : g })}
            >
              <span className="dot" style={{ background: GROUPS[g]?.color }} aria-hidden="true" />
              {GROUPS[g]?.label ?? g} {n}
            </button>
          ))}
        </div>
      </div>

      {matching.length === 0 ? (
        <p className="catalog-empty">이 조건에 맞는 생물이 없어요. 지역이나 무리 필터를 바꿔 보세요.</p>
      ) : (
        <ul className="labels">
          {shown.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`label${s.region === "nearby" ? " nearby" : ""}${selected === s.id ? " on" : ""}`}
                style={{ "--group": GROUPS[s.taxon_group]?.color ?? "#999" } as CSSProperties}
                aria-pressed={selected === s.id}
                onClick={() => open(s.id)}
              >
                <Photo sci={s.scientific_name} nodeId={s.tree_node_id} size="thumb" alt="" />
                <span className="label-group">{GROUPS[s.taxon_group]?.label ?? s.taxon_group}</span>
                <span className="label-name">{s.name_ko}</span>
                {s.scientific_name && <i className="label-sci">{s.scientific_name}</i>}
                <span className="label-where">{s.region === "nearby" ? `주변 지역 · ${whereLabel(s)}` : s.location.name === "한반도" ? "한반도" : s.location.name.replace(/ \(.*\)$/, "")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {matching.length > COLLAPSED && (
        <button type="button" className="secondary catalog-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "접기" : `모두 보기 (${matching.length}종)`}
        </button>
      )}
    </section>
  );
}
