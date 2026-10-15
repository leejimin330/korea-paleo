import { create } from "zustand";
import type { MarkerFilter } from "../lib/markers";
import { josa } from "../lib/josa";
import { indexTree, nearestFossilFor, pathToToday, type TreeIndex } from "../lib/tree";
import type { Era, Fossil, MapMode, ModernSpecies, PbdbPoint, TreeNode } from "../types";

export type AppData = {
  eras: Era[];
  fossils: Fossil[];
  tree: TreeIndex;
  modern: ModernSpecies[];
  pbdb: PbdbPoint[];
};

export type AppState = {
  data: AppData | null;
  loadError: string | null;
  selectedEraId: string;
  selectedFossilId: string | null;
  selectedTreeNodeId: string | null;
  highlightedPath: string[];
  todayPivot: string | null;
  reverseNote: string | null;
  seaLevel: number;
  mapMode: MapMode;
  markerFilter: MarkerFilter;
  showPbdb: boolean;

  load: () => Promise<void>;
  selectEra: (id: string) => void;
  selectFossil: (id: string | null) => void;
  selectTreeNode: (id: string | null) => void;
  connectToToday: (nodeId: string) => void;
  reverseSearch: (speciesId: string) => void;
  setMapMode: (m: MapMode) => void;
  setSeaLevel: (v: number) => void;
  setGroups: (groups: string[]) => void;
  setShowReference: (v: boolean) => void;
  setShowPbdb: (v: boolean) => void;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const clearSelection = { selectedFossilId: null, selectedTreeNodeId: null, highlightedPath: [], todayPivot: null, reverseNote: null };

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
      };

export const useAppStore = create<AppState>((set, get) => ({
  data: null,
  loadError: null,
  selectedEraId: "cretaceous",
  selectedFossilId: null,
  selectedTreeNodeId: null,
  highlightedPath: [],
  todayPivot: null,
  reverseNote: null,
  seaLevel: 0,
  mapMode: "paleo",
  markerFilter: { groups: [], showReference: true },
  showPbdb: false,

  load: async () => {
    try {
      const [eras, fossils, tree, modern, pbdb] = await Promise.all([
        getJson<Era[]>("eras.json"),
        getJson<Fossil[]>("fossils.json"),
        getJson<TreeNode>("tree.json"),
        getJson<ModernSpecies[]>("modern_species.json"),
        getJson<PbdbPoint[]>("pbdb_points.json"),
      ]);
      set({ data: { eras, fossils, tree: indexTree(tree), modern, pbdb } });
    } catch (e) {
      set({ loadError: e instanceof Error ? e.message : String(e) });
    }
  },

  selectEra: (id) => {
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
    const hit = nearestFossilFor(data.tree, data.fossils, sp.tree_node_id);
    if (!hit) {
      set({ ...clearSelection, selectedTreeNodeId: sp.tree_node_id, reverseNote: `${josa(sp.name_ko, "과", "와")} 이어지는 한반도 화석을 아직 찾지 못했어요.` });
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
  },

  setMapMode: (mapMode) => set({ mapMode }),
  setSeaLevel: (seaLevel) => set({ seaLevel }),
  setGroups: (groups) => set({ markerFilter: { ...get().markerFilter, groups } }),
  setShowReference: (showReference) => set({ markerFilter: { ...get().markerFilter, showReference } }),
  setShowPbdb: (showPbdb) => set({ showPbdb }),
}));
