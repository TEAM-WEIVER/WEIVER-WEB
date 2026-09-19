/**
 * 기업 대시보드 MSW 목 핸들러 (#87)
 *
 * AC9: JobPostingList 로딩 중 스켈레톤 표시
 * AC10: API 완료 후 실제 JobPostingList 렌더링
 */

import { delay, http, HttpResponse } from 'msw';

const apiResponse = <TData>(data: TData) => ({
  status: 'OK',
  code: 200,
  data,
  message: 'OK',
});

// ──────────────────────────────────────────────
// 목 데이터
// ──────────────────────────────────────────────

export const MOCK_JOB_POSTINGS = [
  {
    jdId: 1,
    title: '프론트엔드 개발자',
    status: 'ACTIVE',
    jobCategory: '개발',
    detailedJob: 'React 개발',
    newApplicantCount: 3,
  },
  {
    jdId: 2,
    title: '백엔드 개발자',
    status: 'ACTIVE',
    jobCategory: '개발',
    detailedJob: 'Spring Boot 개발',
    newApplicantCount: 1,
  },
  {
    jdId: 3,
    title: 'UX 디자이너',
    status: 'DRAFT',
    jobCategory: '디자인',
    detailedJob: 'UI/UX 설계',
    newApplicantCount: 0,
  },
];

export const MOCK_JOB_POSTINGS_SUMMARY = {
  content: MOCK_JOB_POSTINGS,
  pageable: {
    pageNumber: 0,
    pageSize: 3,
    totalElements: 3,
    totalPages: 1,
  },
};

export const MOCK_COMPANY_DASHBOARD = {
  companyId: 1,
  companyLogoUrl: null,
  companyCeoName: '홍길동',
  address: '서울특별시 강남구',
  employeeNum: 50,
  foundedYear: '2020',
  wayOfWorkingDetail: {
    workPace: '빠른 실행',
    decisionMaking: '팀 합의',
    roleDefinition: '명확한 역할',
    operationStyle: '실험 지향',
  },
};

export const MOCK_COMPANY_INFO = {
  companyId: 1,
  companyName: '위버 주식회사',
  companyCeoName: '홍길동',
  companyLogoUrl: null,
  address: '서울특별시 강남구',
  employeeNum: 50,
  foundedYear: '2020',
  companyType: 'STARTUP',
  workPace: 'FAST_EXECUTION',
  decisionMaking: 'TEAM_CONSENSUS',
  roleDefinition: 'CLEAR_RESPONSIBILITY',
  operationStyle: 'EXPERIMENT_ORIENTED',
};

// ──────────────────────────────────────────────
// 정상 응답 핸들러
// ──────────────────────────────────────────────

export const corporateDashboardHandlers = [
  http.get('https://api.piuda.site/api/dashboards/job-postings', async () => {
    return HttpResponse.json(apiResponse(MOCK_JOB_POSTINGS_SUMMARY));
  }),

  http.get('https://api.piuda.site/api/dashboards/company', async () => {
    return HttpResponse.json(apiResponse(MOCK_COMPANY_DASHBOARD));
  }),

  http.get('https://api.piuda.site/api/companies/me', async () => {
    return HttpResponse.json(apiResponse(MOCK_COMPANY_INFO));
  }),

  http.get('https://api.piuda.site/api/dashboards/notifications', async () => {
    return HttpResponse.json(apiResponse({}));
  }),

  http.get('https://api.piuda.site/api/auth/csrf', () => {
    return HttpResponse.json(apiResponse({ csrfToken: 'mock-csrf-token' }));
  }),

  http.post('https://api.piuda.site/api/auth/reissue', () => {
    return HttpResponse.json(apiResponse({ accessToken: 'mock-access-token' }));
  }),
];

// ──────────────────────────────────────────────
// 지연 응답 핸들러 (로딩 상태 시뮬레이션용)
// ──────────────────────────────────────────────

export const corporateDashboardSlowJobPostingsHandlers = [
  http.get('https://api.piuda.site/api/dashboards/job-postings', async () => {
    await delay(3000);
    return HttpResponse.json(apiResponse(MOCK_JOB_POSTINGS_SUMMARY));
  }),

  http.get('https://api.piuda.site/api/dashboards/company', async () => {
    return HttpResponse.json(apiResponse(MOCK_COMPANY_DASHBOARD));
  }),

  http.get('https://api.piuda.site/api/companies/me', async () => {
    return HttpResponse.json(apiResponse(MOCK_COMPANY_INFO));
  }),

  http.get('https://api.piuda.site/api/dashboards/notifications', async () => {
    return HttpResponse.json(apiResponse({}));
  }),

  http.get('https://api.piuda.site/api/auth/csrf', () => {
    return HttpResponse.json(apiResponse({ csrfToken: 'mock-csrf-token' }));
  }),

  http.post('https://api.piuda.site/api/auth/reissue', () => {
    return HttpResponse.json(apiResponse({ accessToken: 'mock-access-token' }));
  }),
];
