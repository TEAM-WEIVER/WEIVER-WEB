import { mockHomeApis } from './mocks/home-api';
import { expect, test, type Page } from '@playwright/test';

const posting = {
  id: 'posting-1',
  companyName: '위버',
  positionName: '프론트엔드 개발자',
  sourceUrl: '',
  content: 'React 서비스 개발',
};
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
const masterResume = { education: [education], career: [], certifications: [], awards: [] };

async function mockMember(page: Page, withMaster = false, withPosting = true) {
  await mockHomeApis(page, withMaster ? masterResume : null);
  await page.addInitScript(
    ({ master, postings }) => {
      sessionStorage.setItem('weiver.auth.role', 'APPLICANT');
      if (!sessionStorage.getItem('weiver.preparation.drafts')) {
        sessionStorage.setItem(
          'weiver.preparation.drafts',
          JSON.stringify({
            version: 1,
            state: { postings, masterResume: master, resumes: {}, coverLetters: {} },
          }),
        );
      }
    },
    { master: withMaster ? masterResume : undefined, postings: withPosting ? [posting] : [] },
  );
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

async function registerPosting(page: Page, companyName = '새 공고') {
  await page.getByLabel('회사명 *', { exact: true }).fill(companyName);
  await page.getByLabel('포지션명 *', { exact: true }).fill('프론트엔드 개발자');
  await page
    .getByRole('textbox', { name: '채용 공고 내용 *', exact: true })
    .fill('React 서비스 개발');
  await page.getByRole('button', { name: '공고 등록하기' }).click();
  await expect(page).toHaveURL(/\/preparation\/[^/]+$/);
  return new URL(page.url()).pathname;
}

async function seedIndependentDocuments(page: Page) {
  await page.goto('/preparation');
  await page.evaluate(
    ({ master, posting }) => {
      const data = JSON.parse(sessionStorage.getItem('weiver.preparation.drafts')!);
      data.state.postings.push({ ...posting, id: 'posting-2', companyName: '다른 기업' });
      data.state.resumes = {
        'posting-1': { ...master, education: [{ ...master.education[0], school: '공고 A 학교' }] },
        'posting-2': { ...master, education: [{ ...master.education[0], school: '공고 B 학교' }] },
      };
      data.state.coverLetters = {
        'posting-1': {
          questions: [{ id: 'question-a', question: '공고 A 지원동기', answer: 'A의 답변' }],
        },
        'posting-2': {
          questions: [{ id: 'question-b', question: '공고 B 지원동기', answer: 'B의 답변' }],
        },
      };
      sessionStorage.setItem('weiver.preparation.drafts', JSON.stringify(data));
    },
    { master: masterResume, posting },
  );
}

test('공고 저장본을 우선 표시하고 마스터본 덮어쓰기는 확인·저장 후에만 반영한다', async ({
  page,
}) => {
  await mockMember(page, true);
  await seedIndependentDocuments(page);
  await page.goto('/preparation/posting-1/resume');
  await expect(page.getByRole('heading', { name: /공고 A 학교/ })).toBeVisible();
  await page
    .getByRole('button', { name: '대학교 (4년제) · 공고 A 학교 · 컴퓨터공학 수정' })
    .click();
  await page.getByRole('textbox', { name: '학교명', exact: true }).fill('저장 전 A 편집');
  const load = page.getByRole('button', { name: '마스터본 불러오기', exact: true });
  await load.click();
  await page.getByRole('alertdialog').getByRole('button', { name: '취소', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '학교명', exact: true })).toHaveValue(
    '저장 전 A 편집',
  );
  await expect(load).toBeFocused();
  await load.click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '불러오기', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: /위버대학교/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /공고 A 학교/ })).toBeVisible();
  await load.click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '불러오기', exact: true })
    .click();
  await page.getByRole('button', { name: '임시 저장', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: /위버대학교/ })).toBeVisible();
  await page.goto('/preparation/posting-2/resume');
  await expect(page.getByRole('heading', { name: /공고 B 학교/ })).toBeVisible();
});

