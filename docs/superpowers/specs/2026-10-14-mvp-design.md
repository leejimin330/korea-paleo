# 한반도 생명 연대기 — MVP 설계 (2026-10-14)

원본 명세: `docs/original-spec.md`. 이 문서는 MVP 범위에서 원본과 달라지는 결정만 기록한다.

## 범위 (사용자 선택: 1안)
- **백악기 관통**: 고지리 지도 + 한반도 윤곽 + 화석 마커(국내 ~13, 동아시아 참고 ~3) + 생물 카드
  + 소형 계통수 + 오늘로 이어보기 + 역방향 탐색 + PBDB 기록 점 레이어.
- **고생대 바다 / 빙하기**: 타임라인에서 선택 가능, 지도·마커 2~3개·안내 카드만 (해수면 슬라이더는 Phase 2).
- 배포 안 함. GitHub 비공개 저장소에만 push.

## 지도 (사용자 선택: GPlates 벡터 + 환경 폴리곤 둘 다)
- 고지리: GPlates Web Service `reconstruct/coastlines` (모델 **MERDITH2021**, CC-BY 4.0, 0–1000 Ma 지원)를
  시대별(0 / 100 / 480 Ma)로 전처리 시 1회 받아 단순화한 GeoJSON. 래스터 PALEOMAP은 라이선스 미확인으로 미사용.
- 한반도 윤곽: Natural Earth 50m(퍼블릭 도메인) KOR+PRK → `reconstruct_feature_collection`으로 시대별 복원.
- 화석 좌표: **같은 모델(MERDITH2021)로 일괄 복원**. 원본은 "PBDB 고좌표 우선"이지만 PBDB 기본 모델이
  달라 배경 해안선과 어긋나므로 일관성을 위해 변경.
- 현재 지도 모드: time=0 해안선(외부 타일 없음, 완전 정적).
- 겹쳐보기 모드: 현재 지도 + 손으로 그린 "당시 환경" 폴리곤(예: 경상분지 호수, 서해 육지화 개략) — 출처/개략 배지.
- MapLibre는 배경 타일 없이 GeoJSON 레이어만 사용.

## 데이터
- 국내 화석지·생물은 수작업 CSV/JSON(`pipeline/manual/`)이 1차 소스. 좌표는 "대략(읍·면 수준)" 명시.
- PBDB: `cc=KR` 전체 수집 → 백악기 컬렉션 단위로 집계한 점 레이어(`pbdb_points.json`)와 마커별 PBDB 건수 보강.
- 계통수: 수작업 `taxa.json`(수십 노드, 분기 시점은 대략값 + 출처 필드). `build_tree.py`가 Open Tree TNRS로
  `ott_id`를 붙인다(실패해도 빌드는 진행, 리포트 출력). 루트는 동물계(삼엽충·완족류 포함 위해 원본의 "어류 루트"에서 확장).

## 핵심 로직 (단위 테스트 대상)
- `pathToToday(tree, nodeId)`: 노드에서 위로 올라가 현생 자손이 있는 첫 조상 A를 찾고, 노드→A, A→각 현생종 경로를 반환.
- `nearestFossilFor(tree, fossils, speciesNodeId)`: 현생종 조상을 가까운 순으로 올라가며, 그 서브트리에 있는 화석 중 가장 가까운 것.
- 마커 필터(그룹, 참고 레이어), 지도 모드별 좌표 선택.

## 스택
Vite + React + TS, MapLibre GL, D3, Zustand, Vitest. 파이프라인 Python(requests, shapely) + pytest.

## 정확성
"공룡 아님", "종 특정 불가(발자국)", "동아시아 참고", "모델 기반 추정", "논쟁 중" 배지/점선. 이어보기 경로엔
"직계 조상이 아니라 공통 조상에서 갈라진 친척" 안내 상시 노출. 모든 카드·레이어에 출처.
