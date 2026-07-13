# US 리뷰 — #42 Round 1

## 판정: 재작성 필요

---

## Critical

- [ ] 없음

---

## Major

- [ ] **M1. AC2 Given과 AC6이 충돌 — "GET 404" 케이스 귀속 불명확**

  AC2 Given은 "GET 응답 `answers` 배열이 비어 있거나 **404**"라고 명시한다.
  AC6 Given은 "GET 요청이 실패했다 (네트워크 오류, **401, 서버 오류** 등)"이라고 명시한다.
  404는 AC2(POST 분기)에도, AC6(조용한 에러 처리)에도 해당할 수 있어 어느 AC를 기준으로 테스트를 작성해야 할지 모호하다.
  설계 의도("GET 성공 + 빈 배열 → POST", "GET 실패 → 조용히 처리 + POST")에 따라 두 케이스를 명확히 분리해야 한다.
  - AC2 Given → "GET 성공 응답이며 `answers` 배열이 빈 배열(`[]`)인 상태"로 한정
  - AC6 Given → "GET 자체가 실패(4xx/5xx/네트워크 오류)한 상태"로 한정
  - 404의 귀속을 명시적으로 결정하여 둘 중 하나의 AC에만 명시

- [ ] **M2. AC2 Then — questionId fallback 로직 누락**

  POST 요청 시 questionId 결정 규칙("GET 응답 `answers[i].questionId` 우선, 없으면 상수 `[1,2,3]`")이 기획 문서 API 연동 섹션에만 있고 AC2 Then에는 기술되지 않아 AC만 보고 테스트 코드를 작성할 수 없다.
  AC2 Then에 아래 내용을 추가해야 한다.

  > "GET 성공 시 `answers[i].questionId` 값을 사용하고, GET 실패·빈 배열인 경우 상수 `[1, 2, 3]`을 fallback으로 사용한다."

- [ ] **M3. AC1 Then — prefill과 answerId 보관이 단일 Then에 혼재**

  Then: "각 textarea에 자동으로 채워진다. `answerId`들은 이후 PUT 요청을 위해 ref에 보관된다."
  두 행동(UI 반영 + 내부 상태 저장)이 하나의 Then에 섞여 있어 실패 원인 파악이 어렵고 단위 테스트 분리가 불가하다.
  `answerId` ref 보관은 AC3 Given 전제 조건으로 이동하거나 별도 AC로 분리를 권고한다.

- [ ] **M4. GET 성공 + 빈 배열(첫 방문) 케이스의 Then 미명시**

  현재 AC1은 "이미 자기소개서가 저장된 상태" 전제만 다룬다. GET 성공이지만 `answers`가 `[]`인 첫 방문 케이스의 Then(빈 폼 유지, `essayCompleted=false`)이 어느 AC에도 명시되지 않았다.
  AC2 Given이 이를 암묵적으로 포함하지만 AC2 Then은 "저장 요청" 행동만 다루므로, "페이지 진입 시 빈 폼으로 표시된다"는 동작을 명시한 AC가 없어 테스트 작성 시 누락될 수 있다.

---

## Minor

- [ ] AC5: 401(인증 만료) 발생 시 에러 메시지 표시와 세션 만료 처리(리다이렉트 등) 중 어느 것이 우선인지 불명확. 프로젝트 공통 인증 에러 처리 정책과의 일치 여부 확인 필요.
- [ ] AC3 Then: `answerId` 출처(sequence 정렬된 `answerIdsRef` 배열)가 명시되지 않아 AC1과의 연결 관계를 추론해야 한다. "AC1에서 보관한 `answerIdsRef[i]`를 사용한다"는 문구 추가 권고.
- [ ] AC2/AC3 Then의 "다음 온보딩 단계로 이동" — 이동 대상 경로가 명시되지 않아 테스트에서 라우팅 검증 기준이 모호하다.
