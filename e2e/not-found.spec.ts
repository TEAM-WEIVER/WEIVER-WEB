import { test, expect } from '@playwright/test';

/**
 * 404 Not Found 페이지 인수 테스트 (#77)
 *
 * 커버 AC: AC1, AC2, AC3, AC4
 *
 * 전제:
 * - Next.js 앱이 http://localhost:3000 에서 실행 중이어야 한다.
 * - `src/app/not-found.tsx`가 구현되어 있어야 한다 (ATDD — 구현 전 작성).
 * - API 연동 없음 → MSW 핸들러 불필요.
 */

// ---------------------------------------------------------------------------
// AC1. 존재하지 않는 경로 접근 시 404 페이지 노출
// ---------------------------------------------------------------------------

test.describe('AC1: 존재하지 않는 경로 접근 시 404 페이지 노출', () => {
  test('AC1-a: 정의되지 않은 최상위 경로 접근 시 404 안내 메시지와 홈 복귀 버튼이 표시된다', async ({
    page,
  }) => {
    // Given: 인증 여부와 무관하게 어떤 사용자가

    // When: 앱 내에 정의되지 않은 URL 경로(/abc)로 접근
    await page.goto('/abc');

    // Then: 404 안내 메시지가 표시된다
    await expect(page.getByText('페이지를 찾을 수 없습니다', { exact: false })).toBeVisible();

    // Then: 홈으로 이동하는 버튼이 표시된다
    await expect(page.getByRole('link', { name: /홈/ })).toBeVisible();
  });

  test('AC1-b: 정의되지 않은 중첩 경로 접근 시 404 안내 메시지와 홈 복귀 버튼이 표시된다', async ({
    page,
  }) => {
    // Given: 인증 여부와 무관하게 어떤 사용자가

    // When: 앱 내에 정의되지 않은 중첩 URL 경로(/applicant/xyz)로 접근
    await page.goto('/applicant/xyz');

    // Then: 404 안내 메시지가 표시된다
    await expect(page.getByText('페이지를 찾을 수 없습니다', { exact: false })).toBeVisible();

    // Then: 홈으로 이동하는 버튼이 표시된다
    await expect(page.getByRole('link', { name: /홈/ })).toBeVisible();
  });

  test('AC1-c: 직접 접근(SSR) 시 HTTP 응답 상태 코드가 404이다', async ({ request }) => {
    // Given: 정의되지 않은 URL에 직접(서버) 접근

    // When: HTTP GET 요청
    const response = await request.get('/abc');

    // Then: 응답 상태 코드 404
    expect(response.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// AC2. 홈 복귀 버튼 동작
// ---------------------------------------------------------------------------

test.describe('AC2: 홈 복귀 버튼 동작', () => {
  test('AC2: 404 페이지에서 홈으로 이동 버튼 클릭 시 / 경로로 이동한다', async ({ page }) => {
    // Given: 404 페이지가 렌더링된 상태
    await page.goto('/존재하지않는경로');
    await expect(page.getByText('페이지를 찾을 수 없습니다', { exact: false })).toBeVisible();

    // When: 홈으로 이동 버튼 클릭
    await page.getByRole('link', { name: /홈/ }).click();

    // Then: / 경로로 이동한다
    await expect(page).toHaveURL('/');
  });
});

// ---------------------------------------------------------------------------
// AC3. Unmatched URL 접근 시 공통 404 페이지 적용
// ---------------------------------------------------------------------------

test.describe('AC3: Unmatched URL 접근 시 공통 404 페이지 적용', () => {
  test('AC3: 공통 not-found.tsx가 렌더링되며 헤더·푸터 없이 독립 레이아웃으로 표시된다', async ({
    page,
  }) => {
    // Given: 정적으로 정의되지 않은 URL에 직접 접근

    // When: Next.js 라우터가 일치하는 세그먼트를 찾지 못하는 경로로 이동
    await page.goto('/this-route-does-not-exist');

    // Then: 404 안내 메시지가 표시된다
    await expect(page.getByText('페이지를 찾을 수 없습니다', { exact: false })).toBeVisible();

    // Then: 공통 헤더(로고, 네비게이션)가 표시되지 않는다
    await expect(page.getByRole('banner')).toHaveCount(0);

    // Then: 공통 푸터가 표시되지 않는다
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// AC4. 접근성 — 페이지 제목 및 헤딩
// ---------------------------------------------------------------------------

test.describe('AC4: 접근성 — 페이지 제목 및 헤딩', () => {
  test('AC4: 404 페이지 title이 "404 | WEIVER"이고 h1에 "페이지를 찾을 수 없습니다"가 포함된다', async ({
    page,
  }) => {
    // Given: 404 페이지가 렌더링된 상태

    // When: 브라우저가 페이지를 파싱
    await page.goto('/page-not-found-test');

    // Then: 페이지 title이 "404 | WEIVER"로 설정된다
    await expect(page).toHaveTitle('404 | WEIVER');

    // Then: h1에 "페이지를 찾을 수 없습니다" 문자열이 포함된다
    await expect(
      page.getByRole('heading', { level: 1, name: /페이지를 찾을 수 없습니다/ }),
    ).toBeVisible();
  });
});