test('마스터본이 없어져도 독립 저장한 공고 이력서는 계속 편집할 수 있다', async ({ page }) => {
  await mockMember(page);
  await seedIndependentDocuments(page);
  await page.goto('/preparation/posting-1/resume');
  await expect(page).toHaveURL('/preparation/posting-1/resume');
  await expect(page.getByRole('heading', { name: /공고 A 학교/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '마스터본 불러오기', exact: true })).toBeDisabled();
});

test('자기소개서와 포트폴리오도 공고별로 편집·저장하며 서류 이동에서 공고 ID를 유지한다', async ({
  page,
}) => {
  await mockMember(page, true);
  await seedIndependentDocuments(page);
  await page.goto('/preparation/posting-1/cover-letter');
  await expect(page.getByRole('heading', { name: '공고 A 지원동기', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '공고 A 지원동기 수정', exact: true }).click();
  await page
    .getByRole('textbox', { name: '자기소개서 본문 내용 *', exact: true })
    .fill('A의 수정 답변');
  await page.getByRole('button', { name: '임시 저장', exact: true }).click();
  await page
    .getByRole('navigation', { name: '작성 필요 서류' })
    .getByRole('button', { name: /포트폴리오/ })
    .click();
  await expect(page).toHaveURL('/preparation/posting-1/portfolio');
  await page.getByLabel('포트폴리오 PDF 파일').setInputFiles({
    name: '공고-A.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 mock'),
  });
  await page
    .getByRole('form', { name: '포트폴리오 등록', exact: true })
    .getByRole('button', { name: '저장', exact: true })
    .click();
  await page.getByRole('button', { name: '임시 저장', exact: true }).click();
  await page.getByRole('button', { name: /공고 상세/ }).click();
  await page
    .getByRole('navigation', { name: '지원 공고 빠르게 보기' })
    .getByRole('button', { name: /다른 기업/ })
    .click();
  await page.getByRole('button', { name: '자기소개서 수정하기' }).click();
  await expect(page).toHaveURL('/preparation/posting-2/cover-letter');
  await expect(page.getByText('B의 답변', { exact: true })).toBeVisible();
  await expect(page.getByText('A의 수정 답변', { exact: true })).toHaveCount(0);
  await page
    .getByRole('navigation', { name: '작성 필요 서류' })
    .getByRole('button', { name: /포트폴리오/ })
    .click();
  await expect(page).toHaveURL('/preparation/posting-2/portfolio');
  await expect(page.getByRole('heading', { name: '공고-A.pdf', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /공고 상세/ }).click();
  await page
    .getByRole('navigation', { name: '지원 공고 빠르게 보기' })
    .getByRole('button', { name: /위버/ })
    .click();
  await page.getByRole('button', { name: '포트폴리오 수정하기' }).click();
  await expect(page.getByRole('heading', { name: '공고-A.pdf', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: '작성 필요 서류' })
    .getByRole('button', { name: /자기소개서/ })
    .click();
  await expect(page.getByText('A의 수정 답변', { exact: true })).toBeVisible();
});

test('홈 → 지원 준비 → 공고 등록 → 마스터본 선행 작성 분기와 복귀 경로를 유지한다', async ({
  page,
}) => {
  await mockMember(page, false, false);
  await page.goto('/home');
  const navigation = page.getByRole('navigation', { name: '주 메뉴' });
  await navigation.getByRole('link', { name: '지원 준비' }).click();
  await expect(page).toHaveURL('/preparation');
  await expect(navigation.getByRole('link', { name: '지원 준비' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(navigation.getByRole('link', { name: '홈' })).not.toHaveAttribute('aria-current');
  await page.getByRole('button', { name: '공고 등록', exact: true }).click();
  const path = await registerPosting(page);
  await page.getByRole('button', { name: '이력서 작성하기' }).click();
  const id = path.split('/').pop()!;
  await expect(page).toHaveURL(`/resume/master?postingId=${id}`);
  await expect(page.getByRole('heading', { name: '이력서 마스터본 작성' })).toBeVisible();
  const documents = page.getByRole('navigation', { name: '작성 필요 서류' });
  await expect(documents).not.toContainText('자기소개서');
  await expect(documents).not.toContainText('포트폴리오');
  await page.getByRole('button', { name: '저장하고 공고 이력서 작성' }).click();
  await expect(page.getByRole('alert')).toContainText('학력을 1개 이상');
  await page.getByRole('button', { name: '임시 저장', exact: true }).click();
  await page.goBack();
  await expect(page).toHaveURL(path);
  await page.getByRole('button', { name: '이력서 작성하기' }).click();
  await expect(page).toHaveURL(`/resume/master?postingId=${id}`);
  await page.reload();
  await expect(page.getByRole('heading', { name: '이력서 마스터본 작성' })).toBeVisible();
  await page.getByRole('button', { name: '학력 추가', exact: true }).click();
  const form = page.getByRole('form', { name: '학력 정보 입력' });
  await form.getByRole('combobox', { name: '학력구분' }).click();
  await page.getByRole('option', { name: '대학교 (4년제)', exact: true }).click();
  await form.getByRole('textbox', { name: '학교명', exact: true }).fill(education.school);
  await form.getByRole('textbox', { name: '전공', exact: true }).fill(education.major);
  await form.getByRole('textbox', { name: '학점', exact: true }).fill(education.grade);
  await form.getByRole('combobox', { name: '만점', exact: true }).click();
  await page.getByRole('option', { name: '4.5', exact: true }).click();
  for (const [name, year, month] of [
    ['입학년월', '2020년', '2020년 3월'],
    ['졸업년월', '2024년', '2024년 2월'],
  ]) {
    await form.getByRole('combobox', { name }).click();
    const calendar = page.getByRole('dialog', { name: `${name} 달력` });
    await calendar.getByRole('combobox', { name: '연도 선택' }).click();
    await page.getByRole('option', { name: year, exact: true }).click();
    await calendar.getByRole('button', { name: month, exact: true }).click();
  }
  await form.getByRole('combobox', { name: '졸업상태' }).click();
  await page.getByRole('option', { name: '졸업', exact: true }).click();
  await form.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByRole('button', { name: '저장하고 공고 이력서 작성' }).click();
  await expect(page).toHaveURL(`${path}/resume`);
  await expect(page.getByRole('heading', { name: /위버대학교/ })).toHaveCount(0);
  await page.getByRole('button', { name: '마스터본 불러오기', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '대학교 (4년제) · 위버대학교 · 컴퓨터공학', exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(path);
  await page.getByRole('button', { name: '이력서 작성하기' }).click();
  await expect(page).toHaveURL(`${path}/resume`);
});

test('마스터본이 있으면 바로 진입하고 공고별 변경은 마스터본과 다른 공고에 영향을 주지 않는다', async ({
  page,
}) => {
  await mockMember(page, true);
  await page.goto('/preparation/posting-1/resume');
  await expect(page).toHaveURL('/preparation/posting-1/resume');
  await expect(page.getByRole('heading', { name: /위버대학교/ })).toHaveCount(0);
  await page.getByRole('button', { name: '마스터본 불러오기', exact: true }).click();
  await page
    .getByRole('button', { name: '대학교 (4년제) · 위버대학교 · 컴퓨터공학 수정', exact: true })
    .click();
  await page.getByRole('textbox', { name: '학교명', exact: true }).fill('공고별 학교');
  await page.getByRole('button', { name: '임시 저장', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: /공고별 학교/ })).toBeVisible();
  await page
    .getByRole('navigation', { name: '작성 필요 서류' })
    .getByRole('button', { name: /자기소개서/ })
    .click();
  await expect(page).toHaveURL('/preparation/posting-1/cover-letter');
  await page.reload();
  await expect(page.getByRole('heading', { name: '자기소개서', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: '작성 필요 서류' })
    .getByRole('button', { name: /포트폴리오/ })
    .click();
  await expect(page).toHaveURL('/preparation/posting-1/portfolio');
  await page.reload();
  await expect(page.getByRole('heading', { name: '포트폴리오', exact: true })).toBeVisible();
  await page.goto('/preparation/new');
  const nextPath = await registerPosting(page, '다른 공고');
  await page.getByRole('button', { name: '이력서 작성하기' }).click();
  await expect(page).toHaveURL(`${nextPath}/resume`);
  await page.getByRole('button', { name: '마스터본 불러오기', exact: true }).click();
  await expect(page.getByRole('heading', { name: /위버대학교/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /공고별 학교/ })).toHaveCount(0);
  await page.goto('/resume/master');
  await expect(page.getByRole('heading', { name: /위버대학교/ })).toBeVisible();
});

test('서류 사이드바의 이력서 이동도 마스터본 선행 조건을 적용한다', async ({ page }) => {
  await mockMember(page);
  await page.goto('/preparation/posting-1/cover-letter');
  await page
    .getByRole('navigation', { name: '작성 필요 서류' })
    .getByRole('button', { name: /이력서/ })
    .click();
  await expect(page).toHaveURL('/resume/master?postingId=posting-1');
  await expect(page.getByRole('button', { name: /공고 상세/ })).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL('/preparation/posting-1/cover-letter');
});

test('없는 공고는 편집기나 마스터본으로 진입하지 않는다', async ({ page }) => {
  await mockMember(page);
  for (const path of [
    '/preparation/missing/resume',
    '/preparation/missing/edit',
    '/resume/master?postingId=missing',
  ]) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: '공고를 찾을 수 없어요.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '이력서 마스터본 작성' })).toHaveCount(0);
  }
});

test('공고 수정·삭제 후 뒤로가기로 삭제한 공고 이력서를 열 수 없다', async ({ page }) => {
  await mockMember(page, true);
  await page.goto('/preparation/posting-1/edit');
  await page.getByLabel('회사명 *', { exact: true }).fill('수정한 위버');
  await page.getByRole('button', { name: '변경사항 저장' }).click();
  await expect(page).toHaveURL('/preparation/posting-1');
  await expect(page.getByText('수정한 위버', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '공고 삭제', exact: true })
    .click();
  await expect(page).toHaveURL('/preparation');
  await page.goBack();
  await expect(page.getByRole('heading', { name: '공고를 찾을 수 없어요.' })).toBeVisible();
  await page.goto('/preparation/posting-1/resume');
  await expect(page.getByRole('heading', { name: '공고를 찾을 수 없어요.' })).toBeVisible();
});

test('비로그인 사용자는 지원 준비 및 마스터본 직접 접근 시 로그인으로 이동한다', async ({
  page,
}) => {
  for (const path of [
    '/preparation',
    '/preparation/new',
    '/preparation/posting-1/resume',
    '/resume/master?postingId=posting-1',
  ]) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page).toHaveURL('/login');
  }
});

test('등록한 동적 경로만 앱을 제공하고 알 수 없는 하위 경로는 404를 반환한다', async ({
  request,
}) => {
  for (const path of [
    '/preparation',
    '/preparation/new',
    '/preparation/id',
    '/preparation/id/edit',
    '/preparation/id/resume',
    '/preparation/id/cover-letter',
    '/preparation/id/portfolio',
    '/resume/master',
  ]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  expect((await request.get('/preparation/id/unknown')).status()).toBe(404);
});

test('홈에서 마스터본을 직접 편집하고 저장 후 홈으로 돌아온다', async ({ page }, testInfo) => {
  await mockMember(page, true);
  await page.goto('/home');
  await page.getByRole('button', { name: '이력서 수정하기', exact: true }).click();
  await expect(page).toHaveURL('/resume/master');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '이력서 마스터본 작성', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /공고 상세/ })).toHaveCount(0);
  await expect(page.getByText(/서버에는 저장되지|현재 탭에 임시/)).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('master-resume-home.png') });
  await page.getByRole('button', { name: '저장하고 홈으로', exact: true }).click();
  await expect(page).toHaveURL('/home');
});
