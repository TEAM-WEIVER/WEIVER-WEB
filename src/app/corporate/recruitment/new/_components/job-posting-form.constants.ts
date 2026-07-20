export const JOB_CATEGORIES = ['개발자', '디자인', '기획'] as const;

export const DETAIL_JOBS: Record<(typeof JOB_CATEGORIES)[number], string[]> = {
  개발자: ['프론트엔드 개발자', '백엔드 개발자', 'AI 개발자', '보안', '데이터'],
  디자인: ['프로덕트 디자이너', '브랜드 디자이너', 'UX 리서처'],
  기획: ['서비스기획자', '프로덕트 매니저', '사업기획자'],
};

export const COMPETENCIES = [
  '성장가능성',
  '일관성',
  '문제해결력',
  '논리성',
  '협업 및 팀워크',
  '대처능력',
];

export const TRAITS = [
  {
    title: '자율 · 혁신',
    description: '새로운 시도를 장려하고, 개인의 자율성과 창의적 문제 해결을 중요하게 생각',
  },
  {
    title: '성과 · 영향',
    description:
      '명확한 목표와 결과를 중시하며, 조직과 시장에 실질적인 영향을 만드는 것을 중요하게 생각하는 환경',
  },
  {
    title: '안정 · 질서',
    description:
      '정해진 프로세스와 체계를 기반으로, 예측 가능하고 안정적인 운영을 중요하게 여기는 환경',
  },
  {
    title: '관계 · 공동체',
    description: '팀워크와 소통을 바탕으로, 구성원 간 신뢰와 협력을 중요하게 생각하는 환경',
  },
] as const;

export type TraitPriority = (typeof TRAITS)[number];
