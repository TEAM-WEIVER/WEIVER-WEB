import type {
  AiSummary,
  CardSummary,
  CultureFit,
  DocumentSummary,
  SkillFit,
} from '@/schemas/corporate/report';

export const MOCK_CARD_SUMMARY: CardSummary = {
  profile: {
    applicantId: 1,
    name: '김위버',
    phoneNumber: '010-1111-2222',
    email: 'abcdef@gmail.com',
    photoUrl: null,
    position: '프론트엔드 개발자',
  },
  card: {
    skillScore: 88,
    note: '',
    culturefitStyle: '추진형 실행가',
    skillTags: ['Jira', 'Excel', 'Figma', 'Photoshop'],
  },
};

export const MOCK_AI_SUMMARY: AiSummary = {
  aiSummary:
    '지원자는 사용자 경험을 중심으로 화면 구조를 설계하고, 디자인 산출물을 실제 서비스 인터페이스로 구현한 경험이 두드러집니다. 협업 도구와 문서화에 익숙해 초기 합류 후 제품 개선 과제에 빠르게 기여할 가능성이 높습니다.',
  majorCareers: [
    {
      experienceId: 1,
      companyName: '위버랩스',
      position: '프로덕트 디자이너',
      employeeType: '인턴',
      startDate: '2025.03',
      endDate: '2025.12',
      duties:
        '채용 관리 SaaS의 지원자 리포트 화면 개선과 디자인 시스템 컴포넌트 정리를 담당했습니다.',
    },
    {
      experienceId: 2,
      companyName: '피우다 스튜디오',
      position: '프론트엔드 개발자',
      employeeType: '프로젝트',
      startDate: '2024.07',
      endDate: '2024.12',
      duties:
        'React 기반 관리자 화면을 구현하고, Figma 시안과 개발 산출물의 일관성을 관리했습니다.',
    },
  ],
};

export const MOCK_SKILL_FIT: SkillFit = {
  matchingRate: 88,
  skillTags: ['Jira', 'Excel', 'Figma', 'Photoshop', 'React', 'Notion'],
  aiAbilitySummary:
    '요구 기술 중 협업 도구와 디자인 핸드오프 역량이 강하게 나타납니다. 개발 구현 경험도 확인되어 기획, 디자인, 개발 사이의 커뮤니케이션 비용을 줄이는 역할에 적합합니다.',
  aiSkillAnalysis: [
    { name: '성장가능성', percentage: 92 },
    { name: '일관성', percentage: 84 },
    { name: '문제해결력', percentage: 88 },
    { name: '논리성', percentage: 78 },
    { name: '협업 및 팀워크', percentage: 90 },
    { name: '대처능력', percentage: 82 },
  ],
};

export const MOCK_CULTURE_FIT: CultureFit = {
  matchStatus: '높음',
  culturefitStyle: '추진형 실행가',
  topTwoAxes: [
    { name: '자율 · 혁신', percentage: 91 },
    { name: '성과 · 영향', percentage: 86 },
  ],
  aiSummary:
    '새로운 문제를 빠르게 구조화하고 실행으로 옮기는 성향이 강합니다. 목표와 우선순위가 명확한 환경에서 높은 몰입도를 보이며, 피드백을 바탕으로 산출물을 개선하는 방식에 익숙합니다.',
  axesDetails: [
    {
      name: '자율 · 혁신',
      percentage: 91,
      subTraits: [
        { name: '주도성', percentage: 93 },
        { name: '실험성', percentage: 88 },
      ],
    },
    {
      name: '성과 · 영향',
      percentage: 86,
      subTraits: [
        { name: '목표지향', percentage: 89 },
        { name: '완결성', percentage: 83 },
      ],
    },
    {
      name: '관계 · 공동체',
      percentage: 74,
      subTraits: [
        { name: '협업', percentage: 81 },
        { name: '공감', percentage: 68 },
      ],
    },
  ],
};

export const MOCK_DOCUMENTS: DocumentSummary = {
  portfolio: {
    portfolioFileUrl: 'portfolio_kimweiver.pdf',
    urlGithub: 'https://github.com/weiver',
    urlTech: 'https://blog.weiver.dev',
    urlEtc: 'https://figma.com/@weiver',
  },
  techInterviewScripts: [
    {
      question_code: 'TECH-01',
      sequence: 1,
      question: '디자인 시안을 구현할 때 가장 먼저 확인하는 요소는 무엇인가요?',
      answer:
        '레이아웃 구조, 반복되는 컴포넌트, 상태별 인터랙션을 먼저 분리해서 구현 범위를 정리합니다.',
    },
    {
      question_code: 'TECH-02',
      sequence: 2,
      question: '협업 과정에서 개발 산출물과 디자인의 차이를 줄인 경험이 있나요?',
      answer:
        '공통 토큰과 컴포넌트 이름을 맞추고, QA 기준을 체크리스트로 관리해 재작업을 줄였습니다.',
    },
  ],
  cultureInterviewScripts: [
    {
      question_code: 'CULTURE-01',
      sequence: 1,
      question: '빠르게 바뀌는 요구사항을 어떻게 다루나요?',
      answer:
        '변경 이유와 우선순위를 먼저 확인하고, 영향 범위를 나눠 즉시 반영할 부분부터 처리합니다.',
    },
  ],
};
