import { useState } from 'react';
import { Plus } from 'lucide-react';

import {
  DocumentEditorLayout,
  type DocumentEditorLayoutProps,
} from '@/components/common/DocumentEditorLayout';
import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
import { calculateDocumentProgress, type DocumentProgressSection } from '@/lib/document-progress';

import { QuestionCard } from './_components/question-card';
import { QuestionForm } from './_components/question-form';
import {
  isQuestionComplete,
  type CoverLetterDraft,
  type CoverLetterQuestion,
} from './_model/cover-letter';

type CoverLetterEditorProps = Pick<DocumentEditorLayoutProps, 'onDocumentChange' | 'statuses'> & {
  initialQuestions?: CoverLetterQuestion[];
  progressSections?: readonly DocumentProgressSection<CoverLetterDraft>[];
  onSaveDraft: (draft: CoverLetterDraft) => void;
};

export function CoverLetterEditor({
  initialQuestions = [],
  progressSections,
  onSaveDraft,
  onDocumentChange,
  statuses,
}: CoverLetterEditorProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [editing, setEditing] = useState<CoverLetterQuestion | null>(null);

  const newQuestion = editing && !questions.some(({ id }) => id === editing.id) ? editing : null;
  const totalQuestions = questions.length + (newQuestion ? 1 : 0);
  const sections =
    progressSections ??
    [...questions, ...(newQuestion ? [newQuestion] : [])].map(({ id }) => ({
      id,
      isComplete: (saved: CoverLetterDraft) =>
        saved.questions.some((entry) => entry.id === id && isQuestionComplete(entry)),
    }));
  const progress = calculateDocumentProgress({ questions }, sections);

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
      progress={progress.percentage}
      statuses={{ ...statuses, 'cover-letter': progress.status }}
      onDocumentChange={onDocumentChange}
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
