# Design Review — #86 토스트 컴포넌트 Round 1

검토일: 2026-09-19
검토자: design-reviewer
대상 파일:
- `src/components/ui/toast.tsx`
- `src/components/common/toast-container.tsx`

---

## 판정: FAIL

---

## 불일치 항목

### 1. 컬러 세로 바 — 높이 및 rounded 누락
- **스펙**: height 68px, `rounded-bl-[10px] rounded-tl-[10px]`
- **구현**: height 미지정 (부모 높이에 의존), rounded 미적용 (`w-1 flex-shrink-0`만 있음)
- **파일**: `toast.tsx` line 76

### 2. 카드 전체 rounded — 우측만 적용해야 함
- **스펙**: `rounded-br-[10px] rounded-tr-[10px]` (우측 10px만)
- **구현**: `rounded-lg` (전체 8px 적용)
- **파일**: `toast.tsx` line 71

### 3. 아이콘 크기
- **스펙**: 24×24px
- **구현**: `size={20}` (20px)
- **파일**: `toast.tsx` line 85

### 4. 제목 line-height
- **스펙**: `line-height 20px`
- **구현**: `leading-tight` (약 17.5px, 14px × 1.25)
- **파일**: `toast.tsx` line 91 — `leading-[20px]` 로 변경 필요

### 5. 부제목 line-height
- **스펙**: `line-height 16px`
- **구현**: `leading-tight` (약 15px, 12px × 1.25)
- **파일**: `toast.tsx` line 99 — `leading-[16px]` 로 변경 필요

### 6. 제목 너비
- **스펙**: `w-[220px]`
- **구현**: 미적용 (`flex-1` 내부에서 자유 확장)
- **파일**: `toast.tsx` line 91

### 7. 본문 영역 padding
- **스펙**: `padding 14px`
- **구현**: `px-4 py-3` (좌우 16px, 상하 12px)
- **파일**: `toast.tsx` line 79 — `p-[14px]` 로 변경 필요

### 8. 전체 구조 수직 정렬
- **스펙**: `flex items-center`
- **구현**: `items-start`
- **파일**: `toast.tsx` line 79

---

## 일치 항목

| 항목 | 스펙 | 구현 |
|---|---|---|
| 컬러 세로 바 너비 | 4px | `w-1` (4px) — 일치 |
| 카드 배경색 | `#fcfcfc` | `bg-[#fcfcfc]` — 일치 |
| 아이콘 컨테이너 크기 | 40×40px | `h-10 w-10` (40px) — 일치 |
| 아이콘 컨테이너 rounded | `rounded-[4px]` | `rounded-[4px]` — 일치 |
| 아이콘 배경 opacity | `rgba(R,G,B,0.1)` | hex `1a` (≈10%) — 일치 |
| 제목 폰트 | Medium 14px, `#0f172a`, tracking-[-0.28px] | 모두 일치 |
| 부제목 폰트 | Regular 12px, `#64748b`, tracking-[-0.24px] | 모두 일치 |
| 닫기 버튼 크기 | 18×18px | `h-[18px] w-[18px]` — 일치 |
| 그림자 | `drop-shadow-[0px_8px_12px_rgba(149,157,165,0.2)]` | 일치 |
| 타입별 컬러 (4종) | error/success/warning/info | 모두 일치 |
| 접근성 (role, aria-live, aria-label) | — | 적용됨 |
| 닫기 버튼 aria-label | — | `알림 닫기` 적용됨 |

---

## 수정 요청 요약 (next-dev 전달용)

`src/components/ui/toast.tsx` 에서 아래 8개 항목 수정 필요:

1. 컬러 세로 바에 `h-[68px]`, `rounded-bl-[10px] rounded-tl-[10px]` 추가
2. 카드 wrapper의 `rounded-lg` → `rounded-br-[10px] rounded-tr-[10px]` (우측만)
3. `<Icon size={20}` → `size={24}`
4. 제목 `leading-tight` → `leading-[20px]`
5. 부제목 `leading-tight` → `leading-[16px]`
6. 제목 `<p>`에 `w-[220px]` 추가
7. 본문 영역 `px-4 py-3` → `p-[14px]`
8. 본문 영역 `items-start` → `items-center`
