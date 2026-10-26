/** 공룡 발자국 세 개: 제목 옆 장식. */
export function Footprints() {
  const track = (
    <>
      <ellipse cx="32" cy="46" rx="10" ry="11" stroke="none" />
      <path d="M32 40V10M28 42L14 18M36 42L50 18" strokeWidth="8" fill="none" />
      <path d="M32 10l0-6M14 18l-3-5M50 18l3-5" strokeWidth="3" fill="none" />
    </>
  );
  return (
    <svg className="footprints" width="168" height="64" viewBox="0 0 168 64" aria-hidden="true">
      <g fill="currentColor" stroke="currentColor" strokeLinecap="round">
        <g transform="translate(6 22) rotate(78 22 22) scale(0.62)" opacity="0.28">{track}</g>
        <g transform="translate(60 0) rotate(102 22 22) scale(0.62)" opacity="0.55">{track}</g>
        <g transform="translate(114 20) rotate(78 22 22) scale(0.62)">{track}</g>
      </g>
    </svg>
  );
}
