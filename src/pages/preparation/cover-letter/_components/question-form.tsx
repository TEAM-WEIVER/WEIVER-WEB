import { useCallback, useId, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  ANSWER_MAX_LENGTH,
  formatCharacterCount,
  isQuestionComplete,
  type CoverLetterQuestion,
} from '../_model/cover-letter';

export function QuestionForm({
  entry,
  onChange,
  onCancel,
  onSave,
}: {
  entry: CoverLetterQuestion;
  onChange: (value: CoverLetterQuestion) => void;
  onCancel: () => void;
  onSave: (entry: CoverLetterQuestion) => void;
}) {
  const id = useId();
  const answerCountId = `${id}-answer-count`;
  const focusQuestion = useCallback((input: HTMLInputElement | null) => {
    input?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isQuestionComplete(entry)) {
      onSave(entry);
    }
  }

  return (
    <form
      aria-labelledby={`${id}-heading`}
      className="border-border-default bg-card space-y-5 rounded-xl border p-6"
      onSubmit={handleSubmit}
    >
      <div className="border-border-light flex items-center justify-between gap-2 border-b pb-3">
        <h2 id={`${id}-heading`} className="text-body2 font-semibold">
          문항 정보 입력
        </h2>
        <p className="text-caption text-text-tertiary">* 필수 입력 사항</p>
      </div>
      <FormField label="문항 내용 *">
        {(field) => (
          <Input
            {...field}
            ref={focusQuestion}
            className="bg-card h-10 px-3"
            variant="default"
            placeholder="자기소개서 문항 내용을 입력해주세요."
            value={entry.question}
            required
            onChange={(event) => onChange({ ...entry, question: event.target.value })}
          />
        )}
      </FormField>
      <FormField label="자기소개서 본문 내용 *">
        {(field) => (
          <>
            <Textarea
              {...field}
              className="bg-card min-h-67 px-3 py-3"
              variant="default"
              placeholder="자기소개서 문항에 따른 내용을 입력해주세요. 최대 1,500자까지 입력 가능합니다."
              aria-describedby={[field['aria-describedby'], answerCountId]
                .filter(Boolean)
                .join(' ')}
              value={entry.answer}
              maxLength={ANSWER_MAX_LENGTH}
              required
              onChange={(event) => onChange({ ...entry, answer: event.target.value })}
            />
            <p id={answerCountId} className="text-caption text-text-tertiary text-right">
              {formatCharacterCount(entry.answer)}
            </p>
          </>
        )}
      </FormField>
      <div className="border-border-light flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" className="h-9 px-4" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" className="h-9 px-4" disabled={!isQuestionComplete(entry)}>
          저장
        </Button>
      </div>
    </form>
  );
}
