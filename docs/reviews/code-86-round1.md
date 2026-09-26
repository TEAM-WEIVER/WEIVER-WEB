# 코드 리뷰 — #86 Round 1

## 판정: PASS

## Critical

없음

## Major

- `toast-container.tsx:9` — `add`를 `useToastStore`에서 별도 구독하면 store 상태 변경 시 `ToastContainer` 전체가 불필요하게 re-render될 수 있음. `add`는 Zustand action이므로 참조가 안정적이긴 하나, `useToastStore.getState().add`로 직접 접근하거나 `useCallback`으로 안정화해 명시적으로 분리하는 것을 권고.
- `toast-container.tsx:12-16` — `window.__toast` 전역 노출이 `process.env.NODE_ENV === 'test'`에만 제한되어 있지만, 해당 코드가 번들에 포함되어 빌드 산출물에 잔류함. Next.js에서 `process.env.NODE_ENV`는 빌드 타임에 트리셰이킹되지만, 실제로 test 빌드를 프로덕션 번들로 배포하는 실수를 막기 위해 해당 전역 노출 블록을 `e2e` 전용 파일 또는 MSW 인터셉터 등으로 분리할 것을 권고.

## Minor

- `toast.tsx:68-69` — `role`과 `aria-live`가 동일 요소에 함께 선언되어 있음. `role="alert"`은 암묵적으로 `aria-live="assertive"`를 포함하므로 `error`/`warning` 타입에서는 `aria-live` 속성이 중복됨. 제거해도 동작에 영향 없으며 코드가 간결해짐.
- `toast.tsx:71` — 배경색 `bg-[#fcfcfc]`, 텍스트 색 `text-[#0f172a]` 등 하드코딩된 색상값이 여러 줄에 산재함. 프로젝트 Tailwind config의 디자인 토큰으로 통일하거나 CSS 변수로 추출하면 테마 일관성이 향상됨.
- `toast-store.ts:22` — ID 생성 시 `Date.now()`와 `Math.random()`을 조합하고 있음. 동시 다발적 토스트 추가 시 중복 가능성은 극히 낮으나, `crypto.randomUUID()`(브라우저·Node 모두 지원)로 교체하면 유일성 보장이 명확해짐.
- `toast.tsx:41` — `timerRef`의 초깃값이 `null`이고 `useEffect`/`handleClose` 양쪽에서 null 체크 후 `clearTimeout`을 호출함. 불필요한 이중 clear 가능성이 있으므로 `handleClose`에서 `timerRef.current = null`로 초기화하는 방어 코드를 추가하면 명확성이 높아짐.
