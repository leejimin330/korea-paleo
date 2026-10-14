import { AttributionControl, Map as MLMap, NavigationControl, Popup, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useMemo, useRef, useState } from "react";
import { coordFor, GROUPS, visibleFossils } from "../../lib/markers";
import { useAppStore } from "../../store/useAppStore";
import type { Era, MapMode } from "../../types";

// Vite 번들/사전번들 환경에서는 MapLibre가 워커 위치를 스스로 찾지 못하므로 직접 지정한다.
setWorkerUrl(workerUrl);

const OCEAN = "#a9cfe0";
const LAND = "#e8dcc0";
const ATTRIBUTION =
  "고지리: GPlates Web Service · Merdith et al. (2021) CC-BY 4.0 | 한반도 윤곽: Natural Earth | 화석 기록: PBDB, 국가유산청";

const MODE_LABELS: Record<MapMode, string> = {
  paleo: "과거 지도 (판 복원)",
  modern: "현재 지도",
  overlay: "현재 지도 + 당시 환경",
};

/** 지도에 그릴 해안선 연대: 과거 모드만 시대 연대를 쓴다 (빙하기는 판 이동이 무시할 수준이라 0). */
function coastTime(era: Era, mode: MapMode) {
  return mode === "paleo" ? (era.age_ma >= 1 ? era.age_ma : 0) : 0;
}

function hatchImage() {
  const size = 8;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const on = (x + y) % size < 2;
      data.set(on ? [200, 60, 60, 200] : [0, 0, 0, 0], (y * size + x) * 4);
    }
  return { width: size, height: size, data };
}

