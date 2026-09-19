import { test, expect, type Page } from '@playwright/test';

/**
 * 글로벌 토스트/알림 시스템 인수 테스트 (#86)
 *
 * 커버 AC: AC1, AC2, AC3, AC4, AC5, AC6
 *
 * 전제:
 * - Next.js 앱이 http://localhost:3000 에서 실행 중이어야 한다.
 * - `src/store/toast-store.ts`, `src/components/ui/toast.tsx`,
 *   `src/components/common/toast-container.tsx` 가 구현되어 있어야 한다 (ATDD — 구현 전 작성).
 * - ToastContainer 는 루트 레이아웃(`src/app/layout.tsx`)에 포함되어 있어야 한다.
 * - API 연동 없음 — MSW 핸들러 불필요.
 *
 * 토스트 호출 전략:
 * - `page.evaluate()` 로 브라우저 컨텍스트에서 `window.__toast.add()` 를 직접 호출한다.
 * - toast facade는 `NEXT_PUBLIC_E2E_TEST=true`일 때만 `window.__toast`로 노출된다.
 */

// ---------------------------------------------------------------------------
// 공통 헬퍼
// ---------------------------------------------------------------------------

/** toast-store 의 add 액션을 브라우저 컨텍스트에서 직접 호출한다. */
async function addToast(
  page: Page,
  opts: {
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    description?: string;
    duration?: number;
  },
) {
  await page.waitForFunction(() => window.__toast !== undefined);

  await page.evaluate((toastOpts) => {
    // toast-store 가 window.__toast 로 노출되어 있다고 가정
    (window as unknown as { __toast: { add: (o: typeof toastOpts) => void } }).__toast.add(
      toastOpts,
    );
  }, opts);
}

// ---------------------------------------------------------------------------
// AC1. 토스트 기본 표시 — 성공 타입
// ---------------------------------------------------------------------------

