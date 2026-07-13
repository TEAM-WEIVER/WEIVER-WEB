# US 리뷰 — #42 Round 2

## 판정: 재작성 필요

---

## Round 1 Major 반영 현황

| 항목                                   | 판정           | 비고                                                           |
| -------------------------------------- | -------------- | -------------------------------------------------------------- |
| M1. AC2 Given과 AC7(구 AC6) 분리       | 반영됨         | AC2 Given → "GET 성공 + 빈 배열"로 한정, 404는 AC7에 귀속 명시 |
| M2. questionId fallback 로직 누락      | 위치 이동 반영 | AC2 Then 대신 AC3 Then에 fallback 로직 명시 (위치 변경 적절)   |
| M3. AC1 Then — prefill + answerId 혼재 | 반영됨         | `answerIdsRef` 보관을 AC4 Given으로 이동                       |
| M4. GET 성공 + 빈 배열 Then 미명시     | 반영됨         | AC2 Then에 "빈 폼 표시 + essayCompletedRef = false" 명시       |
| Minor 1. 401 처리 정책                 | 반영됨         | AC6에 "프로젝트 공통 인증 에러 처리 정책" 준거 명시            |
| Minor 2. answerIdsRef 출처             | 반영됨         | AC4 Given에 "AC1에서 보관"으로 연결 명시                       |
| Minor 3. 다음 경로 모호                | 부분 반영      | "/onboarding/complete 또는 정해진 다음 경로"로 여전히 미확정   |

---

## Critical

- [ ] 없음

---

## Major

- [ ] **M1. AC3 Then — questionId fallback 조건에 "GET 실패" 포함이 논리 모순**

  AC3 Then: "GET 실패·빈 배열인 경우 상수 `[1, 2, 3]`을 fallback으로 사용한다"고 명시한다. 그러나 AC7에 따르면 GET 실패 시 저장 버튼이 비활성화되어 POST 호출 자체가 차단된다. GET 실패 상태에서 AC3 분기(POST)에 도달하는 경로가 존재하지 않으므로, "GET 실패"를 fallback 조건에 포함하는 것은 도달 불가한 분기를 명시하는 셈이다. 테스트 코드 작성 시 해당 케이스의 처리 방향이 AC3과 AC7 사이에서 충돌하여 혼선을 야기한다.

  수정 방향: AC3 Then의 fallback 조건을 아래와 같이 수정

  > "GET 성공 + 빈 배열인 경우 상수 `[1, 2, 3]`을 fallback으로 사용한다."

- [ ] **M2. AC1 Then — `answerIdsRef` 보관 동작 누락으로 AC4 Given 전제 단절**

  M3 반영 과정에서 `answerIdsRef` 보관 동작이 AC1 Then에서 제거되었다. AC4 Given은 "AC1에서 `sequence` 정렬된 `answerIdsRef[i]`가 ref에 보관되어 있다"고 전제하지만, AC1 Then에는 이 저장 동작이 명시되어 있지 않다. AC1 Then만 보고 테스트를 작성하면 `answerIdsRef` 저장 단계가 누락되고, AC4 Given의 사전 조건을 충족하는 방법을 추론해야 한다.

  수정 방향: AC1 Then 마지막에 아래 문장 추가

  > "`sequence` 정렬된 순서대로 각 문항의 `answerId`를 `answerIdsRef` 배열(`[answerId_seq1, answerId_seq2, answerId_seq3]`)에 보관한다."

---

## Minor

- [ ] **AC3/AC4 Then — 이동 경로 미확정**: "다음 온보딩 단계(`/onboarding/complete` 또는 정해진 다음 경로)로 이동한다"는 표현이 유지되어 라우팅 검증 기준이 모호하다. 경로를 확정하거나, 검증 대상에서 명시적으로 제외하는 주석을 추가하는 것을 권고한다.

- [ ] **AC2 When — GET 호출 트리거 암묵적**: AC2 Given은 서버 상태를 전제하고 When은 "페이지 진입"만 명시한다. 페이지 진입 시 GET 호출이 발생한다는 트리거가 When에 없어 Given과 Then 사이의 연결을 추론해야 한다. AC1 When과 표현이 동일하므로, 두 AC를 묶어 공통 Given으로 처리하거나 When에 "페이지 진입 시 GET `/api/essay-answers`를 호출한다"를 명시하는 것을 권고한다.
