import { test, expect } from '@playwright/test';

const AUTH_ROLE_STORAGE_KEY = 'weiver.auth.role';

async function setAuthRole(page: import('@playwright/test').Page, role: 'APPLICANT' | 'COMPANY') {
  await page.addInitScript(
    ({ storageKey, storageValue }) => {
      window.sessionStorage.setItem(storageKey, storageValue);
    },
    { storageKey: AUTH_ROLE_STORAGE_KEY, storageValue: role },
  );

  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'OK',
        code: 200,
        data: { csrfToken: 'mock-token' },
        message: 'OK',
      }),
    }),
  );

  await page.route('**/api/auth/reissue', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'OK',
        code: 200,
        data: { accessToken: 'mock-access-token' },
        message: 'OK',
      }),
    }),
  );
}

/**
 * Skeleton / Spinner 공통 컴포넌트 추상화 인수 테스트 (#88)
 *
 * 커버 AC: AC1, AC2, AC3, AC4
 *
 * 전제:
 * - Next.js 앱이 http://localhost:3000 에서 실행 중이어야 한다.
 * - `src/components/ui/skeleton.tsx`, `src/components/ui/spinner.tsx`가 구현되어야 한다 (ATDD — 구현 전 작성).
 * - API 연동 없음 → MSW 핸들러 불필요.
 *
 * 검증 전략:
 * - AC1/AC2 컴포넌트 속성: 각 페이지에서 API 응답을 지연시켜 로딩 상태를 유발한 뒤 DOM 속성을 검증한다.
 * - AC3 Button isLoading: 면접 시작 화면에서 isConnecting 상태의 버튼을 검증한다.
 * - AC4 교체 결과: 로딩 상태 UI가 animate-pulse 인라인 div가 아닌 Skeleton 컴포넌트로 렌더링됨을 검증한다.
 */

// ---------------------------------------------------------------------------
// AC1. Skeleton 프리미티브 컴포넌트 — 기본 클래스 및 className 주입
// ---------------------------------------------------------------------------

test.describe('AC1: Skeleton 컴포넌트 기본 속성', () => {
  test('AC1-a: 기업 대시보드 로딩 중 기업 요약 스켈레톤이 animate-pulse 효과와 함께 렌더링된다', async ({
    page,
  }) => {
    // Given: 기업 대시보드 API가 지연되어 로딩 상태가 지속되는 상황
    await page.route('**/api/**', (route) => {
      // 응답을 보내지 않아 로딩 상태를 유지한다
      // 단, 인증 관련 요청은 통과시킨다
      const url = route.request().url();
      if (url.includes('/auth/csrf') || url.includes('/auth/reissue')) {
        return route.continue();
      }
      // 나머지 API는 지연 후 타임아웃 — 로딩 상태 유지
      return new Promise(() => undefined);
    });

    // When: 기업 대시보드에 접근
    await setAuthRole(page, 'COMPANY');
    await page.goto('/corporate/dashboard');

    // Then: 기업 요약 로딩 중 aria-label을 가진 스켈레톤 섹션이 표시된다
    const companySkeleton = page.getByRole('region', { name: '기업 요약 로딩 중' });
    await expect(companySkeleton).toBeVisible({ timeout: 5000 });
  });

  test('AC1-b: 기업 대시보드 로딩 중 매칭 알림 스켈레톤이 렌더링된다', async ({ page }) => {
    // Given: 기업 대시보드 API가 지연되어 로딩 상태가 지속되는 상황
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/auth/csrf') || url.includes('/auth/reissue')) {
        return route.continue();
      }
      return new Promise(() => undefined);
    });

    // When: 기업 대시보드에 접근
    await setAuthRole(page, 'COMPANY');
    await page.goto('/corporate/dashboard');

    // Then: 매칭 알림 로딩 중 aria-label을 가진 스켈레톤 섹션이 표시된다
    const notificationSkeleton = page.getByRole('region', { name: '매칭 알림 로딩 중' });
    await expect(notificationSkeleton).toBeVisible({ timeout: 5000 });
  });

  test('AC1-c: Skeleton 컴포넌트는 animate-pulse 애니메이션을 가진 요소를 렌더링한다', async ({
    page,
  }) => {
    // Given: 기업 대시보드 API 지연으로 로딩 상태
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/auth/csrf') || url.includes('/auth/reissue')) {
        return route.continue();
      }
      return new Promise(() => undefined);
    });

    // When: 기업 대시보드에 접근
    await setAuthRole(page, 'COMPANY');
    await page.goto('/corporate/dashboard');

    // Then: animate-pulse 클래스를 가진 스켈레톤 요소가 존재한다
    await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// AC2. Spinner 컴포넌트 — role="status", aria-label
// ---------------------------------------------------------------------------

