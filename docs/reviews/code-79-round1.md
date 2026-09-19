# 코드 리뷰 — #79 Round 1

## 판정: 수정 필요

## Critical

- route-progress-bar.tsx:63 — `visible` 상태를 `isPending` effect 의존성에서 의도적으로 제외하여 stale closure 발생. `isPending`이 false로 바뀌는 시점에 `visible`이 이미 true인지 확인할 수 없어, 200ms 안에 전환이 완료된 경우 페이드아웃 분기(`if (visible)`)가 절대 실행되지 않는다. 해결: `useRef<boolean>`으로 `visible`의 최신 값을 추적하거나, effect를 `[isPending, visible]` 의존성으로 두되 내부에서 루프가 발생하지 않도록 조건을 명확히 처리해야 한다.

## Major

- route-progress-bar.tsx:73-76 — cleanup 함수가 `isPending` effect 내에 위치하여 `isPending` 변경마다 이전 타이머를 정리하지만, `fadeTimerRef`는 `isPending`이 변경되지 않는 동안에도 동작 중일 수 있다. 페이드 타이머 진행 중에 새 내비게이션이 시작되면 `thresholdTimerRef` 초기화는 이뤄지지만 `fadeTimerRef`는 cleanup에서만 지워지므로, 직전 페이드가 완료되기 전에 새 `isPending=true` cycle이 들어오면 `setVisible(false)`가 뒤늦게 호출되어 바가 즉시 사라지는 시각적 결함이 발생할 수 있다. (단, isPending=true 분기 안에서 `fadeTimerRef`도 clearTimeout하고 있으므로 실제 발생 빈도는 낮음 — 그러나 cleanup과 내부 clearTimeout이 중복되는 구조 자체가 유지보수 혼란을 유발한다.)
- use-route-navigation.ts:17 — `useTransition`의 `isPending`을 사용하지 않고 Zustand 스토어를 별도로 두는 구조. `useTransition`의 `isPending`을 직접 구독하면 스토어 없이도 동일한 효과를 낼 수 있어 상태 소스가 줄어든다. 현재 구조는 `startTransition`의 isPending과 Zustand `isPending`이 이중으로 존재하여 두 상태가 서로 다른 시점에 변경될 수 있다.
- applicant-list-view.tsx:536-538 — `handleNavigate`를 `useCallback`으로 감싸고 있으나, 의존성 배열에 있는 `startNavigation`이 Zustand 셀렉터로 매 렌더마다 새 참조를 가질 수 있다. `useRouteLoadingStore`를 직접 셀렉터로 호출하는 대신 `useRouteLoadingStore.getState().startNavigation()`을 callback 내에서 직접 호출하면 의존성 없이 안정된 참조를 사용할 수 있다.
- onboarding/resume/page.tsx:329-346 — `Promise.allSettled` 실패 시 `getApplicantsAll()`을 재호출하여 폼을 리셋하지만, 실패한 항목이 무엇인지 사용자에게 알리지 않고 단순히 "다시 시도"를 표시한다. 어떤 섹션(교육/경력/자격증/수상)이 실패했는지 세분화된 에러 메시지를 표시하지 않는 것이 UX 관점에서 아쉬우나 AC 요구사항상 강제 사항이 아닌 경우라면 Minor 수준이므로 아래로 이동할 수 있다.

## Minor

- route-progress-bar.tsx:88 — `tabIndex={-1}`이 적용된 `div`에 `role="progressbar"`가 있는데, progressbar는 포커스를 받지 않는 것이 일반적이다. `tabIndex={-1}`은 스크린 리더가 프로그래밍적으로 포커스를 이동할 수 있게 하지만, 자동 노출되는 인디케이터에서 이 패턴이 필요한지 재검토가 필요하다.
- route-progress-bar.tsx:96-97 — `transition` 속성이 `fading`일 때만 적용되고 `opacity: 1`일 때 `undefined`로 설정된다. 나타날 때의 전환 효과(fade-in)가 없어 바가 즉시 팝업되는 것처럼 보일 수 있다. 의도된 동작이라면 주석으로 명시를 권고한다.
- layout.tsx:28 — `<body>` 내 들여쓰기가 일치하지 않는다 (`<RouteProgressBar />`와 `{children}`이 불필요하게 4칸 들여쓰기). Prettier 실행으로 정리 가능.
- onboarding/cover-letter/page.tsx:109-111 — `essayCompletedRef.current && answerIdsRef.current.length === 0` 조건에서 ref를 보정하는 로직이 있다. 이 보정 경로는 정상 로드 흐름에서는 발생하지 않아야 하므로, 방어 코드임을 주석으로 명시하거나 `console.warn`으로 비정상 상태를 알리는 것이 디버깅에 유리하다.
- onboarding/portfolio/page.tsx:132 — `push('/applicant/dashboard')`와 `handleSkip`의 `push('/applicant/dashboard')`가 동일한 하드코딩 경로를 두 곳에서 반복한다. 상수로 추출하면 유지보수 시 한 곳만 수정하면 된다.
- applicant-list-view.tsx:299 — `ApplicantTableSkeleton`에서 `Array.from`의 index를 key로 사용한다. 정적 목록이라 실제 문제는 없지만, 린트 경고가 발생할 수 있다.
