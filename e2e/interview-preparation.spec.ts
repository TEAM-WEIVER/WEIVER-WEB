import { expect, test, type Page } from '@playwright/test';

test.use({
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
  permissions: ['camera', 'microphone'],
});

type MediaInspection = { requests: MediaStreamConstraints[]; streams: MediaStream[] };
declare global {
  interface Window {
    guideMedia: MediaInspection;
  }
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function mockMember(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('weiver.auth.role', 'APPLICANT');
    sessionStorage.setItem(
      'weiver.preparation.drafts',
      JSON.stringify({
        version: 1,
        state: {
          postings: [
            {
              id: 'guide-posting',
              companyName: '위버',
              positionName: '프론트엔드 개발자',
              content: 'React 서비스 개발',
              sourceUrl: '',
            },
          ],
          resumes: {},
          coverLetters: {},
        },
      }),
    );
    const inspection: MediaInspection = { requests: [], streams: [] };
    window.guideMedia = inspection;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      inspection.requests.push(constraints ?? {});
      const stream = await original(constraints);
      inspection.streams.push(stream);
      return stream;
    };
  });
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { data: { csrfToken: 'mock-csrf' } } }),
  );
  await page.route('**/api/auth/reissue', (route) =>
    route.fulfill({ json: { data: { accessToken: 'mock-token' } } }),
  );
  await page.route('**/api/applicants', (route) =>
    route.fulfill({ json: { data: { ApplicantDTO: { name: '김위버' } } } }),
  );
}

async function next(page: Page) {
  const button = page.getByRole('button', { name: '다음', exact: true });
  await expect(button).toBeEnabled();
  await button.click();
}

async function checkDevices(page: Page) {
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await expect(page.getByRole('heading', { name: /카메라 사용을/ })).toBeFocused();
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '카메라 연결하기' }).click();
  await expect(page.getByText('연결됨', { exact: true })).toBeVisible();
  const video = page.getByLabel('내 카메라 미리보기');
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.videoWidth))
    .toBeGreaterThan(0);
  await next(page);
  await expect(page.getByRole('heading', { name: /마이크 소리를/ })).toBeFocused();
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '마이크 테스트' }).click();
  await expect(page.getByText('입력 확인됨', { exact: true })).toBeVisible();
  await next(page);
  await expect(page.getByRole('heading', { name: /첫 번째는/ })).toBeFocused();
}

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 360, height: 800 },
]) {
  test(`${viewport.width}px 전체 화면 가이드의 높이·버튼 위치와 장비 해제를 검증한다`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockMember(page);
    const interviewRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/interviews/.test(request.url())) interviewRequests.push(request.url());
    });
    await page.goto('/preparation/guide-posting');
    await page.getByRole('button', { name: 'AI 면접 시작' }).click();
    await expect(page).toHaveURL('/preparation/guide-posting/interview/prepare');
    await expect(page.getByRole('heading', { name: /지금부터 면접 준비를/ })).toBeFocused();
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    expect(await page.evaluate(() => window.guideMedia.requests.length)).toBe(0);

    const root = page.getByRole('main', { name: 'AI 면접 준비 가이드' });
    const heights: number[] = [];
    const positions: number[] = [];
    const measure = async (buttonName: string) => {
      heights.push((await root.boundingBox())!.height);
      positions.push(
        (await page.getByRole('button', { name: buttonName, exact: true }).boundingBox())!.y,
      );
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    };
    await measure('시작하기');
    await page.getByRole('button', { name: '시작하기', exact: true }).click();
    await expect(page.getByRole('heading', { name: /카메라 사용을/ })).toBeFocused();
    await measure('다음');
    await page.getByRole('button', { name: '카메라 연결하기' }).click();
    await expect(page.getByText('연결됨', { exact: true })).toBeVisible();
    await next(page);
    await expect(page.getByRole('heading', { name: /마이크 소리를/ })).toBeFocused();
    await measure('다음');
    await page.getByRole('button', { name: '마이크 테스트' }).click();
    await expect(page.getByText('입력 확인됨', { exact: true })).toBeVisible();
    await next(page);
    await expect(page.getByRole('heading', { name: /첫 번째는/ })).toBeFocused();
    await measure('다음');
    await next(page);
    await expect(page.getByRole('heading', { name: /두 번째는/ })).toBeFocused();
    await measure('다음');
    await next(page);
    await expect(page.getByRole('heading', { name: /시작하기 전에/ })).toBeFocused();
    await measure('AI 면접 시작');
    await page.getByRole('checkbox').check();
    await measure('AI 면접 시작');
    await expect(page.getByRole('button', { name: 'AI 면접 시작' })).toBeDisabled();
    await expect(page.getByText('실제 면접 연결 기능은 준비 중이에요.')).toBeVisible();
    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toBe(viewport.height);
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
    expect(interviewRequests).toEqual([]);

    await page.getByRole('button', { name: '가이드 닫기' }).click();
    await expect(page).toHaveURL('/preparation/guide-posting');
    expect(
      await page.evaluate(() =>
        window.guideMedia.streams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === 'ended'),
        ),
      ),
    ).toBe(true);
  });
}