test.describe('AC2: Spinner 컴포넌트 접근성 속성', () => {
  test('AC2-a: isLoading 상태의 Button 내부 Spinner는 role="status" 속성을 가진다', async ({
    page,
  }) => {
    // Given: 카메라·마이크 권한을 모두 모킹하여 면접 시작 화면을 빠르게 진입
    await page.addInitScript(() => {
      // getUserMedia 모킹 — 권한 거부 없이 빈 스트림 반환
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: () => Promise.reject(new Error('권한 거부')),
        },
      });
    });

    await page.route('**/api/auth/csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'OK',
          code: 200,
          data: { csrfToken: 'mock-token' },
          message: 'OK',
        }),
      }),
    );

    await page.route('**/api/auth/reissue', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'OK',
          code: 200,
          data: { accessToken: 'mock-access-token' },
          message: 'OK',
        }),
      }),
    );

    // When: 면접 시작 화면에 접근하고 체크박스를 모두 선택 후 면접 시작
    await setAuthRole(page, 'APPLICANT');
    await page.goto('/applicant/interview');

    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();

    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    // WebSocket이 연결되지 않아 isConnecting 상태를 유지할 수 있도록 WS를 차단
    await page.routeWebSocket(/ws/, (ws) => {
      // 연결만 맺고 CONNECTED 응답을 보내지 않아 연결 중 상태를 유지
      ws.onMessage(() => {
        // intentionally no response — keeps isConnecting true
      });
    });

    await page.getByRole('button', { name: '면접 시작하기' }).click();

    // Then: isLoading/isConnecting 상태의 버튼 내 Spinner가 role="status"를 가진다
    await expect(page.getByRole('status').first()).toBeVisible({ timeout: 3000 });
  });

  test('AC2-b: Spinner는 aria-label이 "로딩 중"이거나 커스텀 값을 가진다', async ({ page }) => {
    // Given: 면접 시작 화면에서 연결 중 상태 시뮬레이션
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: () => Promise.reject(new Error('권한 거부')),
        },
      });
    });

    await page.route('**/api/auth/csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'OK',
          code: 200,
          data: { csrfToken: 'mock-token' },
          message: 'OK',
        }),
      }),
    );

    await page.route('**/api/auth/reissue', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'OK',
          code: 200,
          data: { accessToken: 'mock-access-token' },
          message: 'OK',
        }),
      }),
    );

    await setAuthRole(page, 'APPLICANT');
    await page.goto('/applicant/interview');

    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();

    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    await page.routeWebSocket(/ws/, (ws) => {
      ws.onMessage(() => {
        // intentionally no response
      });
    });

    await page.getByRole('button', { name: '면접 시작하기' }).click();

    // Then: role="status" 요소가 렌더링되고 aria-label 속성을 가진다
    const spinner = page.getByRole('status').first();
    await expect(spinner).toBeVisible({ timeout: 3000 });
    await expect(spinner).toHaveAttribute('aria-label');
  });
});

// ---------------------------------------------------------------------------
// AC3. Button isLoading prop — Spinner 렌더링 + disabled 처리
// ---------------------------------------------------------------------------

test.describe('AC3: Button isLoading prop', () => {
  test('AC3-a: isLoading 상태의 버튼은 disabled이며 Spinner가 내부에 렌더링된다', async ({
    page,
  }) => {
    // Given: 면접 시작 화면 진입, 연결 중 상태
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: () => Promise.reject(new Error('권한 거부')),
        },
      });
    });

    await page.route('**/api/auth/csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'OK',
          code: 200,
          data: { csrfToken: 'mock-token' },
          message: 'OK',
        }),
      }),
    );

    await page.route('**/api/auth/reissue', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'OK',
          code: 200,
          data: { accessToken: 'mock-access-token' },
          message: 'OK',
        }),
      }),
    );

    await setAuthRole(page, 'APPLICANT');
    await page.goto('/applicant/interview');

    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();

    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    await page.routeWebSocket(/ws/, (ws) => {
      ws.onMessage(() => {
        // intentionally no response — maintains connecting state
      });
    });

    // When: 면접 시작 버튼 클릭 (연결 중 상태로 전환)
    await page.getByRole('button', { name: '면접 시작하기' }).click();

    // Then: 버튼이 disabled 상태이다
    const startButton = page.getByRole('button', { name: /면접 시작하기|연결 중/ });
    await expect(startButton).toBeDisabled({ timeout: 3000 });

    // Then: Spinner(role="status")가 버튼 영역 내에 렌더링된다
    await expect(page.getByRole('status').first()).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// AC4. 인라인 animate-pulse → Skeleton 컴포넌트 교체 검증
// ---------------------------------------------------------------------------

