/** 국제층서위원회(ICS) 기준 지질시대(기) 경계, Ma. 색은 디자인 시안 기준. */
export type Period = { id: string; name: string; from: number; to: number; color: string };

export const PERIODS: Period[] = [
  { id: "C", name: "캄브리아기", from: 541, to: 485.4, color: "#8FB07A" },
  { id: "O", name: "오르도비스기", from: 485.4, to: 443.8, color: "#3FB59A" },
  { id: "S", name: "실루리아기", from: 443.8, to: 419.2, color: "#8FD2B5" },
  { id: "D", name: "데본기", from: 419.2, to: 358.9, color: "#D9A35E" },
  { id: "Ca", name: "석탄기", from: 358.9, to: 298.9, color: "#7FB0B6" },
  { id: "P", name: "페름기", from: 298.9, to: 251.9, color: "#E2826C" },
  { id: "T", name: "트라이아스기", from: 251.9, to: 201.4, color: "#B88AC4" },
  { id: "J", name: "쥐라기", from: 201.4, to: 145, color: "#6CC0DD" },
  { id: "K", name: "백악기", from: 145, to: 66, color: "#A8CC6E" },
  { id: "Pg", name: "팔레오기", from: 66, to: 23.03, color: "#F0B05C" },
  { id: "N", name: "네오기", from: 23.03, to: 2.58, color: "#F2D35E" },
  { id: "Q", name: "제4기", from: 2.58, to: 0, color: "#F2EBA0" },
];

export const ERAS_GEO = [
  { name: "고생대 PALEOZOIC", from: 541, to: 251.9 },
  { name: "중생대 MESOZOIC", from: 251.9, to: 66 },
  { name: "신생대", from: 66, to: 0 },
];

export function periodAt(ma: number): Period | undefined {
  return PERIODS.find((p) => ma <= p.from && ma >= p.to);
}
