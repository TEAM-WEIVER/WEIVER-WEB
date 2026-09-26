# 코드 리뷰 — #88 Round 1

## 판정: 수정 필요

---

## Critical

없음

---

## Major

- `src/components/ui/button.tsx:65` — `aria-disabled`는 네이티브 `disabled`가 이미 설정되어 있을 때 중복이다. 더 중요한 문제는 `isLoading` 상태에서 `aria-busy="true"`가 누락되어 있다. 스크린 리더가 버튼이 로딩 중임을 인식하지 못한다. `aria-busy={isLoading}` 추가 필요.

- `src/components/ui/spinner.tsx:19` — `<span role="status">`에 `aria-live` 속성이 없다. `role="status"`는 암묵적으로 `aria-live="polite"`를 가지지만, Spinner가 동적으로 DOM에 삽입되는 경우(Button의 isLoading처럼) 일부 스크린 리더에서 공지가 누락될 수 있다. `aria-live="polite"`를 명시적으로 추가하는 것을 권고한다.

- `src/app/applicant/interview/_components/interview-start-screen.tsx:165` — `<Skeleton className="absolute inset-0 rounded-none bg-slate-200" />`에서 `bg-slate-200`으로 디자인 토큰을 우회하고 있다. `Skeleton`의 기본 색상은 `bg-bg-tertiary`이며, 이 파일 전반에서 `bg-slate-*` 하드코딩이 광범위하게 사용되고 있다. 이 파일은 이번 리팩토링 범위에 포함되어 있으므로, 최소한 Skeleton의 색상 override는 `bg-bg-tertiary` 계열 토큰으로 교체해야 한다.

- `src/app/applicant/interview/_components/interview-start-screen.tsx:297-299` — `isConnecting` 시 Button에 `isLoading` prop을 사용하지 않고 `disabled` + 인라인 className 조합으로 구현되어 있다. `Button`에 `isLoading` prop이 추가된 이번 리팩토링의 목적에 어긋난다. `isLoading={isConnecting}` 사용 + Spinner 노출로 교체하고 인라인 스타일 분기 제거 필요.

---

## Minor

- `src/components/ui/skeleton.tsx:6` — shadcn/ui 컨벤션에서는 `role="none"` 또는 `aria-hidden="true"`를 붙여 스크린 리더에서 의미 없는 div를 숨기는 경우가 많다. 현재 구현에는 해당 속성이 없어 스크린 리더가 빈 div를 읽을 수 있다. 단, 부모 컨테이너에 `aria-label="... 로딩 중"`이 있는 경우(corporate-dashboard-view 등)는 이미 대응되어 있으므로, Skeleton 자체에 `aria-hidden="true"`를 추가하거나 사용처에서 일관성을 유지하는 것을 검토할 것.

- `src/app/corporate/recruitment/[jdId]/applicants/[applicantPublicId]/report/_components/report-side-panel.tsx:74` — `<Skeleton className="h-9 w-12 bg-bg-primary" />`에서 `bg-bg-primary`로 override 중. `bg-bg-tertiary` 배경 컨테이너 안에 있어 시각적 의도가 있는 것으로 보이나, 토큰 선택 의도를 주석으로 명시하면 가독성이 향상된다.

- `src/app/corporate/recruitment/[jdId]/applicants/[applicantPublicId]/report/_components/report-header.tsx:51` — `<Skeleton className="size-12 rounded-full bg-primary-300" />`는 아이콘 자리 표시자로 적절하나, 바깥 원(`size-[104px]`) 대비 너무 작아 로딩 상태의 시각적 일관성이 낮다. `size-[104px] rounded-full` 등으로 맞추는 것을 검토할 것.

- `src/app/corporate/dashboard/_components/corporate-dashboard-view.tsx:88-99` — `NotificationSkeleton`의 항목 수가 하드코딩 3개로 고정되어 있어, 실제 렌더링되는 알림 개수와 다를 경우 레이아웃 점프가 발생할 수 있다. 실제 표시 개수 기준으로 맞추는 것을 권고한다.
