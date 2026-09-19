export const MOCK_JOB_POSTINGS_SUMMARY = {
  content: [
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
  ],
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
