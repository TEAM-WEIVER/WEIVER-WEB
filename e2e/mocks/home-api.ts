import type { Page } from '@playwright/test';
import type { ResumeDraft } from '../../src/pages/preparation/resume/_model/resume-sections';

export async function mockHomeApis(page: Page, initialDraft: ResumeDraft | null = null) {
  let draft = initialDraft;
  await page.route('**/api/resumes/master', async (route) => {
    if (route.request().method() === 'PUT') draft = route.request().postDataJSON().draft;
    return route.fulfill({ json: { data: { draft } } });
  });
  await page.route('**/api/home/points', (route) =>
    route.fulfill({ json: { data: { balance: 300, interviewCost: 100 } } }),
  );
  await page.route('**/api/home/postings', (route) =>
    route.fulfill({ json: { data: { total: 0, postings: [] } } }),
  );
}