const empty = { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection;

export function MapView() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);

  const data = useAppStore((s) => s.data);
  const eraId = useAppStore((s) => s.selectedEraId);
  const mode = useAppStore((s) => s.mapMode);
  const filter = useAppStore((s) => s.markerFilter);
  const selectedFossilId = useAppStore((s) => s.selectedFossilId);
  const showPbdb = useAppStore((s) => s.showPbdb);
  const setMapMode = useAppStore((s) => s.setMapMode);
  const selectFossil = useAppStore((s) => s.selectFossil);

  const era = data?.eras.find((e) => e.id === eraId);
  const fossils = useMemo(() => (data ? visibleFossils(data.fossils, eraId, filter) : []), [data, eraId, filter]);

  // 지도 생성 (한 번)
  useEffect(() => {
    if (!container.current) return;
    const map = new MLMap({
      container: container.current,
      style: { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": OCEAN } }] },
      center: [137, 43],
      zoom: 3,
      attributionControl: false,
      renderWorldCopies: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new AttributionControl({ compact: true, customAttribution: ATTRIBUTION }), "bottom-right");
    map.on("load", () => {
      map.addImage("hatch", hatchImage());
      for (const id of ["coast", "korea", "env", "pbdb", "fossils"]) map.addSource(id, { type: "geojson", data: empty });
      map.addLayer({ id: "coast", type: "fill", source: "coast", paint: { "fill-color": LAND, "fill-outline-color": LAND } });
      map.addLayer({ id: "env-fill", type: "fill", source: "env", filter: ["!=", ["get", "kind"], "disputed"],
        paint: { "fill-color": ["match", ["get", "kind"], "lake", "#4dabf7", "sea", "#3bc9db", "land", "#d8c48f", "#ccc"], "fill-opacity": 0.55 } });
      map.addLayer({ id: "env-disputed", type: "fill", source: "env", filter: ["==", ["get", "kind"], "disputed"], paint: { "fill-pattern": "hatch" } });
      map.addLayer({ id: "env-line", type: "line", source: "env", paint: { "line-color": "#495057", "line-dasharray": [2, 2], "line-width": 1 } });
      map.addLayer({ id: "korea-fill", type: "fill", source: "korea", paint: { "fill-color": "#ffd43b", "fill-opacity": 0.35 } });
      map.addLayer({ id: "korea-line", type: "line", source: "korea", paint: { "line-color": "#e67700", "line-width": 2 } });
      map.addLayer({ id: "pbdb", type: "circle", source: "pbdb",
        paint: { "circle-radius": ["interpolate", ["linear"], ["get", "n"], 1, 2.5, 50, 6], "circle-color": "#495057", "circle-opacity": 0.6 } });
      map.addLayer({ id: "fossils", type: "circle", source: "fossils",
        paint: {
          "circle-radius": ["case", ["get", "selected"], 11, 7],
          "circle-color": ["get", "color"],
          "circle-opacity": ["case", ["get", "ref"], 0.45, 0.95],
          "circle-stroke-width": ["case", ["get", "selected"], 3, 1.5],
          "circle-stroke-color": ["case", ["get", "selected"], "#212529", ["get", "ref"], "#868e96", "#ffffff"],
        } });
      const tip = new Popup({ closeButton: false, closeOnClick: false, offset: 10 });
      map.on("mouseenter", "fossils", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (f) tip.setLngLat(e.lngLat).setText(String(f.properties.name)).addTo(map);
      });
      map.on("mouseleave", "fossils", () => {
        map.getCanvas().style.cursor = "";
        tip.remove();
      });
      // 가까운 화석지는 축척에 따라 겹치므로, 클릭 지점에 여럿이면 목록에서 고르게 한다.
      const chooser = new Popup({ closeButton: true, offset: 12, className: "marker-chooser" });
      map.on("click", "fossils", (e) => {
        const { x, y } = e.point;
        const hits = map.queryRenderedFeatures([[x - 8, y - 8], [x + 8, y + 8]], { layers: ["fossils"] });
        const unique = [...new Map(hits.map((h) => [String(h.properties.id), String(h.properties.name)])).entries()];
        if (unique.length === 1) {
          chooser.remove();
          selectFossil(unique[0][0]);
          return;
        }
        const box = document.createElement("div");
        const head = document.createElement("p");
        head.textContent = `이 지점의 화석 ${unique.length}곳`;
        box.append(head);
        for (const [id, name] of unique) {
          const b = document.createElement("button");
          b.textContent = name;
          b.dataset.fossilId = id;
          b.onclick = () => {
            chooser.remove();
            selectFossil(id);
          };
          box.append(b);
        }
        tip.remove();
        chooser.setLngLat(e.lngLat).setDOMContent(box).addTo(map);
      });
      map.on("mouseenter", "pbdb", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const taxa = JSON.parse(String(f.properties.taxa)) as string[];
        tip.setLngLat(e.lngLat).setText(`PBDB 기록 ${f.properties.n}건: ${taxa.slice(0, 3).join(", ")}`).addTo(map);
      });
      map.on("mouseleave", "pbdb", () => tip.remove());
      setReady(true);
    });
    mapRef.current = map;
    if (import.meta.env.DEV) (window as unknown as { __map?: MLMap }).__map = map; // 브라우저 검증용
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [selectFossil]);

  // 배경 (해안선·한반도 윤곽·당시 환경)
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !era) return;
    const t = coastTime(era, mode);
    const base = `${import.meta.env.BASE_URL}data/`;
    (map.getSource("coast") as GeoJSONSource).setData(`${base}maps/coastlines_${t}ma.geojson`);
    (map.getSource("korea") as GeoJSONSource).setData(`${base}outlines/korea_${t}ma.geojson`);
    const showEnv = mode === "overlay" || (mode === "paleo" && t === 0);
    (map.getSource("env") as GeoJSONSource).setData(showEnv ? `${base}environments.geojson` : empty);
    map.setFilter("env-fill", ["all", ["==", ["get", "era_id"], era.id], ["!=", ["get", "kind"], "disputed"]]);
    map.setFilter("env-disputed", ["all", ["==", ["get", "era_id"], era.id], ["==", ["get", "kind"], "disputed"]]);
    map.setFilter("env-line", ["==", ["get", "era_id"], era.id]);
    const view = mode === "paleo" ? era.view.paleo : era.view.modern;
    map.flyTo({ center: view.center, zoom: view.zoom, duration: 900 });
  }, [ready, era, mode]);

  // 화석 마커
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("fossils") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: fossils.map((f) => {
        const c = coordFor(f, mode);
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [c.lng, c.lat] },
          properties: { id: f.id, name: f.name_ko, color: GROUPS[f.taxon_group]?.color ?? "#555", ref: f.marker_type !== "korea", selected: f.id === selectedFossilId },
        };
      }),
    });
  }, [ready, fossils, mode, selectedFossilId]);

  // 선택된 화석으로 이동
  useEffect(() => {
    const map = mapRef.current;
    const f = data?.fossils.find((x) => x.id === selectedFossilId);
    if (!ready || !map || !f) return;
    const c = coordFor(f, mode);
    if (!map.getBounds().contains([c.lng, c.lat])) map.easeTo({ center: [c.lng, c.lat], duration: 700 });
  }, [ready, data, selectedFossilId, mode]);

  // PBDB 기록 점
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !data) return;
    const pts = showPbdb ? data.pbdb.filter((p) => p.era_id === eraId) : [];
    (map.getSource("pbdb") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: pts.map((p) => {
        const c = coordFor({ location: { modern: p.modern, paleo: p.paleo } }, mode);
        return { type: "Feature", geometry: { type: "Point", coordinates: [c.lng, c.lat] }, properties: { n: p.n, taxa: p.taxa } };
      }),
    });
  }, [ready, data, eraId, showPbdb, mode]);

  return (
    <section className="map-view" aria-label="지도">
      <div className="map-modes" role="radiogroup" aria-label="지도 모드">
        {(Object.keys(MODE_LABELS) as MapMode[]).map((m) => (
          <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? "active" : ""} onClick={() => setMapMode(m)}>
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
      <div ref={container} className="map-canvas" />
      <p className="map-note">
        {mode === "paleo"
          ? era && era.age_ma >= 1
            ? `노란 윤곽 = 오늘의 한반도를 ${era.age_ma}Ma 시점으로 되돌린 위치. 판 구조 모델 기반 추정이에요.`
            : "빙하기에는 판 위치가 지금과 거의 같아요. 해수면 슬라이더는 다음 단계(Phase 2)에서 추가돼요."
          : mode === "overlay"
            ? "색칠한 영역은 당시 환경을 손으로 그린 개략도예요. 빗금 = 학계 논쟁 구간."
            : "마커는 실제 화석 발견지(대략적인 읍·면 위치)예요."}
      </p>
    </section>
  );
}
