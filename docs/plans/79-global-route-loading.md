# [#79] 글로벌 라우트 전환 로딩 도입

## User Story

US: 지원자/기업 사용자로서, 라우트 전환 중 렌더링 지연이 있을 때 상단 프로그레스 바를 통해 시각적 피드백을 받고 싶다. 왜냐하면 전환이 느릴 때 아무 반응이 없으면 앱이 멈췄다고 느낄 수 있기 때문이다.

> 버튼 중복 클릭 방지는 각 버튼의 로컬 로딩 상태(disabled/스피너)가 담당한다. 상단 프로그레스 바는 라우트 렌더링 지연에 대한 글로벌 피드백 역할에 집중한다.

> 1차 대상: AC1~AC5에 정의된 5개 전환 그룹(AC2는 /cover-letter와 /portfolio 두 페이지의 '다음(저장)', '나중에 작성', '이전 단계' 세 버튼 액션을 모두 포함). 로그인 후 push, sidebar 내비게이션 등 나머지는 향후 확장 대상이다.

## Acceptance Criteria

### AC1. 온보딩 이력서 저장 후 다음 단계로 이동 시 로딩 바 노출

- Given: 사용자가 `/onboarding/resume` 페이지에서 이력서 폼을 작성하고 유효성 검사를 통과한 상태이다.
- When: "다음" 버튼을 클릭하여 저장 API 호출이 성공하고 `router.push(getOnboardingPath(nextStep))`이 실행되며, 전환이 200ms 이상 소요될 경우.
- Then: 상단 프로그레스 바가 나타나고, pathname이 변경되면 (라우트 URL commit 완료 시) 자동으로 사라진다.

### AC2. 온보딩 자기소개서/포트폴리오 — 저장·나중에 작성·이전 단계 시 로딩 바 노출

- Given: 사용자가 `/onboarding/cover-letter` 또는 `/onboarding/portfolio` 페이지에 있다.
- When: "다음(저장)", "나중에 작성", "이전 단계" 버튼 중 하나를 클릭하여 `router.push()`가 실행되며, 전환이 200ms 이상 소요될 경우.
- Then: 상단 프로그레스 바가 나타나고, pathname이 변경되면 (라우트 URL commit 완료 시) 자동으로 사라진다.

### AC3. 지원자 대시보드 프로필 편집 버튼 클릭 시 로딩 바 노출

- Given: 사용자가 `/applicant/dashboard`에 있고 프로필 편집 버튼이 활성화되어 있다.
- When: 프로필 편집 버튼을 클릭하여 `router.push(getProfileEditPath(progress))`가 실행되며, 전환이 200ms 이상 소요될 경우.
- Then: 상단 프로그레스 바가 나타나고, pathname이 변경되면 (라우트 URL commit 완료 시) 자동으로 사라진다.

### AC4. 기업 지원자 리스트 — breadcrumb "공고목록" Link 클릭 시 로딩 바 노출

- Given: 기업 사용자가 `/corporate/recruitment/[jdId]` 페이지 내 지원자 리스트를 보고 있다.
- When: 헤더 breadcrumb의 "공고목록" `<Link href="/corporate/dashboard" onNavigate={...}>` 를 클릭하여 SPA 내비게이션이 시작되고, 전환이 200ms 이상 소요될 경우.
- Then: 상단 프로그레스 바가 나타나고, pathname이 변경되면 (라우트 URL commit 완료 시) 자동으로 사라진다.

### AC5. 기업 지원자 리스트 — 지원자 행 클릭 시 리포트 페이지 이동 로딩 바 노출

- Given: 기업 사용자가 `/corporate/recruitment/[jdId]` 지원자 리스트에서 지원자 목록이 표시되어 있다.
- When: 지원자 행을 클릭하여 `/corporate/recruitment/[jdId]/applicants/[publicId]/report`로 이동하는 `<Link onNavigate={...}>`가 SPA 내비게이션을 시작하고, 전환이 200ms 이상 소요될 경우.
- Then: 상단 프로그레스 바가 나타나고, pathname이 변경되면 (라우트 URL commit 완료 시) 자동으로 사라진다.

