export const ANSWER_MAX_LENGTH = 1500;
const characterCountFormat = new Intl.NumberFormat('ko-KR');

export type CoverLetterQuestion = {
  id: string;
  question: string;
  answer: string;
};

export type CoverLetterDraft = {
  questions: CoverLetterQuestion[];
};

export function isQuestionComplete({ question, answer }: CoverLetterQuestion) {
  return (
    question.trim().length > 0 && answer.trim().length > 0 && answer.length <= ANSWER_MAX_LENGTH
  );
}

export function formatCharacterCount(answer: string) {
  return `${characterCountFormat.format(answer.length)} / ${characterCountFormat.format(ANSWER_MAX_LENGTH)}자`;
}
