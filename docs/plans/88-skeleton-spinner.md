# [#88] Skeleton / Spinner 공통 컴포넌트 추상화

## User Story

US: 프론트엔드 개발자로서, 각 페이지에 흩어진 인라인 스켈레톤 코드를 공통 컴포넌트로 교체하고 싶다. 왜냐하면 로딩 UI 패턴이 6개 파일에 중복 산재되어 있어 유지보수 비용이 높고, 일관성 없는 시각적 결과물이 생산될 위험이 있기 때문이다.

## Acceptance Criteria

### AC1. Skeleton 프리미티브 컴포넌트 생성

- Given: `src/components/ui/skeleton.tsx`가 존재하지 않는 상태에서
- When: `Skeleton` 컴포넌트를 생성할 때
- Then:
  - `animate-pulse bg-bg-tertiary rounded-md` 기본 클래스를 내장한다
  - `className` prop으로 너비·높이·shape 등 추가 스타일을 주입할 수 있다
  - shadcn/ui 컨벤션에 따라 `div` 기반으로 구현하고 `cn()` 유틸을 사용한다

### AC2. Spinner 컴포넌트 생성

- Given: `src/components/ui/spinner.tsx`가 존재하지 않는 상태에서
- When: `Spinner` 컴포넌트를 생성할 때
- Then:
  - `role="status"` 속성을 가진다
  - `aria-label` prop을 받으며 기본값은 `"로딩 중"`이다
  - CSS 애니메이션 기반 회전 인디케이터로 렌더링된다
  - `className` prop으로 크기·색상 커스터마이징이 가능하다

### AC3. Button 컴포넌트에 isLoading prop 추가

- Given: `Button` 컴포넌트에 `isLoading` prop이 없는 상태에서
- When: `isLoading={true}`를 전달할 때
- Then:
  - 버튼 내부에 `Spinner` 컴포넌트가 렌더링된다
  - 버튼이 `disabled` 상태로 처리되어 클릭이 불가능하다
  - 기존 children 텍스트는 유지하거나 Spinner로 대체하는 방식 중 하나를 일관되게 적용한다

### AC4. 기존 인라인 스켈레톤을 Skeleton 컴포넌트로 교체

- Given: 아래 6개 파일에 `animate-pulse bg-bg-tertiary rounded-md` 인라인 패턴이 하드코딩된 상태에서
  - `interview-start-screen.tsx` — 카메라 프리뷰 로딩 시 `animate-pulse bg-slate-200` div
  - `corporate-dashboard-view.tsx` — `CompanySummarySkeleton`, `NotificationSkeleton` 내부 div들
  - `applicant-list-view.tsx` — `ApplicantTableSkeleton` 내부 셀 div
  - `applicant-report-view.tsx` — `ReportSectionSkeleton` 내부 div들
  - `report-header.tsx` — 이름·아이콘 자리 `animate-pulse` div
  - `report-side-panel.tsx` — `SidePanelValueSkeleton` 및 기술스택 태그 자리 div들
- When: 각 파일의 인라인 패턴을 `Skeleton` 컴포넌트로 교체할 때
- Then:
  - 기존과 동일한 시각적 결과물(너비·높이·shape)을 유지한다
  - `animate-pulse bg-bg-tertiary rounded-md` 인라인 클래스가 제거되고 `<Skeleton />` import로 대체된다
  - `pnpm build`가 에러 없이 통과한다
  - `pnpm typecheck`가 에러 없이 통과한다

### AC5. 빌드 및 타입 검사 통과 (크리티컬 에러)

- Given: 모든 교체 작업이 완료된 상태에서
- When: CI 검증 명령을 실행할 때
- Then:
  - `pnpm lint:check` — ESLint 에러 없음
  - `pnpm typecheck` — TypeScript 에러 없음
  - `pnpm build` — 빌드 에러 없음

## API 연동

해당 없음. 순수 UI 리팩토링이며 백엔드 API 호출이 발생하지 않는다.

## 컴포넌트 스펙

- 신규 컴포넌트:
  - `src/components/ui/skeleton.tsx` — shadcn/ui 컨벤션 준수, `cn()` 유틸 사용
  - `src/components/ui/spinner.tsx` — `role="status"`, `aria-label` prop
- 수정 컴포넌트:
  - `src/components/ui/button.tsx` — `isLoading?: boolean` prop 추가
- 상태 관리 필요 여부: 없음 (prop 기반 렌더링)
- 접근성 주의사항:
  - Skeleton은 시각적 장식 요소이므로 `aria-hidden` 또는 부모의 `aria-label="로딩 중"` 처리를 기존 코드(예: `aria-label="기업 요약 로딩 중"`)에서 유지한다
  - Spinner는 반드시 `role="status"` + `aria-label`로 스크린 리더에 상태를 전달한다
  - Button의 `isLoading` 상태에서 `aria-disabled="true"` 또는 `disabled` 속성이 함께 적용되어야 한다

## 향후 고려사항

- `interview-start-screen.tsx`의 카메라 프리뷰 스켈레톤은 `bg-slate-200`으로 디자인 토큰이 아닌 직접 색상을 사용하고 있어, 별도 토큰 정의 논의가 필요할 수 있다.
- Skeleton의 기본 shape(rounded)가 컴포넌트마다 달라 `rounded`, `rounded-md`, `rounded-xl`, `rounded-full` 등이 혼재한다. 향후 `variant` prop 추가를 고려할 수 있다.
- Button의 `isLoading` 상태에서 현재 사용 중인 `isConnecting` 패턴(interview-start-screen)을 `isLoading`으로 통일할지 여부는 별도 논의 필요.
- Storybook 스토리 작성(`skeleton.stories.tsx`, `spinner.stories.tsx`)은 이번 이슈 범위에 포함되지 않으나 이후 추가를 권장한다.
