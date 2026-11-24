import { expect, test } from '@playwright/test';

test('개발 MSW HTTP mock을 통해 로그인·이력서 임시 저장·새로고침 복원·홈 갱신을 수행한다', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/api/'))
      requests.push(
        `${response.request().method()} ${new URL(response.url()).pathname} ${response.status()}`,
      );
  });
  await page.goto('/login');
  await expect(page.getByTestId('mock-api-banner')).toBeVisible();
  await page.getByLabel('이메일', { exact: true }).fill('mock@example.test');
  await page.getByLabel('비밀번호', { exact: true }).fill('MockPassword1!');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL('/home');
  await expect(page.getByRole('region', { name: '내 포인트' }).getByText('300P')).toBeVisible();
  await expect(page.getByRole('button', { name: '로그아웃' })).toHaveCount(0);
  await page.getByRole('button', { name: '이력서 작성하기' }).click();
  await page.getByRole('textbox', { name: '학교명', exact: true }).fill('mock에 저장한 학교');
  await page.getByRole('button', { name: '임시 저장', exact: true }).click();
  await expect(page.getByText('이력서를 임시 저장했어요.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: '학교명', exact: true })).toHaveValue(
    'mock에 저장한 학교',
  );
  await page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('link', { name: '홈', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: '공통 이력서' }).getByText('작성 중'),
  ).toBeVisible();
  await page.getByRole('button', { name: '공고 등록', exact: true }).click();
  await page.getByLabel('회사명 *', { exact: true }).fill('mock 공고 회사');
  await page.getByLabel('포지션명 *', { exact: true }).fill('개발자');
  await page.getByRole('textbox', { name: '채용 공고 내용 *', exact: true }).fill('React 개발');
  await page.getByRole('button', { name: '공고 등록하기' }).click();
  await expect(page).toHaveURL(/\/preparation\/[^/]+$/);
  await page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('link', { name: '홈', exact: true })
    .click();
  await expect(page.getByRole('article', { name: 'mock 공고 회사 개발자' })).toBeVisible();
  expect(requests).toContain('GET /api/home/postings 200');
  expect(requests).toContain('GET /api/home/points 200');
  expect(requests).toContain('PUT /api/resumes/master 200');
});