test.describe('AC1: 토스트 기본 표시 — 성공 타입', () => {
  test('AC1: success 타입 토스트가 화면에 나타나고 제목 텍스트가 표시된다', async ({ page }) => {
    // Given: 사용자가 임의 페이지에 있고
    await page.goto('/');

    // When: success 타입 toast.add() 가 호출된다
    await addToast(page, { type: 'success', title: '저장되었습니다' });

    // Then: 토스트 카드가 화면에 나타난다
    const toast = page.getByRole('status').filter({ hasText: '저장되었습니다' });
    await expect(toast).toBeVisible();

    // Then: 제목 텍스트가 표시된다
    await expect(toast.getByText('저장되었습니다')).toBeVisible();

    // Then: 닫기 버튼이 렌더링된다 (접근성 속성 검증)
    await expect(toast.getByRole('button', { name: '알림 닫기' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC2. 토스트 기본 표시 — error / info / warning 타입 + description
// ---------------------------------------------------------------------------

test.describe('AC2: 타입별 토스트 표시 및 description 조건부 렌더링', () => {
  test('AC2-a: error 타입 + description 있음 — 제목과 부제목이 모두 표시된다', async ({ page }) => {
    // Given: 임의 페이지에 있고
    await page.goto('/');

    // When: error 타입 + description 포함 toast.add() 호출
    await addToast(page, {
      type: 'error',
      title: '오류가 발생했습니다',
      description: '잠시 후 다시 시도해 주세요',
    });

    // Then: role="alert" 토스트 카드가 표시된다 (error/warning 은 alert)
    const toast = page.getByRole('alert').filter({ hasText: '오류가 발생했습니다' });
    await expect(toast).toBeVisible();

    // Then: 제목이 표시된다
    await expect(toast.getByText('오류가 발생했습니다')).toBeVisible();

    // Then: 부제목(description)이 표시된다
    await expect(toast.getByText('잠시 후 다시 시도해 주세요')).toBeVisible();
  });

  test('AC2-b: warning 타입 + description 있음 — 부제목이 표시된다', async ({ page }) => {
    // Given
    await page.goto('/');

    // When
    await addToast(page, {
      type: 'warning',
      title: '주의가 필요합니다',
      description: '필수 항목을 확인해 주세요',
    });

    // Then: role="alert" 토스트 표시
    const toast = page.getByRole('alert').filter({ hasText: '주의가 필요합니다' });
    await expect(toast).toBeVisible();
    await expect(toast.getByText('필수 항목을 확인해 주세요')).toBeVisible();
  });

  test('AC2-c: info 타입 + description 있음 — 부제목이 표시된다', async ({ page }) => {
    // Given
    await page.goto('/');

    // When
    await addToast(page, {
      type: 'info',
      title: '안내',
      description: '새로운 업데이트가 있습니다',
    });

    // Then: role="status" (info 는 polite)
    const toast = page.getByRole('status').filter({ hasText: '안내' });
    await expect(toast).toBeVisible();
    await expect(toast.getByText('새로운 업데이트가 있습니다')).toBeVisible();
  });

  test('AC2-d: description 없음 — 부제목 영역이 렌더링되지 않는다', async ({ page }) => {
    // Given
    await page.goto('/');

    // When: description 없이 toast.add() 호출
    await addToast(page, { type: 'success', title: '완료' });

    // Then: 제목만 있고 부제목 요소가 없다
    const toast = page.getByRole('status').filter({ hasText: '완료' });
    await expect(toast).toBeVisible();

    // description 을 위한 별도 단락이 존재하지 않아야 한다
    // (description 텍스트가 없으므로 해당 컨테이너가 DOM 에 없어야 함)
    await expect(toast.locator('[data-toast-description]')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// AC3. 자동 소멸 (기본 3000ms)
// ---------------------------------------------------------------------------

test.describe('AC3: 자동 소멸', () => {
  test('AC3: 토스트가 3000ms 경과 후 화면에서 제거된다', async ({ page }) => {
    // Given: 토스트가 표시된 상태
    await page.goto('/');
    await addToast(page, { type: 'success', title: '자동소멸 테스트', duration: 1000 });

    const toast = page.getByRole('status').filter({ hasText: '자동소멸 테스트' });
    await expect(toast).toBeVisible();

    // When: duration(1000ms) 이 경과한다
    // (기본값 3000ms 대신 1000ms 를 사용해 테스트 실행 시간 단축)
    await page.waitForTimeout(1500);

    // Then: 토스트가 화면에서 제거된다
    await expect(toast).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// AC4. 수동 닫기 — X 버튼 클릭
// ---------------------------------------------------------------------------

test.describe('AC4: 수동 닫기', () => {
  test('AC4: X 버튼 클릭 시 해당 토스트가 즉시 제거된다', async ({ page }) => {
    // Given: 토스트가 표시된 상태 (duration 길게 설정해 자동 소멸 방지)
    await page.goto('/');
    await addToast(page, { type: 'info', title: '수동 닫기 테스트', duration: 30000 });

    const toast = page.getByRole('status').filter({ hasText: '수동 닫기 테스트' });
    await expect(toast).toBeVisible();

    // When: 우측 X 닫기 버튼 클릭
    await toast.getByRole('button', { name: '알림 닫기' }).click();

    // Then: 해당 토스트가 즉시 제거된다
    await expect(toast).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// AC5. 다중 토스트 동시 표시
// ---------------------------------------------------------------------------

test.describe('AC5: 다중 토스트 스택 표시', () => {
  test('AC5: 두 번째 toast.add() 호출 시 두 토스트가 동시에 표시되고 서로 겹치지 않는다', async ({
    page,
  }) => {
    // Given: 이미 토스트 1개가 표시 중이다
    await page.goto('/');
    await addToast(page, { type: 'success', title: '첫 번째 알림', duration: 30000 });
    const first = page.getByRole('status').filter({ hasText: '첫 번째 알림' });
    await expect(first).toBeVisible();

    // When: 추가로 toast.add() 가 호출된다
    await addToast(page, { type: 'info', title: '두 번째 알림', duration: 30000 });

    // Then: 두 토스트가 함께 표시된다
    const second = page.getByRole('status').filter({ hasText: '두 번째 알림' });
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();

    // Then: 두 토스트가 서로 겹치지 않는다 (bounding box Y 좌표가 다름)
    const firstBox = await first.boundingBox();
    const secondBox = await second.boundingBox();
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();
    if (firstBox && secondBox) {
      // 두 카드의 Y 위치가 달라야 한다 (스택 방향 무관)
      expect(Math.abs(firstBox.y - secondBox.y)).toBeGreaterThan(0);
      // 두 카드가 수직으로 겹치지 않아야 한다
      const firstBottom = firstBox.y + firstBox.height;
      const secondBottom = secondBox.y + secondBox.height;
      const noOverlap = firstBottom <= secondBox.y || secondBottom <= firstBox.y;
      expect(noOverlap).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// AC6. 글로벌 배치 — 페이지 이동 시 토스트 유지
// ---------------------------------------------------------------------------

test.describe('AC6: 글로벌 배치 — 페이지 이동 시 유지', () => {
  test('AC6: 토스트가 표시된 상태에서 클라이언트 사이드 라우팅 이동 후에도 토스트가 유지된다', async ({
    page,
  }) => {
    // Given: ToastContainer 가 루트 레이아웃에 있고 토스트가 표시 중이다
    await page.goto('/');
    await addToast(page, { type: 'warning', title: '라우팅 유지 테스트', duration: 30000 });

    const toast = page.getByRole('alert').filter({ hasText: '라우팅 유지 테스트' });
    await expect(toast).toBeVisible();

    // When: Next.js 클라이언트 사이드 라우팅으로 다른 페이지로 이동
    // (login 페이지는 항상 존재하는 경로로 가정)
    await page.evaluate(() => {
      // Next.js router.push 를 직접 호출하지 않고 <a> 클릭 또는 history.pushState 사용
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Then: 이동 후에도 토스트가 소멸 시간까지 유지된다
    await expect(toast).toBeVisible();
  });
});
