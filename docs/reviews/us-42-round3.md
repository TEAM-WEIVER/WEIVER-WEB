# US 리뷰 — #42 Round 3

## 판정: PASS

---

## Round 2 Major 반영 현황

| 항목                                                | 판정   | 비고                                                                                                             |
| --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| M1. AC3 Then — "GET 실패" fallback 조건이 논리 모순 | 해소됨 | AC7 설계 자체가 "GET 실패 → POST fallback 허용"으로 변경되어 AC3 Given/Then의 "GET 실패" 포함이 일관된 분기가 됨 |
| M2. AC1 Then — `answerIdsRef` 보관 동작 누락        | 해소됨 | AC1 Then에 "`sequence` 정렬 순서로 각 문항의 `answerId`를 `answerIdsRef` 배열에 보관한다" 추가됨                 |

---

## Critical

- 없음

---

## Major

- 없음

---

## Minor

- [ ] **AC3/AC4 Then — 이동 경로 미확정 (Round 2 Minor 잔존)**: "다음 온보딩 단계(`/onboarding/complete` 또는 정해진 다음 경로)로 이동한다"는 표현이 유지되어 라우팅 검증 기준이 모호하다. 경로를 확정하거나, 검증 대상에서 명시적으로 제외하는 주석을 추가하는 것을 권고한다.

- [ ] **AC2 When — GET 호출 트리거 암묵적 (Round 2 Minor 잔존)**: AC2 When은 "페이지에 진입한다"만 명시한다. 페이지 진입 시 GET `/api/essay-answers`가 호출된다는 트리거가 When에 없어 Given과 Then 사이의 연결을 추론해야 한다. AC1 When과 표현이 동일하므로, When에 "페이지 진입 시 GET `/api/essay-answers`를 호출한다"를 명시하거나 두 AC의 공통 When으로 묶는 것을 권고한다.
