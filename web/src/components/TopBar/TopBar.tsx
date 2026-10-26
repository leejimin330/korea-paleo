import { useAppStore } from "../../store/useAppStore";

/** 모든 화면 위의 길잡이: 사이트 이름(메인으로) + 화면 이동. */
export function TopBar() {
  const page = useAppStore((s) => s.page);
  const eraId = useAppStore((s) => s.selectedEraId);
  const navigate = useAppStore((s) => s.navigate);

  const link = (label: string, target: Parameters<typeof navigate>[0], on: boolean) => (
    <a
      href={target.page === "era" ? `#/era/${target.eraId}` : target.page === "timeline" ? "#/timeline" : "#/"}
      aria-current={on ? "page" : undefined}
      className={on ? "on" : ""}
    >
      {label}
    </a>
  );

  return (
    <nav className="topbar" aria-label="화면 이동">
      <a href="#/" className="topbar-home">
        한반도 생명 연대기
      </a>
      <div className="topbar-links">
        {link("메인", { page: "home" }, page === "home")}
        {link("시대 탐험", { page: "era", eraId }, page === "era")}
        {link("연대표", { page: "timeline" }, page === "timeline")}
      </div>
    </nav>
  );
}
