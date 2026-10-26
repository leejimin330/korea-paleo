import { imageFor } from "../../lib/lineage";
import { useAppStore } from "../../store/useAppStore";

type Props = { sci: string | null; nodeId: string; size: "card" | "thumb"; alt: string };

/** 위키미디어 공용 사진 + 저작자·라이선스. 그 생물 사진이 없으면 속한 무리의 사진을 쓰고 그렇다고 밝힌다. */
export function Photo({ sci, nodeId, size, alt }: Props) {
  const data = useAppStore((s) => s.data);
  if (!data) return null;
  const hit = imageFor(data.images, data.tree, sci, nodeId);
  if (!hit) return size === "thumb" ? <span className="photo-thumb empty" aria-hidden="true" /> : null;
  const { image, fallback } = hit;

  // 작은 썸네일에서도 무리 사진이면 그렇다고 표시한다 (그 생물 자신으로 오해하지 않게).
  if (size === "thumb")
    return (
      <span className="photo-thumb-wrap">
        <img className="photo-thumb" src={image.thumb} alt="" loading="lazy" decoding="async" />
        {fallback && <span className="photo-tag">{fallback.name_ko} 무리 사진</span>}
      </span>
    );

  return (
    <figure className="photo">
      <img src={image.thumb} alt={fallback ? `${fallback.name_ko} 무리의 대표 사진` : alt} loading="lazy" decoding="async" width={image.width ?? undefined} height={image.height ?? undefined} />
      <figcaption>
        {fallback && <strong>이 생물의 사진이 없어 {fallback.name_ko} 무리의 대표 사진을 보여 줘요. </strong>}
        <a href={image.file_page} target="_blank" rel="noreferrer">
          {image.artist}
        </a>
        , {image.license}, 위키미디어 공용
      </figcaption>
    </figure>
  );
}
