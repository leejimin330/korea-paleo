import { Map as MLMap, Marker, Popup, setWorkerUrl, type GeoJSONSource, type ImageSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { FeatureCollection } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import { coordFor, GROUPS, visibleFossils } from "../../lib/markers";
import { gridCorners, renderSeaLevel, type BathyGrid } from "../../lib/sealevel";
import { useAppStore } from "../../store/useAppStore";
import type { Era, MapMode } from "../../types";

// Vite 번들/사전번들 환경에서는 MapLibre가 워커 위치를 스스로 찾지 못하므로 직접 지정한다.
setWorkerUrl(workerUrl);

// 지층 전시관 팔레트: 크림색 바다, 황토색 육지, 노란 한반도
const OCEAN = "#F7E7CC";
const LAND = "#DFC296";
const INK = "#4A2E1A";
const AMBER = "#9A5418";

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
      data.set(on ? [154, 84, 24, 210] : [0, 0, 0, 0], (y * size + x) * 4);
    }
  return { width: size, height: size, data };
}

const empty = { type: "FeatureCollection", features: [] } as FeatureCollection;

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
  const setGroups = useAppStore((s) => s.setGroups);
  const setShowReference = useAppStore((s) => s.setShowReference);
  const setShowPbdb = useAppStore((s) => s.setShowPbdb);
  const calloutRef = useRef<Marker | null>(null);
  const seaLevel = useAppStore((s) => s.seaLevel);
  const setSeaLevel = useAppStore((s) => s.setSeaLevel);
  const [bathy, setBathy] = useState<BathyGrid | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selectFossil = useAppStore((s) => s.selectFossil);

  const era = data?.eras.find((e) => e.id === eraId);
  const showSea = !!era?.has_sea_level_slider && mode !== "modern";
  const sea = useMemo(() => (bathy && showSea ? renderSeaLevel(bathy, seaLevel) : null), [bathy, showSea, seaLevel]);
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
    map.on("load", () => {
      map.addImage("hatch", hatchImage());
      for (const id of ["coast", "korea", "env", "pbdb", "fossils"]) map.addSource(id, { type: "geojson", data: empty });
      map.addLayer({ id: "coast", type: "fill", source: "coast", paint: { "fill-color": LAND, "fill-outline-color": LAND } });
      map.addLayer({ id: "env-fill", type: "fill", source: "env", filter: ["!=", ["get", "kind"], "disputed"],
        paint: { "fill-color": ["match", ["get", "kind"], "lake", "#7DB7D6", "sea", "#7CC4C0", "land", "#C9A56C", "#ccc"], "fill-opacity": 0.6 } });
      map.addLayer({ id: "env-disputed", type: "fill", source: "env", filter: ["==", ["get", "kind"], "disputed"], paint: { "fill-pattern": "hatch" } });
      map.addLayer({ id: "env-line", type: "line", source: "env", paint: { "line-color": INK, "line-dasharray": [2, 2], "line-width": 1 } });
      map.addLayer({ id: "korea-fill", type: "fill", source: "korea", paint: { "fill-color": "#FCE18A", "fill-opacity": 0.92 } });
      map.addLayer({ id: "korea-line", type: "line", source: "korea", paint: { "line-color": AMBER, "line-width": 1.6 } });
      map.addLayer({ id: "pbdb", type: "circle", source: "pbdb",
        paint: { "circle-radius": ["interpolate", ["linear"], ["get", "n"], 1, 2.5, 50, 6], "circle-color": "#7F6044", "circle-opacity": 0.55 } });
      map.addLayer({ id: "fossils", type: "circle", source: "fossils",
        paint: {
          "circle-radius": ["case", ["get", "auto"], 5, 7],
          "circle-color": ["get", "color"],
          "circle-opacity": ["case", ["get", "ref"], 0.45, 0.95],
          "circle-stroke-width": ["case", ["get", "ref"], 2, 1.5],
          "circle-stroke-color": ["case", ["get", "ref"], "#74553A", "#FFF6E6"],
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
        // 수작업·대표 화석을 자동 묶음보다 먼저 보여준다.
        const unique = [...new Map(hits.map((h) => [String(h.properties.id), { name: String(h.properties.name), auto: !!h.properties.auto }])).entries()]
          .sort((x, y) => Number(x[1].auto) - Number(y[1].auto))
          .map(([id, v]) => [id, v.name] as const);
        // 너무 많이 겹치면 목록 대신 그 지점으로 확대한다 (클러스터 동작).
        if (unique.length > 8 && map.getZoom() < 9) {
          chooser.remove();
          map.easeTo({ center: e.lngLat, zoom: map.getZoom() + 2, duration: 500 });
          return;
        }
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

  // 해수면: 수심 그리드는 처음 필요할 때 한 번만 받는다.
  useEffect(() => {
    if (!showSea || bathy) return;
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}data/bathymetry.json`)
      .then((r) => r.json() as Promise<BathyGrid>)
      .then((g) => alive && setBathy(g))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [showSea, bathy]);

  // 해수면 이미지: 슬라이더 값마다 그리드를 칠해 이미지 소스로 올린다 (해안선 위, 환경·한반도 윤곽 아래).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (!sea || !bathy) {
      if (map.getLayer("sealevel")) map.setLayoutProperty("sealevel", "visibility", "none");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = sea.width;
    canvas.height = sea.height;
    canvas.getContext("2d")!.putImageData(new ImageData(sea.rgba, sea.width, sea.height), 0, 0);
    const url = canvas.toDataURL();
    const coordinates = gridCorners(bathy);
    const src = map.getSource("sealevel") as ImageSource | undefined;
    if (src) src.updateImage({ url, coordinates });
    else {
      map.addSource("sealevel", { type: "image", url, coordinates });
      map.addLayer({ id: "sealevel", type: "raster", source: "sealevel", paint: { "raster-fade-duration": 0, "raster-resampling": "nearest" } }, "env-fill");
    }
    map.setLayoutProperty("sealevel", "visibility", "visible");
  }, [ready, sea, bathy]);

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
          properties: { id: f.id, name: f.name_ko, color: GROUPS[f.taxon_group]?.color ?? "#555", ref: f.marker_type !== "korea", auto: f.badges.includes("auto_pbdb"), selected: f.id === selectedFossilId },
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

  // 선택된 표본 말풍선 (링 + 이름표)
  useEffect(() => {
    const map = mapRef.current;
    calloutRef.current?.remove();
    calloutRef.current = null;
    const f = fossils.find((x) => x.id === selectedFossilId);
    if (!ready || !map || !f) return;
    const el = document.createElement("div");
    el.className = "callout";
    const ring = document.createElement("div");
    ring.className = "callout-ring";
    const label = document.createElement("div");
    label.className = "callout-label";
    label.textContent = f.name_ko;
    el.append(ring, label);
    const c = coordFor(f, mode);
    calloutRef.current = new Marker({ element: el, anchor: "left", offset: [-17, 0] }).setLngLat([c.lng, c.lat]).addTo(map);
  }, [ready, fossils, selectedFossilId, mode]);

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

  const groupsHere = data ? [...new Set(data.fossils.filter((f) => f.era_id === eraId).map((f) => f.taxon_group))] : [];
  const hasReference = !!data?.fossils.some((f) => f.era_id === eraId && f.marker_type !== "korea");
  const pbdbHere = data ? data.pbdb.filter((p) => p.era_id === eraId).reduce((n, p) => n + p.n, 0) : 0;
  const groupOn = (g: string) => filter.groups.length === 0 || filter.groups.includes(g);
  const toggleGroup = (g: string) => {
    const current = filter.groups.length ? filter.groups : groupsHere;
    const next = current.includes(g) ? current.filter((x) => x !== g) : [...current, g];
    setGroups(next.length === groupsHere.length ? [] : next.length === 0 ? ["__none__"] : next);
  };
  const zoom = (d: number) => mapRef.current?.easeTo({ zoom: mapRef.current.getZoom() + d, duration: 300 });

  return (
    <figure className="map-view">
      <div className="map-frame">
        <div ref={container} className="map-canvas" aria-label="화석 지도" role="region" />

        <div role="group" aria-label="지도 보기 방식" className="map-modes">
          {(Object.keys(MODE_LABELS) as MapMode[]).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} className={mode === m ? "on" : ""} onClick={() => setMapMode(m)}>
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="map-zoom">
          <button type="button" aria-label="확대" onClick={() => zoom(1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <button type="button" aria-label="축소" onClick={() => zoom(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
          </button>
        </div>

        {showSea && (
          <div className="sea-panel">
            <label htmlFor="sea-level">
              해수면 <strong>{seaLevel === 0 ? "오늘" : `${seaLevel}m`}</strong>
            </label>
            <input
              id="sea-level"
              type="range"
              min={-130}
              max={0}
              step={5}
              value={seaLevel}
              onChange={(e) => setSeaLevel(Number(e.target.value))}
              aria-valuetext={`해수면 ${seaLevel}미터`}
            />
            <div className="sea-ticks" aria-hidden="true">
              <span>−130m</span>
              <span className="lgm">최종빙기 −120m</span>
              <span>오늘 0m</span>
            </div>
            <p>
              <i className="swatch" aria-hidden="true" />
              새로 드러난 땅 {!sea ? "계산 중…" : sea.exposedKm2 < 5000 ? "거의 없음" : `약 ${Math.round(sea.exposedKm2 / 10000).toLocaleString()}만 km²`}
            </p>
          </div>
        )}

        {/* 좁은 화면에서는 필터를 접어 두고 버튼으로 펼친다 (CSS에서 넓은 화면은 항상 펼침). */}
        <button
          type="button"
          className="filters-toggle"
          aria-expanded={filtersOpen}
          aria-controls="map-filters"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          필터{filter.groups.length > 0 || !filter.showReference || showPbdb ? " · 적용 중" : ""}
        </button>
        <div id="map-filters" className={`map-filters${filtersOpen ? " open" : ""}`} role="group" aria-label="마커 필터">
          {groupsHere.map((g) => (
            <button key={g} type="button" aria-pressed={groupOn(g)} className={groupOn(g) ? "" : "off"} onClick={() => toggleGroup(g)}>
              <span className="dot" style={{ background: GROUPS[g]?.color }} aria-hidden="true" />
              {GROUPS[g]?.label ?? g}
            </button>
          ))}
          {hasReference && (
            <button type="button" aria-pressed={filter.showReference} className={filter.showReference ? "" : "off"} onClick={() => setShowReference(!filter.showReference)}>
              <span className="dot ref" aria-hidden="true" />
              동아시아 참고 화석
            </button>
          )}
          {pbdbHere > 0 && (
            <button type="button" aria-pressed={showPbdb} className={showPbdb ? "" : "off"} onClick={() => setShowPbdb(!showPbdb)}>
              <span className="dot pbdb" aria-hidden="true" />
              PBDB 산출 기록 {pbdbHere}건
            </button>
          )}
        </div>
      </div>
      <figcaption>
        <span>
          {mode === "paleo"
            ? era && era.age_ma >= 1
              ? `노란 윤곽 = 오늘의 한반도를 ${era.age_ma} Ma 시점으로 되돌린 위치. 판 구조 모델 기반 추정.`
              : "진한 황토색 = 해수면이 낮아져 드러난 땅. 오늘의 수심만으로 계산한 단순 추정이에요 (퇴적·지각 변동 미반영). 빗금 = 대한해협 논쟁 구간."
            : mode === "overlay"
              ? showSea
                ? "진한 황토색 = 해수면이 낮아져 드러난 땅 (오늘의 수심 기준 단순 추정). 빗금 = 대한해협 논쟁 구간."
                : "색칠한 영역은 당시 환경을 손으로 그린 개략도. 빗금 = 학계 논쟁 구간."
              : "마커는 실제 화석 발견지(읍·면 수준의 대략 위치)예요."}
        </span>
        <span className="attribution">고지리 GPlates Web Service · Merdith et al. (2021) CC-BY 4.0 · 윤곽 Natural Earth · 화석 PBDB, 국가유산청{showSea ? " · 수심 NOAA ETOPO1" : ""}</span>
      </figcaption>
    </figure>
  );
}
