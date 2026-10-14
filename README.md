# 한반도 생명 연대기 (MVP)

시간 슬라이더로 한반도의 과거를 거슬러 올라가며, 그 시대 이 땅에 살았던 생물과
그 생물이 오늘날 어떤 동물로 이어지는지 보여주는 정적 웹 서비스.

- 원본 명세: [`docs/original-spec.md`](docs/original-spec.md)
- MVP 설계 결정: [`docs/superpowers/specs/2026-10-14-mvp-design.md`](docs/superpowers/specs/2026-10-14-mvp-design.md)

## MVP 범위

| 시대 | 상태 | 내용 |
|---|---|---|
| 백악기 (100 Ma) | 완성 | 판 복원 지도 + 한반도 윤곽, 국내 화석지 14 + 동아시아 참고 3, PBDB 기록 점, 카드, 계통수, 오늘로 이어보기 |
| 고생대 바다 (480 Ma) | 미리보기 | 판 복원 지도, 마커 3 |
| 신생대 빙하기 (2만 년 전) | 미리보기 | 현재 지도 + 개략 환경(서해 평원, 대한해협 논쟁 구간), 마커 2. 해수면 슬라이더는 Phase 2 |

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
| `fetch_paleogeo.py` | GPlates Web Service(MERDITH2021)로 시대별 해안선, Natural Earth 한반도 윤곽 복원 |
| `fetch_fossils.py` | PBDB `cc=KR` 산출 기록 |
| `build_fossils.py` | 수작업 화석지(`manual/korea_fossil_sites.json`) + PBDB 집계 + 좌표 복원 |
| `build_tree.py` | `manual/taxa.csv` → `tree.json`, Open Tree TNRS로 `ott_id` 매칭 |

수작업 데이터 추가: 화석지는 `manual/korea_fossil_sites.json`, 계통수 노드·현생종은 `manual/taxa.csv`
(현생종은 `kind=modern`). `tests/test_pipeline.py`가 노드 참조·출처 누락을 검사한다.

## 원본 명세와 다른 점

- 고지리 배경은 PALEOMAP 래스터 대신 GPlates 벡터 해안선 (라이선스 확인 전까지).
- 화석 과거 좌표는 PBDB 고좌표 대신 배경과 같은 모델(MERDITH2021)로 일괄 복원 — 지도와 어긋나지 않게.
- 계통수 루트를 어류에서 동물계로 확장 (삼엽충·완족류 연결).
- 분기 시점은 TimeTree 연동 없이 문헌 기반 대략값.

## 출처·라이선스

GPlates Web Service · Merdith et al. (2021) 판 모델 (CC-BY 4.0) · Natural Earth (Public Domain) ·
Paleobiology Database (CC-BY 4.0) · Open Tree of Life · 국가유산청 천연기념물 정보 · 각 카드에 표기된 원기재 논문.
화석지 좌표는 읍·면 수준의 대략값이다.

## 다음 단계

- Phase 2: GEBCO 수심 그리드 → 해수면 슬라이더, 동굴 포유류 보강
- Phase 3: 고생대 콘텐츠 확장, 포유류·고래 가지, 마이오세 포항
- Phase 4: 모바일 다듬기, 성능 점검
