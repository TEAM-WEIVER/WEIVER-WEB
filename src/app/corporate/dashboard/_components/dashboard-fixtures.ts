import type {
  CompanyDashboard,
  JobPostingsDetails,
  Notification,
} from '@/schemas/corporate/dashboard';

export type CompanyDashboardProfile = CompanyDashboard & {
  companyName: string;
  companyType: string;
};

export const MOCK_COMPANY_DASHBOARD: CompanyDashboardProfile = {
  companyId: 1,
  companyName: '(주)피우다',
  companyType: '중견기업',
  companyCeoName: '이관형',
  address: '경기도 안산시 한양대학로 55',
  employeeNum: 20,
  foundedYear: '2025',
  wayOfWorkingDetail: {
    workPace: '빠른 실행',
    decisionMaking: '공동체주의',
    roleDefinition: '유연한 역할',
    operationStyle: '실험적',
  },
};

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    notificationId: 1,
    type: 'MATCHING',
    message: '백엔드 엔지니어 모집 공고에 3개의 새로운 매칭이 있습니다.',
    isRead: false,
    jdId: 1,
    createdAt: '1시간 전',
  },
  {
    notificationId: 2,
    type: 'MATCHING',
    message: '백엔드 엔지니어 모집 공고에 2개의 새로운 매칭이 있습니다.',
    isRead: true,
    jdId: 1,
    createdAt: '10시간 전',
  },
  {
    notificationId: 3,
    type: 'MATCHING',
    message: '백엔드 엔지니어 모집 공고에 1개의 새로운 매칭이 있습니다.',
    isRead: true,
    jdId: 1,
    createdAt: '14시간 전',
  },
  {
    notificationId: 4,
    type: 'MATCHING',
    message: '프론트엔드 엔지니어 모집 공고에 3개의 새로운 매칭이 있습니다.',
    isRead: true,
    jdId: 2,
    createdAt: '일주일 전',
  },
];

export const MOCK_JOB_POSTINGS: JobPostingsDetails[] = [
  {
    jdId: 1,
    title: '백엔드 엔지니어 모집',
    status: 'ACTIVE',
    jobCategory: '개발자',
    detailedJob: '백엔드 개발자',
    newApplicantCount: 12,
  },
  {
    jdId: 2,
    title: '프론트엔드 엔지니어 모집',
    status: 'CLOSED',
    jobCategory: '개발자',
    detailedJob: '프론트엔드 개발자',
    newApplicantCount: 24,
  },
  {
    jdId: 3,
    title: 'AI서비스기획자 모집',
    status: 'DRAFT',
    jobCategory: '기획자',
    detailedJob: '서비스기획자',
    newApplicantCount: 0,
  },
];
