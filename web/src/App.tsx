import { useEffect } from "react";
import { InfoCard } from "./components/InfoCard/InfoCard";
import { MapView } from "./components/MapView/MapView";
import { SpeciesCard } from "./components/SpeciesCard/SpeciesCard";
import { Timeline } from "./components/Timeline/Timeline";
import { TreeView } from "./components/TreeView/TreeView";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const load = useAppStore((s) => s.load);
  const ready = useAppStore((s) => s.data !== null);
  const error = useAppStore((s) => s.loadError);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="status">데이터를 불러오지 못했어요: {error}</p>;
  if (!ready) return <p className="status">불러오는 중…</p>;

  return (
    <div className="app">
      <header className="top">
        <h1>한반도 생명 연대기</h1>
        <p>시간을 거슬러 이 땅에 살았던 생물과, 그 생물이 오늘 어떤 동물로 이어지는지 따라가 보세요.</p>
      </header>
      <Timeline />
      <main className="views">
        <MapView />
        <SpeciesCard />
        <InfoCard />
      </main>
      <TreeView />
      <footer>
        데이터: PBDB · GPlates Web Service (Merdith et al. 2021) · Natural Earth · Open Tree of Life · 국가유산청. 좌표·연대·분기 시점은 모두 대략값이며 모델 기반 추정을 포함해요.
      </footer>
    </div>
  );
}
