# US 리뷰 — #100 Round 1

## 판정: 재작성 필요

---

## Critical

- [ ] **AC1 — POST/PUT 분기 조건이 AC 본문에서 불명확함.** "서버에 저장된 데이터가 없는 초기 상태에서 신규 항목이 있을 경우 POST"라는 조건이 Then 절 마지막에 혼합되어 있다. Given 조건이 두 가지(기존 데이터 있음 / 없음)인데 하나의 AC로 합쳐져 있어, 사실상 두 개의 시나리오가 한 AC에 섞인 상태다. AC1-a(기존 데이터 있음 → PUT), AC1-b(초기 상태 → POST)로 분리해야 테스트 코드 작성이 가능하다.

- [ ] **AC11 — Given 절이 두 가지 진입 경로를 동시에 기술함.** "포트폴리오 저장을 완료하고 이동한다 (또는 대시보드에서 제출 버튼을 누른다)"는 OR 조건으로, 진입 경로에 따라 When이 달라지므로 단일 시나리오로 검증 불가하다. 포트폴리오 저장 완료 후 자동 제출 흐름인지, 대시보드 버튼 클릭 흐름인지 명확히 구분해야 한다.

---

## Major

- [ ] **AC9 — `resumeCompleted`, `essayCompleted`, `portfolioCompleted` 매핑 방식이 불명확.** Then 절에 "progress에 매핑한다"라고만 기술되어 있어 어떤 타입/필드로 매핑되는지 알 수 없다. `ApplicantProfileOverview`의 필드명과 1:1 대응 명시가 필요하다 (예: `resumeCompleted → progress.resume`).

- [ ] **AC11 — `syncStatus`가 `REQUESTED`로 "갱신된다"는 Then이 서버 응답 기반인지 클라이언트 낙관적 업데이트인지 불명확.** `POST /api/applicants/profile/submit` 응답이 `ApiResponseVoid`이므로 서버에서 syncStatus를 반환하지 않는다. 성공 후 클라이언트에서 상태를 `REQUESTED`로 강제 설정하는 것인지, 아니면 별도 재조회를 하는 것인지 명시해야 구현과 테스트가 일치한다.

- [ ] **AC12 — Given/When/Then 흐름이 순환적.** Given에서 "이미 제출된 상태(`submitted === true`)"를 전제하고 Then에서 "제출 버튼을 `submittable === false`로 비활성화"하는데, `submitted === true`이면 버튼 클릭 자체가 막혀야 하므로 When("POST 호출 후 오류 반환")에 도달하는 경로가 불명확하다. "제출 버튼이 이미 비활성화된 경우"와 "버튼이 활성화된 상태에서 API 오류가 돌아온 경우"를 분리해야 한다.

- [ ] **AC3/AC4 — 자기소개서 존재 여부 판단 기준 누락.** POST와 PUT의 분기를 결정하는 조건("서버에 답변이 없는 상태" vs "이미 저장된 상태")이 어떤 값으로 판단하는지 기술되지 않았다. `GET /api/essay-answers` 응답의 `answerId` 유무인지, 배열 길이인지 명시 필요.

---

## Minor

- [ ] AC2의 "재조회도 실패할 경우" 메시지는 에러 케이스가 아닌 향후 고려사항으로 이동하는 것이 AC 범위 원칙(해피 패스 + 크리티컬 에러만)과 더 일치한다.
- [ ] API 연동 테이블에서 AC1의 PUT 엔드포인트에 `educationId?`(optional)로 표기되어 있으나 UPDATE DTO에서 ID는 required여야 한다. optional 표기의 의도를 명확히 해야 한다.
- [ ] 컴포넌트 스펙의 "백엔드 협의 필요" 항목(`isRecognized` required 강화)은 AC로 승격되거나 향후 고려사항으로 내려야 한다. 컴포넌트 스펙 내에 미결 사항이 있으면 구현 기준이 모호해진다.
