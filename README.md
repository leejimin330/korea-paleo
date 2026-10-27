# 한반도 생명 연대기 (MVP)

시간 슬라이더로 한반도의 과거를 거슬러 올라가며, 그 시대 이 땅에 살았던 생물과
그 생물이 오늘날 어떤 동물로 이어지는지 보여주는 정적 웹 서비스.

- 원본 명세: [`docs/original-spec.md`](docs/original-spec.md)
- MVP 설계 결정: [`docs/superpowers/specs/2026-10-14-mvp-design.md`](docs/superpowers/specs/2026-10-14-mvp-design.md)

## MVP 범위

| 시대 | 상태 | 내용 |
|---|---|---|
| 백악기 (100 Ma) | 완성 | 판 복원 지도 + 한반도 윤곽, 국내 화석지 14 + 동아시아 참고 3, PBDB 기록 점, 카드, 계통수, 오늘로 이어보기 |
| 고생대 바다 (480 Ma) | 미리보기 | 판 복원 지도, 수작업 마커 3 + PBDB 자동 마커 |
| 석탄기~페름기 평안누층군 (300 Ma) | 미리보기 | 완족류·산호·코노돈트·투구게 친척 (PBDB 자동 + 대표종 1) |
| 마이오세 포항 (15 Ma) | 완성 | 상어(메갈로돈 등)·돌고래·민물고기·설치류 (PBDB 자동 + 대표종 2) |
| 신생대 빙하기 (2만 년 전) | 미리보기 | 현재 지도 + 개략 환경(서해 평원, 대한해협 논쟁 구간), 마커 2. **해수면 슬라이더**(0 ~ −130m, NOAA ETOPO1 수심 기반) |

화면 구성: **메인**(`#/`, 지층 단면에서 시대 고르기 · 오늘의 생물에서 거슬러 오르기) → **시대 탐험**(`#/era/<id>`, 생물 도감 → 지도·표본 카드 → 고른 생물의 진화 경로) · **연대표**(`#/timeline`, 선캄브리아~제4기, 한반도·세계 사건과 대멸종).

생물 도감: 시대마다 40~55종. 한반도 기록이 없는 속은 같은 시대 주변 지역(경도 115–145°, 위도 30–50°: 중국 북동부·일본·러시아 극동)
PBDB 기록에서 골라 「주변 지역」으로 표시한다. 무리별 몫은 (속 수)^0.4 비례, 한 무리 최대 6속, 척추동물 가중.
한국어 이름은 `pipeline/manual/species_names_ko.json` (이름이 없는 속은 고르지 않음, `python build_species.py --report`로 고를 속 목록 확인).

공통: 지도 3모드(과거 / 현재 / 현재 + 당시 환경), 마커 필터, 계통수 노드 ↔ 지도 연동,
역방향 탐색(현생종 → 가장 가까운 한반도 화석), 불확실성 배지·점선·빗금, 모든 카드에 출처.

## 실행

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (계통수 경로·필터 로직)
npm run build
```

## 데이터 파이프라인

`web/public/data/`에 결과물이 커밋되어 있으므로 웹만 볼 때는 실행할 필요 없다.

```bash
python -m venv .venv && .venv/Scripts/pip install requests shapely pytest
cd pipeline
../.venv/Scripts/python build_all.py     # 외부 API 응답은 data/raw/http_cache 에 캐시
../.venv/Scripts/python -m pytest tests
```

| 스크립트 | 하는 일 |
|---|---|
| `fetch_paleogeo.py` | GPlates Web Service(MERDITH2021)로 500 Ma~오늘 22개 시점의 해안선·한반도 윤곽·한반도 중심 위치(`paleo_steps.json`, 과거 지도 시간 슬라이더용) 복원. 해안선 조각마다 대륙(지괴) 무리를 붙인다: 오늘날 조각의 대표점 → 판 번호(GWS assign_points_plate_ids)·Natural Earth 대륙 → 시점별로 옮긴 점의 면적 가중 다수결 |
| `fetch_fossils.py` | PBDB `cc=KR` 산출 기록 |
| `build_fossils.py` | 수작업 화석지(`manual/korea_fossil_sites.json`) + PBDB 집계 + 좌표 복원 |
| `build_species.py` | 한반도 + 주변 지역 PBDB 속에서 시대별 생물 도감(`species.json`), 주변 지역 마커 추가 |
| `pbdb_taxa.py` | PBDB 속·종 기록 → 계통수 노드(`manual/pbdb_taxon_map.json`), 시대×계통×시군(`manual/places.csv`) 단위 자동 마커, 대표종(`manual/featured_taxa.json`) 마커 |
| `build_bathymetry.py` | NOAA ERDDAP ETOPO1에서 117–135°E, 30–43°N을 0.05° 격자로 잘라 `bathymetry.json` (해수면 슬라이더) |
| `fetch_images.py` | 영어 위키백과 대표 이미지(자유 라이선스) + 위키미디어 공용 저작자·라이선스 → `images.json`. 속 사진이 없으면 화면에서 무리 사진으로 대신하고 표시 |
| `build_tree.py` | `manual/taxa.csv` → `tree.json`, Open Tree TNRS로 `ott_id` 매칭 |

자동 마커: 학명이 붙은 PBDB 기록을 같은 시대·계통·가까운 시군끼리 묶어 마커 하나로 만들고(「자동 수집」 배지),
같은 계통의 수작업 화석지가 15km 안에 있으면 그 카드에 분류군 목록으로 붙인다. 분류가 불명확한 기록은 매핑 규칙에서 `null`로 제외한다.

수작업 데이터 추가: 화석지는 `manual/korea_fossil_sites.json`, 계통수 노드·현생종은 `manual/taxa.csv`
(현생종은 `kind=modern`). `tests/test_pipeline.py`가 노드 참조·출처 누락을 검사한다.

## 원본 명세와 다른 점

- 고지리 배경은 PALEOMAP 래스터 대신 GPlates 벡터 해안선 (라이선스 확인 전까지).
- 화석 과거 좌표는 PBDB 고좌표 대신 배경과 같은 모델(MERDITH2021)로 일괄 복원 — 지도와 어긋나지 않게.
- 계통수 루트를 어류에서 동물계로 확장 (삼엽충·완족류 연결).
- 분기 시점은 TimeTree 연동 없이 문헌 기반 대략값.
- 수심은 GEBCO 대신 NOAA ETOPO1(ERDDAP 부분 추출, 자유 재배포 가능). 오늘의 수심만으로 계산한 단순 추정이며 퇴적·지각 변동은 반영하지 않음.

## 출처·라이선스

GPlates Web Service · Merdith et al. (2021) 판 모델 (CC-BY 4.0) · Natural Earth (Public Domain) ·
Paleobiology Database (CC-BY 4.0) · Open Tree of Life · 국가유산청 천연기념물 정보 · 각 카드에 표기된 원기재 논문.
화석지 좌표는 읍·면 수준의 대략값이다.

## 다음 단계

- 동굴 포유류 보강
- Phase 3: 고생대 콘텐츠 확장, 포유류·고래 가지, 마이오세 포항
- Phase 4: 모바일 다듬기, 성능 점검
