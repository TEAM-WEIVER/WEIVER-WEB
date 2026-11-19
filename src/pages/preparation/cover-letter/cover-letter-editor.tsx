import { useCallback, useId, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';

import { DocumentEditorLayout } from '@/components/common/DocumentEditorLayout';
import { SectionHeading } from '@/components/common/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { DocumentItemActions } from '../_components/document-item-actions';

const ANSWER_MAX_LENGTH = 1500;
const characterCountFormat = new Intl.NumberFormat('ko-KR');

type CoverLetterQuestion = {
  id: string;
  question: string;
  answer: string;
};

export type CoverLetterDraft = {
  questions: CoverLetterQuestion[];
};

type CoverLetterEditorProps = {
  initialQuestions?: CoverLetterQuestion[];
  onSaveDraft: (draft: CoverLetterDraft) => void;
};

function isQuestionComplete({ question, answer }: CoverLetterQuestion) {
  return question.trim().length > 0 && answer.trim().length > 0;
}

function formatCharacterCount(answer: string) {
  return `${characterCountFormat.format(answer.length)} / ${characterCountFormat.format(ANSWER_MAX_LENGTH)}자`;
}

function QuestionCard({
  entry,
  editDisabled,
  onEdit,
  onDelete,
}: {
  entry: CoverLetterQuestion;
  editDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const title = entry.question.trim() ? entry.question : '제목 없는 문항';

  return (
    <article className="border-border-light bg-card space-y-3 rounded-xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <Badge
            variant="outline"
            className="border-border-light bg-bg-secondary text-text-tertiary rounded-sm"
          >
            {isQuestionComplete(entry) ? '작성 완료' : '작성 중'}
          </Badge>
          <h2 className="text-h4 wrap-anywhere">{title}</h2>
        </div>
        <DocumentItemActions
          itemTitle={title}
          onEdit={onEdit}
          onDelete={onDelete}
          editDisabled={editDisabled}
        />
      </div>
      <p className="text-body3 border-border-light bg-bg-secondary text-text-secondary rounded-lg border p-4 wrap-anywhere whitespace-pre-wrap">
        {entry.answer}
      </p>
      <p className="text-caption text-text-tertiary text-right">
        {formatCharacterCount(entry.answer)}
      </p>
    </article>
  );
}

function QuestionForm({
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

export function CoverLetterEditor({ initialQuestions = [], onSaveDraft }: CoverLetterEditorProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [editing, setEditing] = useState<CoverLetterQuestion | null>(null);

  const newQuestion = editing && !questions.some(({ id }) => id === editing.id) ? editing : null;
  const totalQuestions = questions.length + (newQuestion ? 1 : 0);
  const completedQuestions = questions.filter(isQuestionComplete).length;
  const progress = totalQuestions ? Math.floor((completedQuestions / totalQuestions) * 100) : 0;

  function handleSaveQuestion(entry: CoverLetterQuestion) {
    setQuestions((current) =>
      newQuestion
        ? [...current, entry]
        : current.map((item) => (item.id === entry.id ? entry : item)),
    );
    setEditing(null);
  }

  function handleSaveDraft() {
    const currentQuestions = questions.map((entry) => ({
      ...(editing?.id === entry.id ? editing : entry),
    }));

    if (newQuestion && (newQuestion.question || newQuestion.answer)) {
      currentQuestions.push({ ...newQuestion });
    }

    onSaveDraft({ questions: currentQuestions });
  }

  const form = editing ? (
    <QuestionForm
      entry={editing}
      onChange={setEditing}
      onCancel={() => setEditing(null)}
      onSave={handleSaveQuestion}
    />
  ) : null;

  return (
    <DocumentEditorLayout
      activeDocument="cover-letter"
      progress={progress}
      onSaveDraft={handleSaveDraft}
    >
      <div className="border-border-light flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <SectionHeading
          as="h1"
          title="자기소개서"
          description="지원 직무에 부합하는 역량과 강점을 솔직하고 구체적으로 기술해주세요."
        />
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={editing !== null}
          onClick={() => setEditing({ id: crypto.randomUUID(), question: '', answer: '' })}
        >
          <Plus aria-hidden="true" />
          문항 추가
        </Button>
      </div>
      <div className="mt-6 space-y-6">
        {questions.map((entry) => (
          <div key={entry.id}>
            {editing?.id === entry.id ? (
              form
            ) : (
              <QuestionCard
                entry={entry}
                editDisabled={editing !== null}
                onEdit={() => setEditing(entry)}
                onDelete={() =>
                  setQuestions((current) => current.filter((item) => item.id !== entry.id))
                }
              />
            )}
          </div>
        ))}
        {newQuestion ? form : null}
        {totalQuestions === 0 ? (
          <p className="text-body2 border-border-light bg-card text-text-tertiary rounded-xl border px-6 py-12 text-center">
            등록된 문항이 없습니다.
          </p>
        ) : null}
      </div>
    </DocumentEditorLayout>
  );
}
