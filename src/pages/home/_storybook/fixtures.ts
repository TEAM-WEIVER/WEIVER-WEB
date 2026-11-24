import type { MemberHomeViewProps } from '../home-view';

/** Figma 예시를 재현하는 Storybook 전용 데이터. */
export const exampleHome = {
  fullName: '김민수',
  resume: { status: 'ready', data: { status: 'complete', required: true } },
  points: { status: 'ready', data: { balance: 300, interviewCost: 100 } },
  postings: {
    status: 'ready',
    data: {
      total: 7,
      postings: [
        {
          id: 'kakaopay',
          companyName: '카카오페이',
          positionName: 'AI 서비스 기획',
          documents: [
            { kind: 'resume', status: 'complete', required: true },
            { kind: 'coverLetter', status: 'complete', required: true },
            { kind: 'portfolio', status: 'notStarted', required: false },
          ],
          interviewCount: 2,
        },
        {
          id: 'krafton',
          companyName: '크래프톤',
          positionName: '사업 PM',
          documents: [{ kind: 'resume', status: 'complete', required: true }],
          interviewCount: 0,
        },
        {
          id: 'cjenm',
          companyName: 'CJ ENM',
          positionName: '서비스 기획',
          documents: [],
          interviewCount: 1,
        },
      ],
    },
  },
} satisfies MemberHomeViewProps;

export const exampleFooterLinks = [
  { label: '이용약관', to: '/terms' },
  { label: '개인정보처리방침', to: '/privacy' },
  { label: '고객지원', to: '/support' },
];
