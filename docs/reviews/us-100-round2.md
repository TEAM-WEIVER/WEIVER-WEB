# US 리뷰 — #100 Round 2

## 판정: PASS

> round1 Critical 2건·Major 4건이 모두 해소되었다. 잔여 Minor 2건은 구현에 지장을 주지 않는 수준이다.

---

## round1 이슈 해소 현황

### Critical — 전부 해소

- [x] **AC1 분리** — AC1-a(기존 데이터 있음 → PUT)·AC1-b(초기 상태 → POST)로 분리됨. Given 조건이 각 시나리오에 명확히 기술됨.
- [x] **AC11 진입 경로 분리** — AC11-a(대시보드 버튼 클릭)·AC11-b(포트폴리오 저장 후 자동 진입)로 분리됨. AC11-b에서 자동 제출 없이 버튼 활성화만 함을 명시.

### Major — 전부 해소

- [x] **AC9 매핑 방식** — `resumeCompleted / essayCompleted / portfolioCompleted` 각 필드를 이력서·자기소개서·포트폴리오 완료 여부에 1:1로 명시. `submitted`, `syncStatus`, `submittable`을 `ApplicantProfileOverview` 타입에 추가한다는 구현 지침도 기술됨.
- [x] **AC11 syncStatus 업데이트 방식** — "클라이언트에서 `syncStatus`를 `REQUESTED`로 낙관적 업데이트 후 `GET /api/applicants/submission-status` 재조회"로 명확히 기술됨.
- [x] **AC12 순환 흐름** — AC12-a(비활성화 렌더링)·AC12-b(API 오류 롤백)로 분리. Given/When/Then 흐름이 순환 없이 독립적으로 성립함.
- [x] **AC3/AC4 분기 조건** — `GET /api/essay-answers` 응답의 answers 배열에서 `answerId` 존재 여부로 POST/PUT 분기를 결정함을 명시.

### Minor — 2건 잔존 (파일에서 확인)

- [ ] **AC2 재조회 실패 메시지** — "재조회도 실패할 경우" 분기가 AC2 본문에 그대로 남아 있다. AC 범위 원칙(해피 패스 + 크리티컬 에러)에 따라 향후 고려사항으로 이동이 권고되나, 구현에는 지장 없음.
- [ ] **컴포넌트 스펙 미결 사항** — `isRecognized` required 강화에 대한 "백엔드 협의 필요" 표현이 컴포넌트 스펙 내에 남아 있다. 향후 고려사항 섹션으로 이동하거나 별도 AC로 승격하는 것이 바람직하나, 현재 표현이 구현을 차단하지는 않음.

---

## Critical

해당 없음.

## Major

해당 없음.

## Minor

- [ ] AC2 본문에 "재조회도 실패할 경우" 이중 에러 분기가 포함되어 있다. AC 범위 원칙상 향후 고려사항으로 분리 권고.
- [ ] 컴포넌트 스펙의 `isRecognized` required 강화 항목이 "백엔드 협의 필요" 상태로 남아 있다. 미결 사항은 AC 또는 향후 고려사항 어느 한 곳에 명확히 위치해야 한다.
