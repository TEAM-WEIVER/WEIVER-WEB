import { http, HttpResponse } from 'msw';

const applicantsAllResponse = {
  status: 'OK',
  code: 200,
  data: {
    ApplicantDTO: {
      photoUrl: null,
      name: '이현우',
      birthday: '2000-01-01',
      phoneNumber: '010-1234-5678',
      email: 'weiver@example.com',
      address: '경기도 안산시 상록구 한양대학로 55',
    },
    EducationDTO: [
      {
        educationId: 1,
        schoolName: '한양대학교 에리카',
        degree: 'BACHELOR',
        major: 'ICT융합학부',
        gpa: 4.2,
        startDate: '2021-03',
        endDate: '2026-02',
        status: 'ACTIVE',
      },
    ],
    AwardDTO: [
      {
        awardId: 1,
        awardName: '한국인터넷진흥원장상',
        awardDate: '2025-11-01',
        issuer: '한국인터넷진흥원(KISA)',
      },
    ],
    WorkExperienceDTO: [
      {
        experienceId: 1,
        companyName: '에이블리',
        position: '인턴',
        startDate: '2026-02-01',
        endDate: '2026-08-01',
        duties: 'B2B 서비스 백엔드 API 설계 및 개발',
        employmentType: 'INTERN',
      },
    ],
    CertificateDTO: [
      {
        certificateId: 1,
        certificateName: '정보처리기사',
        acquisitionDate: '2025-03-01',
        issuer: '한국산업인력공단',
      },
    ],
  },
  message: 'OK',
};

const emptyApplicantsAllResponse = {
  status: 'OK',
  code: 200,
  data: {
    ApplicantDTO: null,
    EducationDTO: [],
    AwardDTO: [],
    WorkExperienceDTO: [],
    CertificateDTO: [],
  },
  message: 'OK',
};

// ──────────────────────────────────────────────
// 신규 가입 직후 (document-status 전부 false → POST 경로)
// ──────────────────────────────────────────────
export const onboardingNewUserHandlers = [
  // 회원가입 완료 → accessToken 발급
  http.post('https://api.piuda.site/api/auth/applicants/signup/agreements', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: { role: 'APPLICANT', accessToken: 'mock-access-token' },
      message: 'OK',
    });
  }),

  // 문서 완료 상태 조회 — 신규 가입 직후: 전부 미완료
  http.get('https://api.piuda.site/api/applicants/document-status', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: { resumeCompleted: false, essayCompleted: false, portfolioCompleted: false },
      message: 'OK',
    });
  }),

  http.get('https://api.piuda.site/api/applicants', () => {
    return HttpResponse.json(emptyApplicantsAllResponse);
  }),

  // 이력서 개인정보 저장
  http.put('https://api.piuda.site/api/applicants/info', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),

  // 이력서 세부 항목 — 학력
  http.post('https://api.piuda.site/api/applicants/education', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),

  // 이력서 세부 항목 — 경력
  http.post('https://api.piuda.site/api/applicants/experience', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),

  // 이력서 세부 항목 — 자격증
  http.post('https://api.piuda.site/api/applicants/certificate', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),

  // 이력서 세부 항목 — 수상
  http.post('https://api.piuda.site/api/applicants/award', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),

  // 자기소개서 조회 (신규: 호출 불필요하지만 혹시 호출될 경우 대비)
  http.get('https://api.piuda.site/api/essay-answers', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: { answerId: null, answer: '' },
      message: 'OK',
    });
  }),

  // 자기소개서 신규 저장
  http.post('https://api.piuda.site/api/essay-answers', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),

  // 포트폴리오 조회 (신규: 호출 불필요하지만 혹시 호출될 경우 대비)
  http.get('https://api.piuda.site/api/portfolios', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: {
        portfolioId: null,
        downloadUrl: null,
        fileName: null,
        fileType: null,
        fileSize: null,
        urlGithub: null,
        urlTech: null,
        urlEtc: null,
      },
      message: 'OK',
    });
  }),

  // 포트폴리오 신규 저장
  http.post('https://api.piuda.site/api/portfolios', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),
];

