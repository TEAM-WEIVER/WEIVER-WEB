# 코드 리뷰 — #100 ATDD (Round 1)

> 대상: `e2e/onboarding/resume-snapshot.spec.ts`, `e2e/onboarding/portfolio-submit.spec.ts`, `e2e/applicant/dashboard-submission-status.spec.ts`

## 판정: 수정 필요

---

## Critical

- `portfolio-submit.spec.ts`:154 — `page.getByRole('checkbox').check()` — role 셀렉터로 `checkbox`를 단독 사용하면 페이지에 체크박스가 복수일 때 첫 번째를 맹목적으로 체크한다. AC6·AC7·AC8·AC12-b 전 테스트에서 동일 패턴이 반복됨. `getByRole('checkbox', { name: '동의' })` 또는 `getByLabel(...)` 형태로 교체 필요.

- `dashboard-submission-status.spec.ts`:558 — `page.clock.install({ time: 0 })`이 `gotoDashboard` **이후**에 호출된다. fake clock은 반드시 `page.goto` 이전에 설치해야 초기 로드 타이머도 제어된다. 해당 테스트(`AC12-a: submittable=false이면 POST가 발생하지 않는다`)는 clock이 활성화되기 전에 이미 페이지가 마운트되어 폴링 타이머가 실제 clock 기반으로 등록된 상태이므로 `fastForward`가 무효다. AC11 관련 fake clock 테스트들(`resume-snapshot`에도 동일 원칙)과 일관성 불일치.

- `resume-snapshot.spec.ts`:333 — payload 키 추출 로직 `body['EducationDTO'] ?? body['educationDTO'] ?? Object.values(body)[0]`에서 `Object.values(body)[0]`를 fallback으로 쓰면 응답 구조가 바뀌었을 때 잘못된 배열을 검증하면서도 테스트가 PASS될 수 있다. AC1-b 스펙상 키는 `EducationDTO`로 고정이므로 fallback 제거 후 `expect(body).toHaveProperty('EducationDTO')` 단언을 선행해야 한다.

---

## Major

- `resume-snapshot.spec.ts`:200-224 — AC1-a 테스트 내부에서 5개 서브 API에 대한 `page.route` 등록을 인라인으로 반복한다. `mockSnapshotSuccess` 헬퍼(139행)가 이미 정의되어 있음에도 사용하지 않고 중복 구현. AC1-b의 나머지 서브 API 목(268-284행, 353-374행)도 동일. `mockSnapshotSuccess`를 공통으로 사용하고 검증이 필요한 엔드포인트만 덮어쓰는 방식으로 정리 필요.

- `portfolio-submit.spec.ts`:134-141 — AC6 테스트에서 `mockPortfolioLoad`(GET 목)를 먼저 등록한 뒤 동일한 `API.PORTFOLIOS` 패턴으로 POST 목을 다시 등록한다. Playwright `page.route`는 나중에 등록된 핸들러가 우선하므로 GET 목이 POST 요청도 먼저 매칭될 가능성이 있다. `mockPortfolioLoad` 내부의 메서드 분기를 그대로 유지하고 있어 실제로는 `route.continue()`로 흘러 문제없지만, POST 핸들러에서 `route.fallback()`과 `route.continue()`가 혼용되어 시맨틱이 불명확하다. 모든 파일에서 `route.continue()`와 `route.fallback()` 중 하나로 통일할 것.

- `dashboard-submission-status.spec.ts`:397-401 — `waitForResponse` predicate 내부에서 클로저 변수 `callCount`를 직접 읽는다(`callCount >= 2`). `waitForResponse`는 네트워크 이벤트가 발생할 때마다 predicate를 재평가하는데, 조건이 충족되기 전에 타임아웃되면 callCount 상태와 무관하게 실패한다. 대신 `await page.waitForResponse(r => r.url().includes('...'))` 2회 체이닝 방식 또는 `page.waitForFunction`으로 분리하는 것이 더 견고하다.

- `dashboard-submission-status.spec.ts`:255 — `resumeItem.getByRole('img', { name: /완료|check/i }).or(resumeItem.getByText(/완료/i))` 패턴이 AC9의 이력서·자기소개서·포트폴리오 완료 검증 3개 테스트 모두에서 반복된다. 헬퍼 함수 `assertItemCompleted(item: Locator)` 등으로 추출하면 가독성과 유지보수성 향상.

- `resume-snapshot.spec.ts`:305-318 — DatePicker 상호작용(`startTrigger`, `endTrigger`)에서 `page.locator('div').filter({ has: trigger })`를 사용한다. `<div>` 범위 매칭은 페이지 구조에 지나치게 의존적이며, picker 팝업이 DOM 트리 외부(portal)에 마운트될 경우 잘못된 컨테이너를 잡아 `selectOption`이 타임아웃된다. `fillRequiredPersonalInfo` 내부(174-179행)에서도 동일 패턴 사용. DatePicker 컴포넌트에 `data-testid="birthday-picker"` 등 명시적 속성을 부여하거나, picker 팝업 자체를 `role="dialog"` 기반으로 찾는 것이 더 안정적이다.

- `resume-snapshot.spec.ts`·`portfolio-submit.spec.ts`·`dashboard-submission-status.spec.ts` 세 파일 모두 — `fulfillJson` 헬퍼가 각 파일에 동일 구현으로 복사되어 있다(`resume-snapshot.spec.ts`:119, `portfolio-submit.spec.ts`:84, `dashboard-submission-status.spec.ts`:174). `e2e/fixtures/` 또는 `e2e/helpers/` 공통 모듈로 추출 필요.

---

## Minor

- `portfolio-submit.spec.ts`:111-117 — `attachPortfolio` 헬퍼의 기본 `size` 인자가 `16`(바이트)이다. 이 크기는 실제 파일 유효성 검사를 통과할 수 없을 수 있으며, 최소 유효 크기 기준이 코드에 명시되지 않아 향후 파일 크기 제한 추가 시 의도 파악이 어렵다. 주석으로 "최소 mock 크기, 파일 크기 검증 없는 환경 전제" 등 명시 권고.

- `dashboard-submission-status.spec.ts`:302-310 — `AC9: 모든 항목 false` 테스트에서 `gotoDashboard` 대신 `page.goto('/applicant/dashboard')`를 직접 호출한다. 응답 대기 없이 진행되어 타이밍에 따라 단언이 렌더 전에 실행될 수 있다. 일관성 차원에서 `gotoDashboard`로 교체 권고.

- `resume-snapshot.spec.ts`:17-28 — `API` 상수에서 `EDUCATION_PUT`과 `EDUCATION_POST`가 동일한 URL `'**/api/applicants/education'`으로 정의되어 있다. 실제 사용처가 없고(테스트 내부에서 직접 패턴 문자열을 사용) 혼동을 유발하므로 제거하거나 URL만 남기고 키를 `EDUCATION`으로 단일화 권고.

- `portfolio-submit.spec.ts`:22 — `PORTFOLIO_BY_ID: '**/api/portfolios/*'` 패턴은 `/api/portfolios/` 하위 경로를 모두 매칭한다. 현재는 portfolioId만 오지만, 향후 `/api/portfolios/me` 같은 엔드포인트가 추가되면 오매칭 발생 가능. 주석에도 "trailing-slash 오염 방지"라고 명시되어 있으나 숫자 ID만 매칭하는 정규식(`**/api/portfolios/[0-9]*`) 도입 고려.
