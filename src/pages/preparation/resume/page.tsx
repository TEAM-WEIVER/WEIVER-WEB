import { useState } from 'react';

import {
  DocumentEditorLayout,
  type DocumentEditorLayoutProps,
} from '@/components/common/DocumentEditorLayout';

import { ResumeSection } from './_components/resume-section';
import {
  collectDraftValues,
  initializeRows,
  resumeSections,
  type ResumeDraft,
  type ResumeRows,
  type ResumeSectionName,
} from './_model/resume-editor';

type ResumeEditorProps = {
  initialDraft?: ResumeDraft;
  progress: number;
  onSaveDraft: (draft: ResumeDraft) => void;
  onDocumentChange?: DocumentEditorLayoutProps['onDocumentChange'];
};

export default function ResumeEditor({
  initialDraft,
  progress,
  onSaveDraft,
  onDocumentChange,
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

  function updateSection<Section extends ResumeSectionName>(
    section: Section,
    update: (rows: ResumeRows[Section]) => ResumeRows[Section],
  ) {
    setRows((current) => ({ ...current, [section]: update(current[section]) }));
  }

  function handleSaveDraft() {
    onSaveDraft({
      education: collectDraftValues(rows.education),
      career: collectDraftValues(rows.career),
      certifications: collectDraftValues(rows.certifications),
      awards: collectDraftValues(rows.awards),
    });
  }

  return (
    <DocumentEditorLayout
      activeDocument="resume"
      progress={progress}
      onSaveDraft={handleSaveDraft}
      onDocumentChange={onDocumentChange}
    >
      <h1 className="sr-only">이력서 작성</h1>
      <div className="space-y-10">
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
      </div>
    </DocumentEditorLayout>
  );
}
