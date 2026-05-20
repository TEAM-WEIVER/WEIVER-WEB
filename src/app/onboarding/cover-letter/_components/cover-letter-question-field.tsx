import type { UseFormRegister } from 'react-hook-form';

import { formTextareaClass } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import type { CoverLetterData } from '@/schemas/onboarding';

import type { CoverLetterQuestion } from '../_constants/cover-letter-questions';

interface CoverLetterQuestionFieldProps {
  question: CoverLetterQuestion;
  currentLength: number;
  register: UseFormRegister<CoverLetterData>;
}

export function CoverLetterQuestionField({
  question,
  currentLength,
  register,
}: CoverLetterQuestionFieldProps) {
  const isOverLimit = currentLength > question.maxLength;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between">
        <p className="text-body1 text-text-secondary">
          {question.number}. {question.text}
        </p>
        <p
          className={`text-caption shrink-0 pl-4 text-right ${
            isOverLimit ? 'text-error' : 'text-text-tertiary'
          }`}
        >
          {currentLength}/{question.maxLength}
        </p>
      </div>
      <Textarea
        {...register(question.field)}
        placeholder="내용을 입력해주세요."
        className={`${formTextareaClass} min-h-[180px] resize-none ${
          isOverLimit ? 'border-error focus-visible:border-error focus-visible:ring-error/20' : ''
        }`}
      />
    </div>
  );
}
