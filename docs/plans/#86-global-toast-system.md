# [#86] 글로벌 토스트/알림 시스템 구축

## User Story

**US1 (지원자/기업 공통):**
플랫폼 사용자로서, 내가 수행한 액션(저장, 제출, 오류 등)의 결과를 화면 어디서든 일관된 방식으로 즉시 확인하고 싶다. 왜냐하면 현재 피드백 수단이 인라인 텍스트·배너·모달로 혼재되어 있어 어디를 봐야 하는지 혼란스럽기 때문이다.

**US2 (개발자 관점):**
프론트엔드 개발자로서, 어느 컴포넌트에서도 `toast.add()` 한 줄로 사용자 알림을 띄우고 싶다. 왜냐하면 매번 로컬 상태와 UI를 직접 구현하면 중복 코드가 발생하고 일관성이 깨지기 때문이다.

---

## Acceptance Criteria

### AC1. 토스트 기본 표시 — 성공 타입

- **Given:** 사용자가 플랫폼의 임의 페이지에 있고, `toast.add({ type: 'success', title: '저장되었습니다' })`가 호출된다.
- **When:** 호출 직후.
- **Then:**
  - 화면 우측 하단(또는 우측 상단 — 디자인 확정 위치)에 토스트 카드가 나타난다.
  - 왼쪽에 4px 컬러 세로 바(`success` 색상), 흰 배경 카드, 타입에 맞는 아이콘(40×40px 라운드)이 렌더링된다.
  - 제목 텍스트(Pretendard Medium 14px)가 표시된다.
  - 드롭 섀도우가 적용된다.

### AC2. 토스트 기본 표시 — error / info / warning 타입

- **Given:** 임의 컴포넌트에서 `toast.add({ type: 'error' | 'info' | 'warning', title: '...', description: '...' })`가 호출된다.
- **When:** 호출 직후.
- **Then:**
  - 타입별 컬러 세로 바와 아이콘이 정확히 적용된다(`error`: `#ef4444`, `warning`: amber 계열, `info`: blue 계열).
  - `description`이 전달된 경우 부제목 텍스트(Regular 12px)가 제목 아래에 표시된다.
  - `description`이 없는 경우 부제목 영역이 렌더링되지 않는다.

### AC3. 자동 소멸

- **Given:** 토스트가 화면에 표시된 상태이다.
- **When:** 기본 3000ms가 경과한다.
- **Then:** 토스트가 화면에서 제거된다(페이드 아웃 또는 슬라이드 아웃 애니메이션 포함).

### AC4. 수동 닫기

- **Given:** 토스트가 화면에 표시된 상태이다.
- **When:** 사용자가 우측 상단 X 버튼을 클릭한다.
- **Then:** 해당 토스트가 즉시 제거된다. 자동 소멸 타이머도 함께 정리된다.

### AC5. 다중 토스트 동시 표시

- **Given:** 이미 토스트 1개가 표시 중이다.
- **When:** 추가로 `toast.add()`가 호출된다.
- **Then:** 두 토스트가 스택(수직 방향)으로 함께 표시되며 서로 겹치지 않는다.

### AC6. 글로벌 배치 — 페이지 이동 시 유지

- **Given:** `ToastContainer`가 루트 레이아웃(`src/app/layout.tsx`)에 배치되어 있다.
- **When:** 토스트가 표시된 상태에서 Next.js 클라이언트 사이드 라우팅으로 다른 페이지로 이동한다.
- **Then:** 이동 후에도 표시 중이던 토스트가 소멸 시간까지 유지된다.

### AC7. 크리티컬 에러 — store 초기화 실패

- **Given:** Zustand `toast-store`가 정상 초기화되지 않은 상태(SSR hydration 불일치 등)이다.
- **When:** `toast.add()`가 호출된다.
- **Then:** 에러가 throw되지 않고 조용히 실패하며, 콘솔에 경고 메시지가 출력된다(런타임 크래시 방지).

---

## API 연동

토스트 시스템은 **프론트엔드 전용** 기능으로 백엔드 API 연동이 없습니다.

| AC  | 메서드 | 엔드포인트 | 비고 |
| --- | ------ | ---------- | ---- |
| 전체 | -     | -          | 프론트 전용, API 불필요 |

> API 스펙 조회(https://api.piuda.site/v3/api-docs)를 시도하였으나 토스트/알림 관련 엔드포인트는 존재하지 않으며, 이슈 요건 상 백엔드 연동은 해당 없음.

---

## 컴포넌트 스펙

**구현 대상 파일:**

| 파일 | 역할 |
| ---- | ---- |
| `src/store/toast-store.ts` | Zustand 스토어 — 토스트 목록 상태, `add` / `remove` 액션 |
| `src/components/ui/toast.tsx` | 단일 Toast 카드 컴포넌트 (타입별 색상·아이콘 분기) |
| `src/components/common/toast-container.tsx` | 토스트 목록 렌더 + 화면 위치 고정 |

**사용할 shadcn/ui 컴포넌트:**
- `pnpm dlx shadcn@latest add toast` 설치 후 커스터마이징
- 기존 shadcn Toast 프리미티브를 Radix UI 기반 접근성 지원으로 활용

**toast-store 인터페이스 (예시):**

```ts
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // 기본값 3000ms
}

interface ToastStore {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
}
```

**상태 관리:**
- Zustand `toast-store`에서 전역 관리
- `add()` 호출 시 내부에서 `uuid` 또는 `Date.now()` 기반 id 부여
- 타이머는 `Toast` 컴포넌트 내 `useEffect`에서 관리 (언마운트 시 clearTimeout)

**접근성 주의사항:**
- `role="status"` (success/info) 또는 `role="alert"` (error/warning) 부여
- `aria-live="polite"` (success/info) / `aria-live="assertive"` (error/warning)
- X 닫기 버튼: `aria-label="알림 닫기"` 필수
- 키보드: 닫기 버튼 Tab 포커스 및 Enter/Space 동작

---

## 향후 고려사항

> AC에서 제외한 엣지 케이스 및 낮은 우선순위 항목

- **최대 표시 개수 제한:** 동시에 N개 초과 시 오래된 토스트 자동 제거 (스택 오버플로우 방지)
- **duration 0 or Infinity 처리:** `duration: 0`을 '자동 소멸 안 함'으로 해석할지 명세 필요
- **마우스 호버 시 타이머 일시 정지:** UX 개선 옵션 (접근성 WCAG 2.1 SC 2.2.3 관련)
- **토스트 위치 커스터마이징:** 현재 우측 하단 고정 → 향후 위치 옵션(`top-right`, `bottom-center` 등) 지원 고려
- **애니메이션 세부 스펙:** Figma에 진입/퇴장 모션 명세가 없으므로 구현 시 개발 재량 또는 디자이너 협의 필요
- **중복 토스트 방지:** 동일 메시지가 짧은 간격으로 여러 번 호출될 때 deduplication 로직
- **SSR hydration mismatch:** 서버에서 id를 생성하면 클라이언트와 불일치 가능 — `useId` 또는 클라이언트 전용 생성 전략 검토