test.describe('AC4: 인라인 스켈레톤을 Skeleton 컴포넌트로 교체', () => {
  test('AC4-a: 기업 대시보드 로딩 시 기업 요약 스켈레톤 UI가 시각적으로 정상 표시된다', async ({
    page,
  }) => {
    // Given: API 지연으로 로딩 상태 유지
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/auth/csrf') || url.includes('/auth/reissue')) {
        return route.continue();
      }
      return new Promise(() => undefined);
    });

    // When: 기업 대시보드 접근
    await setAuthRole(page, 'COMPANY');
    await page.goto('/corporate/dashboard');

    // Then: 기업 요약 스켈레톤 섹션이 표시된다 (animate-pulse 래퍼 포함)
    const companySkeleton = page.getByRole('region', { name: '기업 요약 로딩 중' });
    await expect(companySkeleton).toBeVisible({ timeout: 5000 });

    // Then: 스켈레톤 섹션 내부에 animate-pulse 요소가 존재한다
    await expect(companySkeleton.locator('.animate-pulse').first()).toBeVisible();
  });

  test('AC4-b: 기업 대시보드 로딩 시 매칭 알림 스켈레톤 UI가 시각적으로 정상 표시된다', async ({
    page,
  }) => {
    // Given: API 지연으로 로딩 상태 유지
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/auth/csrf') || url.includes('/auth/reissue')) {
        return route.continue();
      }
      return new Promise(() => undefined);
    });

    // When: 기업 대시보드 접근
    await setAuthRole(page, 'COMPANY');
    await page.goto('/corporate/dashboard');

    // Then: 매칭 알림 스켈레톤 섹션이 표시된다
    const notificationSkeleton = page.getByRole('region', { name: '매칭 알림 로딩 중' });
    await expect(notificationSkeleton).toBeVisible({ timeout: 5000 });

    // Then: 스켈레톤 섹션 내부에 animate-pulse 요소가 존재한다
    await expect(notificationSkeleton.locator('.animate-pulse').first()).toBeVisible();
  });

  test('AC4-c: 면접 시작 화면에서 카메라 확인 중 스켈레톤이 렌더링된다', async ({ page }) => {
    // Given: getUserMedia가 지연(미해결 Promise)되어 카메라 상태가 "checking"
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          // 해결되지 않는 Promise → cameraStatus가 'checking'으로 유지
          getUserMedia: () => new Promise(() => undefined),
        },
      });
    });

    await page.route('**/api/auth/csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'OK',
          code: 200,
          data: { csrfToken: 'mock-token' },
          message: 'OK',
        }),
      }),
    );

    await page.route('**/api/auth/reissue', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'OK',
          code: 200,
          data: { accessToken: 'mock-access-token' },
          message: 'OK',
        }),
      }),
    );

    // When: 면접 시작 화면에 접근
    await setAuthRole(page, 'APPLICANT');
    await page.goto('/applicant/interview');

    // Then: 카메라 확인 섹션이 표시된다
    await expect(page.getByText('카메라 확인')).toBeVisible({ timeout: 5000 });

    // Then: 카메라 로딩(checking) 상태에서 animate-pulse 스켈레톤이 렌더링된다
    await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 3000 });

    // Then: 카메라 상태가 "확인 중..."으로 표시된다
    await expect(page.getByText('확인 중...', { exact: true }).first()).toBeVisible();
  });

  test('AC4-d: 지원자 보고서 페이지 로딩 시 보고서 헤더 스켈레톤이 표시된다', async ({ page }) => {
    // Given: 보고서 API 응답이 지연되어 로딩 상태 유지
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/auth/csrf') || url.includes('/auth/reissue')) {
        return route.continue();
      }
      return new Promise(() => undefined);
    });

    // When: 지원자 보고서 페이지에 접근 (임의의 ID 사용)
    await setAuthRole(page, 'COMPANY');
    await page.goto('/corporate/recruitment/1/applicants/mock-applicant-id/report');

    // Then: 로딩 상태에서 스켈레톤이 렌더링된다 (animate-pulse 요소 확인)
    await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 5000 });
  });

  test('AC4-e: 지원자 목록 페이지 로딩 시 테이블 스켈레톤이 표시된다', async ({ page }) => {
    // Given: 지원자 목록 API 응답이 지연되어 로딩 상태 유지
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/auth/csrf') || url.includes('/auth/reissue')) {
        return route.continue();
      }
      return new Promise(() => undefined);
    });

    // When: 지원자 목록 페이지에 접근 (임의의 JD ID 사용)
    await setAuthRole(page, 'COMPANY');
    await page.goto('/corporate/recruitment/1');

    // Then: 로딩 상태에서 스켈레톤이 렌더링된다
    await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 5000 });
  });
});
