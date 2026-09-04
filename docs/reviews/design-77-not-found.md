# Design Review — #77 404 Not Found 페이지

- 검토일: 2026-09-04
- 스펙: `docs/plans/77-404-page.md`
- 구현: `src/app/not-found.tsx`
- 결과: **PASS**

## 항목별 대조

| 검토 항목              | 스펙 요구사항                           | 구현 상태                                                    | 판정 |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------ | ---- |
| shadcn/ui Button       | `Button` 컴포넌트 사용 (홈 복귀 CTA)    | `@/components/ui/button`에서 import, `Button asChild`로 적용 | 일치 |
| `<h1>` 텍스트          | "페이지를 찾을 수 없습니다"             | `<h1>`에 동일 문자열 존재                                    | 일치 |
| 홈 복귀 CTA            | `<Link href="/">` + `replace` 옵션 허용 | `<Link href="/" replace>` 사용                               | 일치 |
| 독립 레이아웃          | 헤더·푸터 없는 단독 레이아웃            | `<main>`만 렌더링, 헤더·푸터 없음                            | 일치 |
| 페이지 title           | "404 \| WEIVER"                         | `metadata.title: '404 \| WEIVER'`                            | 일치 |
| 상태 관리              | 불필요 (정적 페이지)                    | 상태 관리 없음, Server Component 유지                        | 일치 |
| 접근성 — `<h1>`        | `<h1>`에 안내 문구 명시                 | `<h1>` 태그 사용 확인                                        | 일치 |
| 접근성 — 키보드 포커스 | `<Link>`로 Tab 이동 가능                | `Button asChild` + `Link` 조합으로 포커스 가능               | 일치 |

## Critical / Major 이슈

없음.