test('작은 모바일에서 다음·이전 단계로 이동할 때 본문 스크롤을 초기화한다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 568 });
  await mockMember(page);
  await page.goto('/preparation/guide-posting/interview/prepare');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.getByRole('button', { name: '카메라 연결하기' }).click();
  await expect(page.getByText('연결됨', { exact: true })).toBeVisible();
  const viewport = page.locator('[data-phase]').locator('..');
  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await next(page);
  await expect(page.getByRole('heading', { name: /마이크 소리를/ })).toBeFocused();
  expect(await viewport.evaluate((element) => element.scrollTop)).toBe(0);
  const heading = await page.getByRole('heading', { name: /마이크 소리를/ }).boundingBox();
  expect(heading!.y).toBeGreaterThanOrEqual((await viewport.boundingBox())!.y);
  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.getByRole('button', { name: '이전', exact: true }).click();
  await expect(page.getByRole('heading', { name: /카메라 사용을/ })).toBeFocused();
  expect(await viewport.evaluate((element) => element.scrollTop)).toBe(0);
});

test('장비 연결이 끊기면 최종 시작을 막고 해당 확인 단계로 돌아간다', async ({ page }) => {
  await mockMember(page);
  await page.goto('/preparation/guide-posting/interview/prepare');
  await checkDevices(page);
  await next(page);
  await next(page);
  await expect(page.getByRole('checkbox')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.evaluate(() => {
    const track = window.guideMedia.streams[0].getVideoTracks()[0];
    track.stop();
    track.dispatchEvent(new Event('ended'));
  });
  await expect(page.getByRole('button', { name: 'AI 면접 시작' })).toBeDisabled();
  await page.getByRole('button', { name: '카메라 다시 확인' }).click();
  await expect(page.getByRole('heading', { name: /카메라 사용을/ })).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('연결이 끊겼어요');
});

test('직접 접근·새로고침·인증·없는 공고를 처리한다', async ({ page }) => {
  await page.goto('/preparation/guide-posting/interview/prepare');
  await expect(page).toHaveURL('/login');
  await mockMember(page);
  expect((await page.goto('/preparation/guide-posting/interview/prepare'))?.status()).toBe(200);
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: /지금부터 면접 준비를/ })).toBeVisible();
  expect(await page.evaluate(() => window.guideMedia.requests.length)).toBe(0);
  await page.goto('/preparation/missing/interview/prepare');
  await expect(page.getByRole('heading', { name: '공고를 찾을 수 없어요.' })).toBeVisible();
});

test('첫 화면 문구 등장과 다음·이전 방향, 연속 클릭 및 모션 감소를 확인한다', async ({ page }) => {
  await mockMember(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/preparation/guide-posting/interview/prepare');
  await expect(page.locator('[data-reveal]')).toHaveCount(3);
  const reveal = await page.locator('[data-reveal]').evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return { duration: style.animationDuration, delay: style.animationDelay };
    }),
  );
  expect(reveal).toEqual([
    { duration: '0.52s', delay: '0s' },
    { duration: '0.52s', delay: '0.16s' },
    { duration: '0.52s', delay: '0.32s' },
  ]);
  await page
    .getByRole('button', { name: '시작하기', exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(page.getByRole('heading', { name: /카메라 사용을/ })).toBeFocused();
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-direction', 'next');
  await page.getByRole('button', { name: '이전', exact: true }).click();
  await expect(page.getByRole('heading', { name: /지금부터 면접 준비를/ })).toBeFocused();
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-direction', 'previous');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase', 'idle');
  await expect(page.getByRole('heading', { name: /카메라 사용을/ })).toBeFocused();
});
