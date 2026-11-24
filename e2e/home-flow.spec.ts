import { expect, test, type Page } from '@playwright/test';

import { mockHomeApis } from './mocks/home-api';

const education = {
  level: '대학교 (4년제)',
  school: '위버대학교',
  major: '컴퓨터공학',
  grade: '4.1',
  gradeScale: '4.5',
  startMonth: '2020.03',
  endMonth: '2024.02',
  status: '졸업',
};
const master = { education: [education], career: [], certifications: [], awards: [] };

async function mockMember(page: Page, complete = false) {
  await page.addInitScript(() => sessionStorage.setItem('weiver.auth.role', 'APPLICANT'));
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { data: { csrfToken: 'mock-csrf' } } }),
  );
  await page.route('**/api/auth/reissue', (route) =>
    route.fulfill({ json: { data: { accessToken: 'mock-token' } } }),
  );
  await page.route('**/api/applicants', (route) =>
    route.fulfill({ json: { data: { ApplicantDTO: { name: '김위버' } } } }),
  );
  await mockHomeApis(page, complete ? master : null);
}

test('홈에서 새 이력서로 진입하고 임시 저장한 값을 새로고침 후 복원한다', async ({ page }) => {
  await mockMember(page);
  await page.goto('/home');
  await expect(page.getByRole('button', { name: '로그아웃' })).toHaveCount(0);
  const resume = page.getByRole('region', { name: '공통 이력서' });
  await expect(resume.getByText('미작성')).toBeVisible();
  await page.getByRole('button', { name: '이력서 작성하기' }).click();
  await expect(page).toHaveURL('/resume/master');
  await expect(page.getByRole('navigation', { name: '작성 필요 서류' })).not.toContainText(
    '자기소개서',
  );
  await page.getByRole('textbox', { name: '학교명', exact: true }).fill('임시 저장한 학교');
  await page.getByRole('button', { name: '임시 저장', exact: true }).click();
  await expect(page.getByText('이력서를 임시 저장했어요.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: '학교명', exact: true })).toHaveValue(
    '임시 저장한 학교',
  );
  await page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('link', { name: '홈', exact: true })
    .click();
  await expect(page).toHaveURL('/home');
  await expect(resume.getByText('작성 중')).toBeVisible();
});

test('저장 실패 시 입력을 유지하고 재시도 성공 시 홈 상태와 재진입 값을 갱신한다', async ({
  page,
}) => {
  await mockMember(page, true);
  let saves = 0;
  await page.route('**/api/resumes/master', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    saves += 1;
    if (saves === 1) return route.fulfill({ status: 500, json: { message: '실패' } });
    return route.fallback();
  });
  await page.goto('/home');
  await page.getByRole('button', { name: '이력서 수정하기' }).click();
  await page.getByRole('button', { name: /위버대학교.*수정/ }).click();
  const school = page.getByRole('textbox', { name: '학교명', exact: true });
  await school.fill('수정한 학교');
  await page.getByRole('button', { name: '저장하고 홈으로' }).click();
  await expect(page.getByRole('alert')).toContainText('입력한 내용은 유지돼요');
  await expect(school).toHaveValue('수정한 학교');
  await page.getByRole('button', { name: '저장하고 홈으로' }).click();
  await expect(page).toHaveURL('/home');
  expect(saves).toBe(2);
  await expect(
    page.getByRole('region', { name: '공통 이력서' }).getByText('작성 중'),
  ).toBeVisible();
  await page.getByRole('button', { name: '이력서 수정하기' }).click();
  await expect(page.getByRole('heading', { name: /수정한 학교/ })).toBeVisible();
});

test('홈 요청 실패와 빈 데이터를 구분하고 이력서 재시도만 갱신한다', async ({ page }) => {
  await mockMember(page);
  let reads = 0;
  await page.route('**/api/resumes/master', (route) => {
    if (++reads === 1) return route.fulfill({ status: 500, json: { message: '실패' } });
    return route.fallback();
  });
  await page.goto('/home');
  await expect(page.getByRole('alert')).toContainText('이력서 관리 정보를 불러오지 못했어요.');
  await expect(page.getByRole('region', { name: '내 포인트' }).getByText('300P')).toBeVisible();
  await expect(page.getByText(/아직 준비 중인 지원 공고가 없어요/)).toBeVisible();
  await page.getByRole('button', { name: '이력서 관리 다시 불러오기' }).click();
  await expect(page.getByRole('button', { name: '이력서 작성하기' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('푸터 버튼의 Enter·Space 이동과 직접 접근·새로고침·뒤로가기가 동작한다', async ({ page }) => {
  await page.goto('/terms');
  for (const [label, path, key] of [
    ['개인정보처리방침', '/privacy', 'Enter'],
    ['고객지원', '/support', 'Space'],
    ['이용약관', '/terms', 'Enter'],
  ]) {
    const button = page.getByRole('contentinfo').getByRole('button', { name: label, exact: true });
    await button.focus();
    await page.keyboard.press(key);
    await expect(page).toHaveURL(path);
    await expect(page.getByRole('heading', { level: 1, name: label, exact: true })).toBeVisible();
    expect((await page.reload())?.status()).toBe(200);
  }
  await page.goBack();
  await expect(page).toHaveURL('/support');
  await expect(page.getByRole('heading', { level: 1, name: '고객지원' })).toBeVisible();
});

test('고객지원 문의 실패 후 입력을 유지하고 성공 후 접수 결과를 표시한다', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { data: { csrfToken: 'mock-csrf' } } }),
  );
  await page.route('**/api/inquiries', (route) => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({ title: '제목', content: '문의 내용' });
    return route.fulfill({ status: requests === 1 ? 500 : 200, json: { data: null } });
  });
  await page.goto('/support');
  await page.getByLabel('문의 제목').fill('제목');
  await page.getByLabel('문의 내용').fill('문의 내용');
  await page.getByRole('button', { name: '문의 접수' }).click();
  await expect(page.getByRole('alert')).toContainText('문의를 접수하지 못했어요');
  await expect(page.getByLabel('문의 내용')).toHaveValue('문의 내용');
  await page.getByRole('button', { name: '문의 접수' }).click();
  await expect(page.getByRole('status')).toContainText('문의가 접수되었어요.');
  await expect(page.getByLabel('문의 제목')).toHaveValue('');
});
