export type LngLat = { lat: number; lng: number };

export type Era = {
  id: string;
  name: string;
  period: string;
  age_ma: number;
  range_ma: [number, number];
  description: string;
  highlight: string;
  has_sea_level_slider: boolean;
  view: { paleo: { center: [number, number]; zoom: number }; modern: { center: [number, number]; zoom: number } };
  status: "full" | "preview";
};

export type Badge = "not_dinosaur" | "species_unidentified" | "east_asia_reference" | "trace_fossil" | "disputed" | "auto_pbdb";

export type PbdbTaxon = { name: string; rank: string; pbdb_no: string; n: number };

export type Fossil = {
  id: string;
  name_ko: string;
  scientific_name: string | null;
  taxon_group: string;
  tree_node_id: string;
  fossil_type: "trackway" | "egg" | "skeleton" | "tooth" | "record";
  era_id: string;
  age_range_ma: [number, number];
  location: { name: string; modern: LngLat; paleo: LngLat };
  marker_type: "korea" | "east_asia_reference";
  badges: Badge[];
  description: string;
  sources: string[];
  pbdb_nearby: number | null;
  /** 이 마커에 묶인 PBDB 분류군 (자동 마커·대표종·수작업 사이트 보강). */
  taxa?: PbdbTaxon[];
};

export type TreeNode = {
  id: string;
  name: string;
  name_ko: string;
  kind: "clade" | "modern";
  time_ma: number;
  extinct_ma: number | null;
  uncertain: boolean;
  note: string | null;
  ott_id: number | null;
  children: TreeNode[];
};

export type ModernSpecies = {
  id: string;
  name_ko: string;
  scientific_name: string;
  tree_node_id: string;
  group: string;
};

export type PbdbPoint = {
  era_id: string;
  modern: LngLat;
  paleo: LngLat;
  n: number;
  taxa: string[];
  classes: string[];
};

export type MapMode = "paleo" | "modern" | "overlay";

/** 생물 도감 항목: 수작업 화석지·대표종, 또는 PBDB 속(한반도·주변 지역). fossil_id는 지도 마커. */
export type Species = {
  id: string;
  era_id: string;
  name_ko: string;
  scientific_name: string | null;
  rank: string | null;
  pbdb_no: string | null;
  tree_node_id: string;
  taxon_group: string;
  region: "korea" | "nearby";
  countries: string[];
  n_records: number | null;
  age_range_ma: [number, number];
  location: { name: string; modern: LngLat };
  description: string;
  source: "manual" | "pbdb";
  fossil_id: string;
};

export type Page = "home" | "era" | "timeline";

/** 위키미디어 공용 이미지 (자유 라이선스). */
export type ImageInfo = {
  thumb: string;
  width: number | null;
  height: number | null;
  page: string;
  file_page: string;
  artist: string;
  license: string;
};

/** 과거 지도 시간 슬라이더의 한 시점: 그때 한반도 중심의 [경도, 위도]. */
export type PaleoStep = { t: number; korea: [number, number] };
