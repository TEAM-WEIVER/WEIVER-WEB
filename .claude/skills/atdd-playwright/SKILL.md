---
name: atdd-playwright
description: AC의 Given/When/Then을 Playwright 인수 테스트로 변환하는 ATDD 스킬. 구현 전 테스트 먼저 작성.
---

# ATDD with Playwright

AC(Acceptance Criteria)의 Given/When/Then 구조를 Playwright 테스트 코드로 변환한다.

## 변환 패턴

### AC 입력

```
Given: 로그인하지 않은 사용자가 /onboarding 페이지에 접근할 때
When:  페이지 진입을 시도한다
Then:  /login 페이지로 리다이렉트된다
```

### Playwright 출력

```typescript
test('비로그인 사용자는 /login으로 리다이렉트된다', async ({ page }) => {
  // Given
  await page.goto('/onboarding');

  // When & Then
  await expect(page).toHaveURL('/login');
});
```

## 셀렉터 우선순위

1. `getByRole` (button, textbox, heading 등)
2. `getByLabel` (폼 입력)
3. `getByText`
4. `getByTestId` (최후 수단)

## 파일 구조

```
e2e/
  #이슈번호-기능명.spec.ts
```

## 실행

```bash
pnpm exec playwright test
```

## 규칙

- 구현 전 작성 — 처음엔 실패해야 정상 (Red → Green → Refactor)
- AC 하나 = 테스트 케이스 하나
- 성공 케이스 + 주요 실패 케이스 모두 작성
