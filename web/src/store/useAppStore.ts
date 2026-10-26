import { create } from "zustand";
import type { CatalogFilter } from "../lib/catalog";
import type { MarkerFilter } from "../lib/markers";
import { formatRoute, parseHash, type Route } from "../lib/route";
import { josa } from "../lib/josa";
import { indexTree, nearestFossilFor, pathToToday, type TreeIndex } from "../lib/tree";
import type { Era, Fossil, ImageInfo, PaleoStep, MapMode, ModernSpecies, Page, PbdbPoint, Species, TreeNode } from "../types";

export type AppData = {
  eras: Era[];
  fossils: Fossil[];
  tree: TreeIndex;
  modern: ModernSpecies[];
  pbdb: PbdbPoint[];
  species: Species[];
  images: Record<string, ImageInfo>;
  paleoSteps: PaleoStep[];
};

export type AppState = {
  data: AppData | null;
  loadError: string | null;
  page: Page;
  selectedEraId: string;
  selectedSpeciesId: string | null;
  catalogFilter: CatalogFilter;
  selectedFossilId: string | null;
  selectedTreeNodeId: string | null;
  highlightedPath: string[];
  todayPivot: string | null;
  reverseNote: string | null;
  seaLevel: number;
  /** 과거 지도 시간 슬라이더(Ma). null이면 지금 시대의 기준 연대. */
  paleoTime: number | null;
  mapMode: MapMode;
  markerFilter: MarkerFilter;
  showPbdb: boolean;

  load: () => Promise<void>;
  /** 주소(#/era/…)가 바뀌면 화면·시대를 맞춘다. */
  applyHash: (hash: string) => void;
  navigate: (r: Route) => void;
  selectSpecies: (id: string | null) => void;
  setCatalogFilter: (f: Partial<CatalogFilter>) => void;
  selectEra: (id: string) => void;
  selectFossil: (id: string | null) => void;
  selectTreeNode: (id: string | null) => void;
  connectToToday: (nodeId: string) => void;
  reverseSearch: (speciesId: string) => void;
  setMapMode: (m: MapMode) => void;
  setSeaLevel: (v: number) => void;
  setPaleoTime: (t: number | null) => void;
  setGroups: (groups: string[]) => void;
  setShowReference: (v: boolean) => void;
  setShowPbdb: (v: boolean) => void;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const clearSelection = { selectedSpeciesId: null, selectedFossilId: null, selectedTreeNodeId: null, highlightedPath: [], todayPivot: null, reverseNote: null };

/** 시대가 바뀌면 그 시대에 없는 그룹으로 마커가 숨지 않도록 그룹 필터를 초기화한다. */
// 해수면 슬라이더가 있는 시대(빙하기)는 최종빙기 최성기 수준(-120m)에서 시작한다.
export const GLACIAL_SEA_LEVEL = -120;
const eraPatch = (s: AppState, eraId: string) =>
  eraId === s.selectedEraId
    ? { selectedEraId: eraId }
    : {
        selectedEraId: eraId,
        seaLevel: s.data?.eras.find((e) => e.id === eraId)?.has_sea_level_slider ? GLACIAL_SEA_LEVEL : 0,
        markerFilter: { ...s.markerFilter, groups: [] },
        catalogFilter: { ...s.catalogFilter, group: null },
        paleoTime: null,
      };

export const useAppStore = create<AppState>((set, get) => ({
  data: null,
  loadError: null,
  page: parseHash(typeof location === "undefined" ? "" : location.hash).page,
  selectedEraId: parseHash(typeof location === "undefined" ? "" : location.hash).eraId ?? "cretaceous",
  selectedSpeciesId: null,
  catalogFilter: { region: "all", group: null },
  selectedFossilId: null,
  selectedTreeNodeId: null,
  highlightedPath: [],
  todayPivot: null,
  reverseNote: null,
  seaLevel: 0,
  paleoTime: null,
  mapMode: "paleo",
  markerFilter: { groups: [], showReference: true },
  showPbdb: false,

  load: async () => {
    try {
      const [eras, fossils, tree, modern, pbdb, species, images, paleoSteps] = await Promise.all([
        getJson<Era[]>("eras.json"),
        getJson<Fossil[]>("fossils.json"),
        getJson<TreeNode>("tree.json"),
        getJson<ModernSpecies[]>("modern_species.json"),
        getJson<PbdbPoint[]>("pbdb_points.json"),
        getJson<Species[]>("species.json"),
        getJson<Record<string, ImageInfo>>("images.json"),
        getJson<PaleoStep[]>("paleo_steps.json"),
      ]);
      // 주소에 없는 시대 id가 오면 메인으로 돌린다.
      const { page, selectedEraId } = get();
      if (page === "era" && !eras.some((e) => e.id === selectedEraId)) {
        set({ page: "home", selectedEraId: "cretaceous" });
        history.replaceState(null, "", formatRoute({ page: "home" }));
      }
      // 주소로 바로 들어온 시대에 해수면 슬라이더가 있으면 시대를 고를 때처럼 빙기 해수면에서 시작한다.
      const startEra = eras.find((e) => e.id === get().selectedEraId);
      set({
        data: { eras, fossils, tree: indexTree(tree), modern, pbdb, species, images, paleoSteps },
        seaLevel: startEra?.has_sea_level_slider ? GLACIAL_SEA_LEVEL : 0,
      });
    } catch (e) {
      set({ loadError: e instanceof Error ? e.message : String(e) });
    }
  },

  applyHash: (hash) => {
    const r = parseHash(hash);
    const { data } = get();
    if (r.page === "era" && r.eraId && data && !data.eras.some((e) => e.id === r.eraId)) {
      history.replaceState(null, "", formatRoute({ page: "home" }));
      return set({ page: "home" });
    }
    if (r.page === "era" && r.eraId && r.eraId !== get().selectedEraId) set({ ...eraPatch(get(), r.eraId), ...clearSelection });
    set({ page: r.page });
  },

  navigate: (r) => {
    const hash = formatRoute(r);
    if (location.hash !== hash) location.hash = hash;
    else get().applyHash(hash);
  },

  selectSpecies: (id) => {
    const sp = id ? get().data?.species.find((s) => s.id === id) : undefined;
    if (!sp) return set(clearSelection);
    get().selectFossil(sp.fossil_id);
    set({ selectedSpeciesId: sp.id, selectedTreeNodeId: sp.tree_node_id });
  },

  setCatalogFilter: (f) => set({ catalogFilter: { ...get().catalogFilter, ...f } }),

  selectEra: (id) => {
    if (get().page === "era") return get().navigate({ page: "era", eraId: id });
    if (id === get().selectedEraId) return;
    set({ ...eraPatch(get(), id), ...clearSelection });
  },

  selectFossil: (id) => {
    const fossil = id ? get().data?.fossils.find((f) => f.id === id) : undefined;
    if (!fossil) return set(clearSelection);
    set({
      ...clearSelection,
      selectedFossilId: fossil.id,
      selectedTreeNodeId: fossil.tree_node_id,
      // 생물 하나짜리 마커(주변 지역 속 등)는 지도에서 눌러도 도감 항목으로 보여 준다.
      selectedSpeciesId: get().data?.species.find((x) => x.id === fossil.id)?.id ?? null,
      ...eraPatch(get(), fossil.era_id),
    });
  },

  /** 계통수 노드 클릭: 그 노드에 연결된 화석이 현재 시대에 있으면 함께 선택 (지도 이동). */
  selectTreeNode: (id) => {
    const { data, selectedEraId } = get();
    if (!id || !data) return set(clearSelection);
    const linked =
      data.fossils.find((f) => f.tree_node_id === id && f.era_id === selectedEraId) ??
      data.fossils.find((f) => f.tree_node_id === id);
    set({
      ...clearSelection,
      selectedTreeNodeId: id,
      selectedFossilId: linked?.id ?? null,
      ...eraPatch(get(), linked?.era_id ?? selectedEraId),
    });
  },

  connectToToday: (nodeId) => {
    const data = get().data;
    if (!data) return;
    const p = pathToToday(data.tree, nodeId);
    set({ highlightedPath: p?.nodes ?? [], todayPivot: p?.pivot ?? null, selectedTreeNodeId: nodeId });
  },

  reverseSearch: (speciesId) => {
    const data = get().data;
    const sp = data?.modern.find((m) => m.id === speciesId);
    if (!data || !sp) return;
    // 한반도 화석을 먼저 찾고, 없으면 주변 지역까지 넓힌다.
    const hit =
      nearestFossilFor(data.tree, data.fossils.filter((f) => f.marker_type === "korea"), sp.tree_node_id) ??
      nearestFossilFor(data.tree, data.fossils, sp.tree_node_id);
    if (!hit) {
      set({ ...clearSelection, selectedTreeNodeId: sp.tree_node_id, reverseNote: `${josa(sp.name_ko, "과", "와")} 이어지는 한반도 화석을 아직 찾지 못했어요.` });
      get().navigate({ page: "era", eraId: get().selectedEraId });
      return;
    }
    const p = pathToToday(data.tree, hit.fossil.tree_node_id);
    const shared = data.tree.byId.get(hit.sharedAncestor);
    set({
      ...clearSelection,
      ...eraPatch(get(), hit.fossil.era_id),
      selectedFossilId: hit.fossil.id,
      selectedTreeNodeId: sp.tree_node_id,
      highlightedPath: p?.nodes ?? [],
      todayPivot: p?.pivot ?? null,
      reverseNote: `${josa(sp.name_ko, "과", "와")} ${josa(`「${hit.fossil.name_ko}」`, "은", "는")} ${shared?.name_ko ?? hit.sharedAncestor} 계통을 공유하는 친척이에요.`,
    });
    // 메인에서 찾았으면 그 화석이 있는 시대 화면으로 간다 (같은 시대라 선택은 유지된다).
    get().navigate({ page: "era", eraId: hit.fossil.era_id });
  },

  setMapMode: (mapMode) => set({ mapMode }),
  setSeaLevel: (seaLevel) => set({ seaLevel }),
  setPaleoTime: (paleoTime) => set({ paleoTime }),
  setGroups: (groups) => set({ markerFilter: { ...get().markerFilter, groups } }),
  setShowReference: (showReference) => set({ markerFilter: { ...get().markerFilter, showReference } }),
  setShowPbdb: (showPbdb) => set({ showPbdb }),
}));
