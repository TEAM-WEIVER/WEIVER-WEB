import type { Page } from '@playwright/test';

import { fulfillJson } from '../fixtures/msw-helpers';
import {
  MOCK_COMPANY_DASHBOARD,
  MOCK_COMPANY_INFO,
  MOCK_JOB_POSTINGS_SUMMARY,
} from './corporate-dashboard-fixtures';

const apiResponse = (data: unknown) => ({ status: 'OK', code: 200, data, message: 'OK' });

/** Existing page.route strategy: every API request is intercepted, never sent to the backend. */
export async function mockRootRoutingApis(page: Page) {
  const unexpectedRequests: string[] = [];
  const responses: Record<string, unknown> = {
    '/api/auth/csrf': { csrfToken: 'mock-csrf-token' },
    '/api/applicants': {
      ApplicantDTO: {
        name: '홍길동',
        email: 'hong@example.com',
        birthday: '1990-01-01',
        phoneNumber: '010-1234-5678',
        photoUrl: null,
        address: '서울특별시 강남구',
      },
      EducationDTO: [],
      AwardDTO: [],
      WorkExperienceDTO: [],
      CertificateDTO: [],
    },
    '/api/applicants/submission-status': {
      resumeCompleted: true,
      essayCompleted: true,
      portfolioCompleted: true,
      submitted: false,
      syncStatus: 'COMPLETED',
      submittable: true,
    },
    '/api/interviews/remaining': {
      totalCount: 3,
      remainingCount: 3,
      reapplyDDay: 0,
      reapplyAvailableDate: '2026-10-13',
      pendingSubmissionSessionId: null,
    },
    '/api/dashboards/company': MOCK_COMPANY_DASHBOARD,
    '/api/companies/me': MOCK_COMPANY_INFO,
    '/api/dashboards/job-postings': MOCK_JOB_POSTINGS_SUMMARY,
    '/api/dashboards/notifications': {},
  };

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path in responses) {
      await fulfillJson(route, 200, apiResponse(responses[path]));
    } else {
      unexpectedRequests.push(`${route.request().method()} ${path}`);
      await fulfillJson(route, 500, {
        status: 'INTERNAL_SERVER_ERROR',
        code: 500,
        data: null,
        message: 'Unmocked API request',
      });
    }
  });

  return unexpectedRequests;
}
