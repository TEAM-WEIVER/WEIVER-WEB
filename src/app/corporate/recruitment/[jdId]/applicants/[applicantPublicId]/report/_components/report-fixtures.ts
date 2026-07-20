import type {
  AiSummary,
  CardSummary,
  CultureFit,
  DocumentSummary,
  SkillFit,
} from '@/schemas/corporate/report';

import type { SkillScriptItem } from './skill-script-modal';

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
    culturefitStyle: '공격적 혁신가',
    skillTags: ['Jira', 'Excel', 'Figma', 'Photoshop'],
  },
};

export const MOCK_REPORT_KEYWORDS = {
  strengths: ['User Experience', '엑셀활용능력', '데이터분석능력'],
  weaknesses: ['PPT활용불가', '영어실력부족'],
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
  skillTags: ['Jira', 'Excel', 'Figma', 'Photoshop'],
  aiAbilitySummary: '우선순위 역량 중 1순위, 3순위 역량이 성장가능성 92%, 논리성 96%로 일치합니다.',
  aiSkillAnalysis: [
    { name: '성장가능성', percentage: 92 },
    { name: '일관성', percentage: 81 },
    { name: '문제해결력', percentage: 74 },
    { name: '논리성', percentage: 96 },
    { name: '협업 및 팀워크', percentage: 64 },
    { name: '대처능력', percentage: 54 },
  ],
};

const DEFAULT_SCRIPT_ANSWER: SkillScriptItem['answer'] = [
  {
    text: '이전 프로젝트에서 데이터 파이프라인의 처리 속도가 예상보다 3배 느려지는 문제가 있었습니다. ',
  },
  { text: '담당자가 따로 없어', tone: 'success' },
  {
    text: ' 제가 직접 원인을 추적했는데, 단순 코드 최적화로는 해결되지 않는 구조적 병목이라는 걸 확인했습니다. 팀에서는 기존 방식을 유지하자는 의견이 많았지만, 저는 ',
  },
  { text: '검증되지 않은', tone: 'warning' },
  { text: ' 배치 처리 구조를 ' },
  { text: '새로 제안하고 작은 범위에서 먼저 테스트해보겠다고 설득했습니다', tone: 'success' },
  {
    text: '. 2주간 프로토타입을 만들어 실제 데이터로 검증한 결과 처리 시간을 약 65% 단축할 수 있었고, 이후 팀 표준 방식으로 채택되었습니다. 안정적인 방식을 벗어나 ',
  },
  { text: '불확실성을 감수', tone: 'warning' },
  { text: '하더라도 더 나은 해결책을 직접 찾아보는 과정에서 가장 큰 성장을 느꼈습니다.' },
];

