import type { DocumentProgressSection } from '@/lib/document-progress';

import { resumeSections, type ResumeRows } from './resume-sections';
import type { ResumeField, ResumeRow } from './resume-types';
import { validateEntry } from './resume-validation';

function hasSavedEntry<Name extends string>(
  fields: readonly ResumeField<Name>[],
  rows: readonly ResumeRow<Name>[],
) {
  return rows.some(
    (row) => row.saved && Object.keys(validateEntry(fields, row.saved)).length === 0,
  );
}

export const resumeProgressSections: readonly DocumentProgressSection<ResumeRows>[] = [
  {
    id: 'education',
    isComplete: (rows) => hasSavedEntry(resumeSections.education.fields, rows.education),
  },
  {
    id: 'career',
    isComplete: (rows) =>
      rows.noHistory?.includes('career') ||
      hasSavedEntry(resumeSections.career.fields, rows.career),
  },
  {
    id: 'certifications',
    isComplete: (rows) =>
      rows.noHistory?.includes('certifications') ||
      hasSavedEntry(resumeSections.certifications.fields, rows.certifications),
  },
  {
    id: 'awards',
    isComplete: (rows) =>
      rows.noHistory?.includes('awards') ||
      hasSavedEntry(resumeSections.awards.fields, rows.awards),
  },
];
