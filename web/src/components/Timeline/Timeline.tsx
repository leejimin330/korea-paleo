import { formatAgoKo, formatMa } from "../../lib/markers";
import { useAppStore } from "../../store/useAppStore";

/** 시대 단위로 스냅하는 타임라인. 왼쪽이 과거. */
export function Timeline() {
  const eras = useAppStore((s) => s.data?.eras ?? []);
  const selected = useAppStore((s) => s.selectedEraId);
  const selectEra = useAppStore((s) => s.selectEra);
  const sorted = [...eras].sort((a, b) => b.age_ma - a.age_ma);
  const idx = Math.max(0, sorted.findIndex((e) => e.id === selected));
  const era = sorted[idx];

  return (
    <section className="timeline" aria-label="시대 선택">
      <input
        type="range"
        min={0}
        max={Math.max(0, sorted.length - 1)}
        step={1}
        value={idx}
        onChange={(e) => selectEra(sorted[Number(e.target.value)].id)}
        aria-valuetext={era?.name}
      />
      <ol className="timeline-stops">
        {sorted.map((e) => (
          <li key={e.id}>
            <button className={e.id === selected ? "active" : ""} onClick={() => selectEra(e.id)}>
              <strong>{e.name}</strong>
              <span>
                {formatAgoKo(e.age_ma)} · {formatMa(e.age_ma)}
              </span>
              {e.status === "preview" && <em className="chip">미리보기</em>}
            </button>
          </li>
        ))}
      </ol>
      {era && (
        <p className="timeline-caption">
          <b>{era.period}</b> — {era.description}. <span className="highlight">{era.highlight}</span>
        </p>
      )}
    </section>
  );
}
