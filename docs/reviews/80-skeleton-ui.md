# 코드 리뷰 — #80 Round 1

## 판정: PASS

## Critical

- (없음)

## Major

- `src/app/onboarding/portfolio/page.tsx`:89 — cancelled guard가 `finally` 블록에서만 적용되고 try 블록 내 state setter(`setPortfolioId`, `setExistingFile`)에는 적용되지 않음. `getPortfolio()` 응답 처리 직후 컴포넌트가 언마운트된 경우 cancelled 검사 없이 상태 업데이트가 실행될 수 있음. resume/page.tsx(212행)는 `if (cancelled) return;`을 try 최상단에 위치시켜 올바르게 처리했으나, portfolio는 동일 패턴 적용이 누락됨.

- `src/app/corporate/dashboard/_components/corporate-dashboard-view.tsx`:177 — `채용공고 로딩 중` 스켈레톤 내 `animate-pulse`가 개별 row div에만 적용되고 감싸는 카드 div에는 없음. `CompanySummarySkeleton`/`NotificationSkeleton`은 `animate-pulse`를 바로 하위 단일 컨테이너 div에 붙이는 패턴(`<div className="flex animate-pulse ...">`)을 사용하는 반면, 채용공고 섹션은 각 반복 아이템 div에 각각 `animate-pulse`를 선언해 패턴이 불일치함. AC9는 "동일한 패턴"을 명시하므로 감싸는 컨테이너에 `animate-pulse`를 올리고 내부 아이템에서 제거하는 방향으로 통일 권고.

## Minor

- `src/app/onboarding/cover-letter/page.tsx`:219 — 스켈레톤 섹션의 `aria-label`이 `자기소개서 ${num}번 로딩 중`으로 동적 생성됨. AC3에는 구체적인 aria-label 형식이 명시되지 않아 AC 위반은 아니나, 다른 페이지의 단순 정적 레이블(`"파일 업로드 로딩 중"` 등)과 형식이 달라 일관성이 낮음. 정적 레이블(`"자기소개서 로딩 중"`)로 통일하거나 현행 유지 여부를 팀 내 합의 필요.

- `src/app/onboarding/resume/page.tsx`:366 — 이력서 페이지에는 "이전 단계" 버튼이 없어 AC7의 "나중에 작성, 다음 버튼 전체가 disabled" 요건은 충족하나, cover-letter/portfolio 페이지와 달리 첫 온보딩 단계임이 UI에서 명시되지 않음. 현재 구조상 문제는 없으나 UX 일관성 검토 권고.

- `src/app/applicant/dashboard/page.tsx`:112 — `<ReapplyNotice />`가 스켈레톤 블록 내부(`isLoading` 분기의 true 브랜치)에 위치해 AC1의 "항상 렌더링된다" 요건을 충족함. 다만 isLoading/실제 컴포넌트 양쪽 브랜치 모두에 `<ReapplyNotice />`가 중복 선언되어 있어, 분기 밖으로 추출하면 중복 제거 가능.
