import { initializeRows } from './resume-editor';
import { resumeProgressSections } from './resume-progress';
import { resumeSections, type ResumeDraft, type ResumeRows } from './resume-sections';
import { validateEntry } from './resume-validation';
import { calculateDocumentProgress } from '@/lib/document-progress';

export function getResumeProgress(draft?: ResumeDraft) {
  const rows: ResumeRows = {
    education: initializeRows(resumeSections.education.fields, draft?.education ?? []),
    career: initializeRows(resumeSections.career.fields, draft?.career ?? []),
    certifications: initializeRows(
      resumeSections.certifications.fields,
      draft?.certifications ?? [],
    ),
    awards: initializeRows(resumeSections.awards.fields, draft?.awards ?? []),
  };
  return calculateDocumentProgress(rows, resumeProgressSections);
}

/** 학력은 최소 1건 필요하며 경력·자격증·수상은 입력한 항목만 검증한다. */
export function hasMasterResume(draft?: ResumeDraft): draft is ResumeDraft {
  if (!draft?.education.length) return false;
  return (
    draft.education.every(
      (entry) => !Object.keys(validateEntry(resumeSections.education.fields, entry)).length,
    ) &&
    draft.career.every(
      (entry) => !Object.keys(validateEntry(resumeSections.career.fields, entry)).length,
    ) &&
    draft.certifications.every(
      (entry) => !Object.keys(validateEntry(resumeSections.certifications.fields, entry)).length,
    ) &&
    draft.awards.every(
      (entry) => !Object.keys(validateEntry(resumeSections.awards.fields, entry)).length,
    )
  );
}
