import { useEffect } from "react";
import { Header } from "./components/Header/Header";
import { MapView } from "./components/MapView/MapView";
import { Rails } from "./components/Rails/Rails";
import { SpeciesCard } from "./components/SpeciesCard/SpeciesCard";
import { Timeline } from "./components/Timeline/Timeline";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const load = useAppStore((s) => s.load);
  const ready = useAppStore((s) => s.data !== null);
  const error = useAppStore((s) => s.loadError);

  useEffect(() => {
    load();
  }, [load]);

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
        <p className="eyebrow">KOREAN PENINSULA · 541 MA → TODAY</p>
        <h1>지층을 펼치는 중…</h1>
      </div>
    );

  return (
    <div className="page">
      <div className="wrap">
        <Header />
        <Timeline />
        <section className="stage">
          <MapView />
          <SpeciesCard />
        </section>
        <Rails />
        <footer>
          데이터 · PBDB · GPlates Web Service (Merdith et al. 2021) · Natural Earth · Open Tree of Life · 국가유산청. 좌표·연대·분기 시점은 모두 대략값이며 모델 기반 추정을 포함해요.
        </footer>
      </div>
    </div>
  );
}