export const MOCK_SKILL_SCRIPTS: Record<string, SkillScriptItem[]> = {
  성장가능성: [
    {
      id: 'growth-1',
      question: 'Q1. 복잡한 기술적 문제를 해결한 경험에 대해서 구체적으로 설명해주세요.',
      tags: [
        { label: '자기방향성', tone: 'success' },
        { label: '자극추구', tone: 'warning' },
      ],
      answer: DEFAULT_SCRIPT_ANSWER,
    },
    {
      id: 'growth-2',
      question: 'Q2. 새로운 방식을 시도해서 성과를 만든 경험이 있나요?',
      tags: [{ label: '자기방향성', tone: 'success' }],
      answer: [
        { text: '초기 요구사항이 명확하지 않은 상황에서 사용자의 반복 문의를 직접 분류했고, ' },
        { text: '문제의 원인을 먼저 구조화한 뒤', tone: 'success' },
        {
          text: ' 작은 개선안을 빠르게 배포했습니다. 이후 문의량이 줄어드는 것을 확인하며 다음 개선 범위를 정했습니다.',
        },
      ],
    },
    {
      id: 'growth-3',
      question: 'Q3. 본인이 부족했던 부분을 어떻게 개선했는지 설명해주세요.',
      tags: [
        { label: '자극추구', tone: 'warning' },
        { label: '보편주의', tone: 'success' },
      ],
      answer: [
        { text: '처음에는 빠른 결과를 내는 데 집중해 문서화가 부족했습니다. 회고 후에는 ' },
        { text: '팀원이 재사용할 수 있는 기준', tone: 'success' },
        {
          text: '을 남기는 방식으로 일하는 습관을 바꿨고, 불확실한 실험도 공유 가능한 형태로 정리했습니다.',
        },
      ],
    },
  ],
  일관성: [
    {
      id: 'consistency-1',
      question: 'Q1. 긴 기간 동안 꾸준히 유지한 업무 방식이 있나요?',
      tags: [{ label: '지속성', tone: 'success' }],
      answer: [
        { text: '매주 배포 후 지표와 사용자 피드백을 확인했고, ' },
        { text: '동일한 기준으로 개선 우선순위를 기록', tone: 'success' },
        { text: '했습니다. 이 방식 덕분에 단기 이슈에 흔들리지 않고 개선 흐름을 유지했습니다.' },
      ],
    },
  ],
  문제해결력: [
    {
      id: 'problem-1',
      question: 'Q1. 복잡한 문제를 해결할 때 어떤 순서로 접근하나요?',
      tags: [
        { label: '문제정의', tone: 'success' },
        { label: '가설검증', tone: 'warning' },
      ],
      answer: DEFAULT_SCRIPT_ANSWER,
    },
  ],
  논리성: [
    {
      id: 'logic-1',
      question: 'Q1. 의사결정을 설득하기 위해 어떤 근거를 사용했나요?',
      tags: [{ label: '구조화', tone: 'success' }],
      answer: [
        { text: '개선안을 제안할 때 감각적인 주장보다 ' },
        { text: '지표, 사용자 사례, 구현 비용을 나누어 비교', tone: 'success' },
        { text: '했습니다. 덕분에 팀이 선택지를 빠르게 판단할 수 있었습니다.' },
      ],
    },
  ],
  '협업 및 팀워크': [
    {
      id: 'teamwork-1',
      question: 'Q1. 팀과 함께 문제를 해결한 경험을 설명해주세요.',
      tags: [{ label: '협업', tone: 'success' }],
      answer: [
        { text: '디자인과 개발 사이에 해석 차이가 있을 때 ' },
        { text: '공통 용어와 기준을 먼저 맞추고', tone: 'success' },
        { text: ' 각자의 제약을 문서화해 재작업을 줄였습니다.' },
      ],
    },
  ],
  대처능력: [
    {
      id: 'response-1',
      question: 'Q1. 갑작스러운 변경 요청을 어떻게 처리했나요?',
      tags: [{ label: '우선순위', tone: 'warning' }],
      answer: [
        { text: '요구사항이 바뀌었을 때 전체를 바로 수정하기보다 ' },
        { text: '영향 범위를 먼저 분리', tone: 'success' },
        { text: '하고, 당장 필요한 변경과 다음 배포로 넘길 변경을 나눠 대응했습니다.' },
      ],
    },
  ],
};

export const MOCK_CULTURE_FIT: CultureFit = {
  matchStatus: '높은 매칭률',
  culturefitStyle: '공격적 혁신가',
  topTwoAxes: [
    { name: '자율 · 혁신', percentage: 84 },
    { name: '성과 · 영향', percentage: 76 },
  ],
  aiSummary:
    '명확한 목표가 주어지면 스스로 실행 방식을 설계하고, 빠르게 행동해 결과를 만들어내는 지원자입니다. 기존 방식에 머무르기보다 새로운 해결책을 시도하며, 도전적인 목표와 성과가 분명한 환경에서 높은 몰입도를 보입니다.',
  axesDetails: [
    {
      name: '자율 · 혁신',
      percentage: 84,
      subTraits: [
        { name: '자기방향성', percentage: 88 },
        { name: '자극추구', percentage: 79 },
        { name: '보편주의', percentage: 64 },
      ],
    },
    {
      name: '성과 · 영향',
      percentage: 76,
      subTraits: [
        { name: '성취', percentage: 82 },
        { name: '권력', percentage: 69 },
      ],
    },
    {
      name: '안정 · 질서',
      percentage: 38,
      subTraits: [
        { name: '안전', percentage: 46 },
        { name: '전통', percentage: 31 },
        { name: '순응', percentage: 36 },
      ],
    },
    {
      name: '관계 · 공동체',
      percentage: 61,
      subTraits: [
        { name: '호의', percentage: 67 },
        { name: '보편주의', percentage: 55 },
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
