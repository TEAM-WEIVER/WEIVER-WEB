import type { FieldPath } from 'react-hook-form';

import type { CoverLetterData } from '@/schemas/onboarding';

export interface CoverLetterQuestion {
  number: number;
  text: string;
  maxLength: number;
  field: FieldPath<CoverLetterData>;
}

export const COVER_LETTER_QUESTIONS = [
  {
    number: 1,
    text: '원하는 분야에 관심을 갖게 된 계기와 자신 있는 이유(그동안의 노력, 경험, 강점 포함) 등에 대해 구체적으로 설명해주세요.',
    maxLength: 1000,
    field: 'question1',
  },
  {
    number: 2,
    text: '가장 열정을 가지고 임했던 프로젝트(목표/과제 등)를 소개해주시고, 해당 프로젝트의 수행 과정 및 결과에 대해 기재해주세요.',
    maxLength: 1000,
    field: 'question2',
  },
  {
    number: 3,
    text: '입사 후 회사에서 이루고 싶은 꿈을 적어주세요.',
    maxLength: 500,
    field: 'question3',
  },
] satisfies CoverLetterQuestion[];
