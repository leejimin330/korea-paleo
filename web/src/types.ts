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

export type Badge = "not_dinosaur" | "species_unidentified" | "east_asia_reference" | "trace_fossil" | "disputed";

export type Fossil = {
  id: string;
  name_ko: string;
  scientific_name: string | null;
  taxon_group: string;
  tree_node_id: string;
  fossil_type: "trackway" | "egg" | "skeleton" | "tooth";
  era_id: string;
  age_range_ma: [number, number];
  location: { name: string; modern: LngLat; paleo: LngLat };
  marker_type: "korea" | "east_asia_reference";
  badges: Badge[];
  description: string;
  sources: string[];
  pbdb_nearby: number | null;
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
