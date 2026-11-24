import { useEffect, useRef, useState } from 'react';

import {
  DocumentEditorLayout,
  type DocumentEditorLayoutProps,
} from '@/components/common/DocumentEditorLayout';
import { calculateDocumentProgress, type DocumentProgressSection } from '@/lib/document-progress';
import { Button } from '@/components/ui/button';

import { ResumeSection } from './_components/resume-section';
import { collectDraftValues, initializeRows } from './_model/resume-editor';
import { resumeProgressSections } from './_model/resume-progress';
import {
  resumeSections,
  type ResumeDraft,
  type ResumeRows,
  type ResumeSectionName,
} from './_model/resume-sections';

type ResumeEditorProps = Pick<
  DocumentEditorLayoutProps,
  'onDocumentChange' | 'statuses' | 'visibleDocuments'
> & {
  initialDraft?: ResumeDraft;
  progressSections?: readonly DocumentProgressSection<ResumeRows>[];
  onSaveDraft: (draft: ResumeDraft) => void;
  onComplete?: (draft: ResumeDraft) => void;
  completeLabel?: string;
  title?: string;
  description?: string;
  error?: string;
  isSaving?: boolean;
  trackEntryIds?: boolean;
  onLoadMaster?: (currentDraft: ResumeDraft) => void;
  canLoadMaster?: boolean;
};

export default function ResumeEditor({
  initialDraft,
  visibleDocuments,
  progressSections = resumeProgressSections,
  onSaveDraft,
  onDocumentChange,
  statuses,
  onComplete,
  completeLabel = '저장하고 돌아가기',
  title = '이력서 작성',
  description,
  error,
  isSaving = false,
  trackEntryIds = false,
  onLoadMaster,
  canLoadMaster = true,
}: ResumeEditorProps) {
  const [rows, setRows] = useState<ResumeRows>(() => ({
    education: initializeRows(resumeSections.education.fields, initialDraft?.education),
    career: initializeRows(resumeSections.career.fields, initialDraft?.career),
    certifications: initializeRows(
      resumeSections.certifications.fields,
      initialDraft?.certifications,
    ),
    awards: initializeRows(resumeSections.awards.fields, initialDraft?.awards),
  }));
  const progress = calculateDocumentProgress(rows, progressSections);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  function updateSection<Section extends ResumeSectionName>(
    section: Section,
    update: (rows: ResumeRows[Section]) => ResumeRows[Section],
  ) {
    setRows((current) => ({ ...current, [section]: update(current[section]) }));
  }

  function getDraft(): ResumeDraft {
    return {
      education: collectDraftValues(rows.education, trackEntryIds),
      career: collectDraftValues(rows.career, trackEntryIds),
      certifications: collectDraftValues(rows.certifications, trackEntryIds),
      awards: collectDraftValues(rows.awards, trackEntryIds),
    };
  }

  return (
    <DocumentEditorLayout
      activeDocument="resume"
      isSaving={isSaving}
      visibleDocuments={visibleDocuments}
      progress={progress.percentage}
      statuses={{ ...statuses, resume: progress.status }}
      onSaveDraft={() => onSaveDraft(getDraft())}
      footerActions={
        onComplete ? (
          <Button
            type="button"
            size="xs"
            isLoading={isSaving}
            onClick={() => onComplete(getDraft())}
          >
            {completeLabel}
          </Button>
        ) : undefined
      }
      onDocumentChange={onDocumentChange}
    >
      <h1 className={description ? 'text-h2 text-text-primary mb-3' : 'sr-only'}>{title}</h1>
      {description ? <p className="text-body2 text-text-secondary mb-8">{description}</p> : null}
      {onLoadMaster ? (
        <div className="mb-6 flex justify-end">
          <Button
            data-load-master
            type="button"
            variant="outline"
            disabled={!canLoadMaster || isSaving}
            title={!canLoadMaster ? '작성된 마스터본이 없어요.' : undefined}
            onClick={() => onLoadMaster(getDraft())}
          >
            마스터본 불러오기
          </Button>
        </div>
      ) : null}
      {error ? (
        <p ref={errorRef} tabIndex={-1} role="alert" className="text-error mb-6">
          {error}
        </p>
      ) : null}
      <fieldset disabled={isSaving} className="min-w-0 space-y-10">
        <ResumeSection
          config={resumeSections.education}
          rows={rows.education}
          setRows={(update) => updateSection('education', update)}
        />
        <ResumeSection
          config={resumeSections.career}
          rows={rows.career}
          setRows={(update) => updateSection('career', update)}
        />
        <ResumeSection
          config={resumeSections.certifications}
          rows={rows.certifications}
          setRows={(update) => updateSection('certifications', update)}
        />
        <ResumeSection
          config={resumeSections.awards}
          rows={rows.awards}
          setRows={(update) => updateSection('awards', update)}
        />
      </fieldset>
    </DocumentEditorLayout>
  );
}