// ──────────────────────────────────────────────
// 재진입 시 (document-status true → PATCH 경로)
// ──────────────────────────────────────────────
export const onboardingReturningUserHandlers = [
  // 문서 완료 상태 조회 — 재진입: 전부 완료
  http.get('https://api.piuda.site/api/applicants/document-status', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: { resumeCompleted: true, essayCompleted: true, portfolioCompleted: true },
      message: 'OK',
    });
  }),

  http.get('https://api.piuda.site/api/applicants', () => {
    return HttpResponse.json(applicantsAllResponse);
  }),

  // 이력서 개인정보 수정
  http.put('https://api.piuda.site/api/applicants/info', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),

  http.put('https://api.piuda.site/api/applicants/education', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: 'OK', message: 'OK' });
  }),

  http.put('https://api.piuda.site/api/applicants/experience', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: 'OK', message: 'OK' });
  }),

  http.put('https://api.piuda.site/api/applicants/certificate', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: 'OK', message: 'OK' });
  }),

  http.put('https://api.piuda.site/api/applicants/award', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: 'OK', message: 'OK' });
  }),

  // 자기소개서 기존 데이터 조회 (re-fill용)
  http.get('https://api.piuda.site/api/essay-answers', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: { answerId: 'essay-answer-001', answer: '기존 자기소개서 내용입니다.' },
      message: 'OK',
    });
  }),

  // 자기소개서 수정
  http.patch('https://api.piuda.site/api/essay-answers/:answerId', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),

  // 포트폴리오 기존 데이터 조회 (re-fill용)
  http.get('https://api.piuda.site/api/portfolios', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: {
        portfolioId: 1,
        downloadUrl: 'https://example.com/portfolio.pdf',
        fileName: 'portfolio.pdf',
        fileType: 'PDF',
        fileSize: 1024000,
        urlGithub: 'https://github.com/example',
        urlTech: null,
        urlEtc: null,
      },
      message: 'OK',
    });
  }),

  // 포트폴리오 수정
  http.patch('https://api.piuda.site/api/portfolios/:portfolioId', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),
];

// ──────────────────────────────────────────────
// 에러 시나리오 핸들러
// ──────────────────────────────────────────────

// 이력서 세부 항목 부분 실패 (AC3): education API만 실패
export const onboardingResumePartialErrorHandlers = [
  http.get('https://api.piuda.site/api/applicants/document-status', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: { resumeCompleted: false, essayCompleted: false, portfolioCompleted: false },
      message: 'OK',
    });
  }),
  http.get('https://api.piuda.site/api/applicants', () => {
    return HttpResponse.json(applicantsAllResponse);
  }),
  http.put('https://api.piuda.site/api/applicants/info', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),
  http.post('https://api.piuda.site/api/applicants/education', () => {
    return HttpResponse.json(
      { status: 'INTERNAL_SERVER_ERROR', code: 500, data: null, message: '서버 오류' },
      { status: 500 },
    );
  }),
  http.post('https://api.piuda.site/api/applicants/experience', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),
  http.put('https://api.piuda.site/api/applicants/experience', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: 'OK', message: 'OK' });
  }),
  http.put('https://api.piuda.site/api/applicants/education', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: 'OK', message: 'OK' });
  }),
  http.post('https://api.piuda.site/api/applicants/certificate', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),
  http.put('https://api.piuda.site/api/applicants/certificate', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: 'OK', message: 'OK' });
  }),
  http.post('https://api.piuda.site/api/applicants/award', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),
  http.put('https://api.piuda.site/api/applicants/award', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: 'OK', message: 'OK' });
  }),
];

// 자기소개서 API 실패 (AC8)
export const onboardingEssayErrorHandlers = [
  http.get('https://api.piuda.site/api/applicants/document-status', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: { resumeCompleted: false, essayCompleted: false, portfolioCompleted: false },
      message: 'OK',
    });
  }),
  http.post('https://api.piuda.site/api/essay-answers', () => {
    return HttpResponse.json(
      { status: 'INTERNAL_SERVER_ERROR', code: 500, data: null, message: '서버 오류' },
      { status: 500 },
    );
  }),
];

// 포트폴리오 API 실패 (AC12)
export const onboardingPortfolioErrorHandlers = [
  http.get('https://api.piuda.site/api/applicants/document-status', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: { resumeCompleted: false, essayCompleted: false, portfolioCompleted: false },
      message: 'OK',
    });
  }),
  http.get('https://api.piuda.site/api/portfolios', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: {
        portfolioId: null,
        downloadUrl: null,
        fileName: null,
        fileType: null,
        fileSize: null,
        urlGithub: null,
        urlTech: null,
        urlEtc: null,
      },
      message: 'OK',
    });
  }),
  http.post('https://api.piuda.site/api/portfolios', () => {
    return HttpResponse.json(
      { status: 'INTERNAL_SERVER_ERROR', code: 500, data: null, message: '서버 오류' },
      { status: 500 },
    );
  }),
];

// 인증 만료 → refresh 실패 (AC15)
export const onboardingAuthExpiredHandlers = [
  http.get('https://api.piuda.site/api/applicants/document-status', () => {
    return HttpResponse.json(
      { status: 'UNAUTHORIZED', code: 401, data: null, message: '인증이 필요합니다.' },
      { status: 401 },
    );
  }),
  http.post('https://api.piuda.site/api/auth/refresh', () => {
    return HttpResponse.json(
      { status: 'UNAUTHORIZED', code: 401, data: null, message: '토큰이 만료되었습니다.' },
      { status: 401 },
    );
  }),
];
