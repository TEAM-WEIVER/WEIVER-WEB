import type { PostingDetailState } from '../detail/page';
import type { JobPostingSummary } from '../_types/job-posting-detail';

export const examplePostings: JobPostingSummary[] = [
  { id: 'kakao', companyName: '카카오뱅크', positionName: 'AI 서비스 기획' },
  { id: 'krafton', companyName: '크래프톤', positionName: '사업 PM' },
  { id: 'cjenm', companyName: 'CJ ENM', positionName: '서비스 기획' },
];

export const exampleDetail = {
  status: 'ready',
  posting: {
    ...examplePostings[0],
    sourceUrl: 'https://example.com/career/job-details/ai-planner',
    content:
      '담당할 업무\n• 대화형 AI 서비스 신규 기능 기획 및 개선 요건 발굴\n• 대화형 AI 서비스 개발 협업 및 프로젝트 사이클 관리\n• AI Agent 전략 수립 및 세부 기능 기획\n\n필수 경험과 역량\n• 모바일 앱 서비스 기획 및 운영 경험이 있는 분\n• 사용자 중심의 사고 및 문제 해결 역량을 보유한 분\n• 새로운 업무와 도전적인 과제 수행이 가능하며 배우려는 자세를 지닌 분\n\n우대사항\n• 데이터 설계 및 분석 업무가 가능한 분\n• AI 서비스에 대한 기술적 흥미와 도전 경험이 있는 분',
  },
  documents: [
    { kind: 'resume', status: 'complete', required: true },
    { kind: 'coverLetter', status: 'inProgress', required: true },
    { kind: 'portfolio', status: 'notStarted', required: false },
  ],
  interviews: [
    { id: 'interview-1', date: '2026-11-04', score: 85, reportAvailable: true },
    { id: 'interview-2', date: '2026-11-05', score: 91, reportAvailable: true },
  ],
  canStartInterview: false,
  interviewUnavailableReason: '면접 시작 기능을 준비 중이에요.',
} satisfies Extract<PostingDetailState, { status: 'ready' }>;