### AC6. 전환 완료 및 인터럽션 시 로딩 인디케이터 자동 소멸

- Given: 라우트 전환이 시작되어 상단 프로그레스 바가 표시 중이다.
- When: `usePathname()`이 반환하는 pathname이 변경된다 (URL commit = 라우트 전환 완료 신호. 페이지 내부 Suspense/클라이언트 데이터 fetching은 별도 로딩 UI의 책임으로 분리).
- Then: 프로그레스 바가 100%까지 채워진 뒤 100ms 이내에 페이드 아웃되며 DOM에서 제거된다. 전환 중 새로운 내비게이션이 시작되면 이전 바를 즉시 리셋하고 새 전환에 대한 바를 시작한다.

## API 연동

이 기능은 순수 프론트엔드 UX 개선이다. 신규 API 호출이 없으므로 해당 없음.

## 컴포넌트 스펙

- 사용할 shadcn/ui 컴포넌트: 없음 (Progress 컴포넌트는 직접 구현 또는 nprogress 계열 라이브러리 검토)
- 권장 구현 방식:
  - `useTransition` (React 18) + `startTransition`으로 `router.push()` 래핑
  - `isPending` 상태를 전역 Zustand 스토어 또는 React Context로 노출
  - `src/app/layout.tsx`에 `RouteProgressBar` 클라이언트 컴포넌트 마운트 (단일 진입점)
  - `<Link>` 기반 전환(breadcrumb, 지원자 행)은 Next.js 15의 `<Link onNavigate>` prop 사용. `onNavigate`는 SPA 내비게이션에서만 실행되며 modifier key 클릭(새 탭 열기 등)에서는 실행되지 않음
  - 200ms 임계값: `setTimeout`으로 지연 후 바 노출. 타이머 실행 전 전환이 완료되면 바를 노출하지 않음
    - 측정 시작점: `router.push()` 호출 또는 `onNavigate` 핸들러 실행 시점
    - 측정 종료점: `usePathname()` 반환값 변경 시점
    - 이 구간이 200ms 미만이면 바를 노출하지 않음
- 스타일:
  - `position: fixed`, `top: env(safe-area-inset-top, 0px)`, `left: 0`, `width: 100%`
  - `z-index: 9999`
- 상태 관리 필요 여부: 전역 `isPending` boolean 상태 필요 (Zustand 스토어 신규 슬라이스 또는 별도 Context)
- 접근성 주의사항:
  - 프로그레스 바에 `role="progressbar"`, `aria-label="페이지 전환 중"` 부여
  - 시각적으로만 표시되는 컴포넌트이므로 `aria-hidden`보다 `aria-live="polite"` 영역에서 상태 변경 알림 제공 권장
  - 키보드 포커스는 프로그레스 바로 이동하지 않아야 함 (`tabIndex={-1}` 또는 `inert`)

## 향후 고려사항

> AC에서 제외한 엣지 케이스를 여기에 기록한다. 구현 우선순위는 낮지만 나중에 다룰 수 있다.

- 이번 1차 대상: 이슈에서 명시한 6개 지점(온보딩 이력서, 자기소개서/포트폴리오, 지원자 대시보드, breadcrumb, 지원자 행)만 적용. 로그인 후 push, sidebar 내비게이션 등 나머지 지점은 추후 확장
- 동일 경로로의 중복 클릭 시 프로그레스 바 중복 트리거 방지
- 브라우저 뒤로가기/앞으로가기 내비게이션 시 프로그레스 바 연동 여부
- 전환 중 에러(500, 404) 발생 시 프로그레스 바 처리 방식 — 강제 소멸 vs. 에러 색상 변경
- 모션 감소 설정(`prefers-reduced-motion`) 사용자에게 프로그레스 바 애니메이션 비활성화 대응
