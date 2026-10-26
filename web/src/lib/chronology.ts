/**
 * 연대표: 국제층서위원회(ICS) 기 경계(Ma) + 한반도 지질 기록 + 세계 생물 사건.
 * 한반도 칸은 교과서 수준으로 널리 알려진 지층·사건만 쓴다. 연대는 모두 대략값.
 */
import { PERIODS } from "./periods";

export type ChronoRow = {
  id: string;
  era: "선캄브리아" | "고생대" | "중생대" | "신생대";
  name: string;
  from: number;
  to: number;
  color: string;
  korea: string;
  world: string;
  /** 이 사이트의 전시(시대 id). */
  exhibits: string[];
  /** 이 기의 끝에 대멸종이 있었으면 그 설명. */
  extinctionAfter?: string;
};

const color = (id: string) => PERIODS.find((p) => p.id === id)!.color;

export const CHRONOLOGY: ChronoRow[] = [
  {
    id: "Pc", era: "선캄브리아", name: "선캄브리아 시대", from: 4600, to: 541, color: "#D9B8A6",
    korea: "경기·영남 지역의 오래된 변성암(편마암)이 만들어졌어요. 대부분 약 25억~18억 년 전 암석이에요.",
    world: "약 35억 년 전 미생물이 나타났고, 끝 무렵 몸이 부드러운 에디아카라 생물이 바다에 살았어요.",
    exhibits: [],
  },
  {
    id: "C", era: "고생대", name: "캄브리아기", from: 541, to: 485.4, color: color("C"),
    korea: "태백·영월·단양 일대가 얕은 바다였어요. 조선누층군의 석회암과 셰일에 삼엽충이 많이 남았어요.",
    world: "캄브리아기 대폭발: 오늘날 동물 무리 대부분이 짧은 시간에 나타났어요.",
    exhibits: ["paleozoic"],
  },
  {
    id: "O", era: "고생대", name: "오르도비스기", from: 485.4, to: 443.8, color: color("O"),
    korea: "바다에 석회암이 계속 쌓였어요. 곧은 껍데기 두족류, 코노돈트, 필석이 나와요.",
    world: "바다 생물의 종류가 크게 늘었어요. 끝 무렵 빙하기와 함께 첫 번째 대멸종이 일어났어요.",
    exhibits: ["paleozoic"],
    extinctionAfter: "오르도비스기 말 대멸종",
  },
  {
    id: "S", era: "고생대", name: "실루리아기", from: 443.8, to: 419.2, color: color("S"),
    korea: "이 시기의 지층이 거의 없어요. 조선누층군과 평안누층군 사이의 긴 공백(대결층)에 들어가요.",
    world: "식물이 땅 위로 퍼지기 시작했고, 턱이 있는 물고기가 늘었어요.",
    exhibits: [],
  },
  {
    id: "D", era: "고생대", name: "데본기", from: 419.2, to: 358.9, color: color("D"),
    korea: "대결층이 계속돼요. 한반도 대부분에서 이 시기 지층을 찾기 어려워요.",
    world: "'어류의 시대'. 물고기에서 네 다리를 가진 동물이 갈라져 나왔어요. 끝 무렵 두 번째 대멸종이 있었어요.",
    exhibits: [],
    extinctionAfter: "데본기 후기 대멸종",
  },
  {
    id: "Ca", era: "고생대", name: "석탄기", from: 358.9, to: 298.9, color: color("Ca"),
    korea: "평안누층군이 쌓이기 시작했어요. 강원 남부에 얕은 바다와 해안 늪이 번갈아 나타났어요.",
    world: "거대한 숲이 석탄이 되었어요. 알을 땅에 낳는 동물(양막류)이 처음 나타났어요.",
    exhibits: ["late_paleozoic"],
  },
  {
    id: "P", era: "고생대", name: "페름기", from: 298.9, to: 251.9, color: color("P"),
    korea: "늪지 식물이 쌓여 태백·삼척 무연탄의 바탕이 되었어요.",
    world: "포유류의 먼 친척(단궁류)이 번성했어요. 끝 무렵 지구 역사상 가장 큰 대멸종이 일어났어요.",
    exhibits: ["late_paleozoic"],
    extinctionAfter: "페름기 말 대멸종 (가장 큰 대멸종)",
  },
  {
    id: "T", era: "중생대", name: "트라이아스기", from: 251.9, to: 201.4, color: color("T"),
    korea: "땅덩어리가 부딪치며 산맥이 솟은 송림변동이 일어났어요.",
    world: "공룡, 익룡, 그리고 첫 포유류가 나타났어요. 끝 무렵 네 번째 대멸종이 있었어요.",
    exhibits: [],
    extinctionAfter: "트라이아스기 말 대멸종",
  },
  {
    id: "J", era: "중생대", name: "쥐라기", from: 201.4, to: 145, color: color("J"),
    korea: "호수와 강에 대동누층군이 쌓였어요. 대보조산운동과 함께 대보화강암이 넓게 만들어졌어요.",
    world: "거대한 용각류 공룡이 번성했고, 깃털 달린 수각류에서 새가 갈라져 나왔어요.",
    exhibits: [],
  },
  {
    id: "K", era: "중생대", name: "백악기", from: 145, to: 66, color: color("K"),
    korea: "경상도 일대에 큰 호수 분지(경상분지)가 생겼어요. 공룡 발자국과 알, 화산 활동의 흔적이 많이 남았어요.",
    world: "꽃 피는 식물이 퍼졌어요. 끝 무렵 소행성 충돌과 함께 새를 뺀 공룡이 사라졌어요.",
    exhibits: ["cretaceous"],
    extinctionAfter: "백악기 말 대멸종 (공룡 멸종)",
  },
  {
    id: "Pg", era: "신생대", name: "팔레오기", from: 66, to: 23.03, color: color("Pg"),
    korea: "이 시기 지층은 드물어요.",
    world: "포유류가 빠르게 다양해졌어요. 고래의 조상이 육지에서 바다로 돌아갔어요.",
    exhibits: [],
  },
  {
    id: "N", era: "신생대", name: "네오기", from: 23.03, to: 2.58, color: color("N"),
    korea: "동해가 열리면서 포항 일대가 바다에 잠겼어요. 상어 이빨과 고래 뼈가 나와요.",
    world: "초원이 넓어졌어요. 인류의 조상이 침팬지의 조상과 갈라졌어요.",
    exhibits: ["miocene"],
  },
  {
    id: "Q", era: "신생대", name: "제4기", from: 2.58, to: 0, color: color("Q"),
    korea: "빙하기마다 해수면이 낮아져 서해가 평원이 되었어요. 제주도와 백두산에서 화산 활동이 이어졌어요.",
    world: "빙하기와 따뜻한 시기가 되풀이됐어요. 약 30만 년 전 현생 인류가 나타났어요.",
    exhibits: ["ice_age"],
  },
];

/** "4,600 → 541" 같은 표기용: 1 Ma 이상은 백만 년 단위, 그 아래는 만 년 단위. */
export function spanLabel(from: number, to: number): string {
  const fmt = (ma: number) => (ma === 0 ? "오늘" : ma >= 1 ? `${ma.toLocaleString()}` : `${ma}`);
  return `${fmt(from)} – ${fmt(to)}`;
}
