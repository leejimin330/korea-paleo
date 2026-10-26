import { useEffect } from "react";
import { Catalog } from "./components/Catalog/Catalog";
import { ChronologyPage } from "./components/Chronology/ChronologyPage";
import { EraNav } from "./components/EraNav/EraNav";
import { Home } from "./components/Home/Home";
import { Lineage } from "./components/Lineage/Lineage";
import { MapView } from "./components/MapView/MapView";
import { SpeciesCard } from "./components/SpeciesCard/SpeciesCard";
import { TopBar } from "./components/TopBar/TopBar";
import { formatRoute } from "./lib/route";
import { useAppStore } from "./store/useAppStore";

function EraPage() {
  return (
    <main className="era-page">
      <EraNav />
      <Catalog />
      <section id="stage" className="stage" aria-label="화석 지도와 표본 카드">
        <MapView />
        <SpeciesCard />
      </section>
      <Lineage />
    </main>
  );
}

export default function App() {
  const load = useAppStore((s) => s.load);
  const applyHash = useAppStore((s) => s.applyHash);
  const ready = useAppStore((s) => s.data !== null);
  const error = useAppStore((s) => s.loadError);
  const page = useAppStore((s) => s.page);
  const eraId = useAppStore((s) => s.selectedEraId);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onHash = () => applyHash(location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [applyHash]);

  // 화면이 바뀌면 맨 위에서 시작한다. 메인에서 거슬러 올라 화석을 골라 왔으면 지도·표본 카드부터 보여 준다.
  useEffect(() => {
    const stage = page === "era" && useAppStore.getState().selectedFossilId ? document.getElementById("stage") : null;
    if (stage) stage.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0 });
  }, [page, ready]);

  // 화석·현생종 선택으로 시대가 바뀌면 주소만 맞춘다 (뒤로 가기 기록은 남기지 않는다).
  useEffect(() => {
    if (page !== "era") return;
    const hash = formatRoute({ page: "era", eraId });
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }, [page, eraId]);

  if (error)
    return (
      <div className="status" role="alert">
        <h1>데이터를 불러오지 못했어요</h1>
        <p>{error}</p>
        <button type="button" className="primary" onClick={() => location.reload()}>다시 시도</button>
      </div>
    );
  if (!ready)
    return (
      <div className="status" aria-busy="true">
        <h1>지층을 펼치는 중…</h1>
      </div>
    );

  return (
    <div className="page">
      <div className="wrap">
        <TopBar />
        {page === "home" && <Home />}
        {page === "era" && <EraPage />}
        {page === "timeline" && <ChronologyPage />}
        <footer>
          데이터: PBDB, GPlates Web Service (Merdith et al. 2021), Natural Earth, Open Tree of Life, 국가유산청. 좌표·연대·분기 시점은 모두
          대략값이며 모델 기반 추정을 포함해요. '주변 지역' 생물은 PBDB 기록에서 자동으로 골랐어요.
        </footer>
      </div>
    </div>
  );
}
