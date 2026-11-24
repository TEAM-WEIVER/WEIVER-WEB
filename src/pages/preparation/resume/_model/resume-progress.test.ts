import { describe, expect, it } from 'vitest';

import { calculateDocumentProgress } from '@/lib/document-progress';

import { emptyValues, initializeRows } from './resume-editor';
import { resumeProgressSections } from './resume-progress';
import { resumeSections, type ResumeDraft, type ResumeRows } from './resume-sections';
import { getResumeProgress } from './master-resume';
import { createResumeSource, withResumeEntryIds } from './resume-source';

const certificate = { name: '정보처리기사', issuer: '', issuedDate: '2025.06.20', score: '' };

function initialRows(): ResumeRows {
  return {
    education: initializeRows(resumeSections.education.fields),
    career: initializeRows(resumeSections.career.fields),
    certifications: initializeRows(resumeSections.certifications.fields, [certificate]),
    awards: initializeRows(resumeSections.awards.fields),
  };
}

describe('이력서 진행률', () => {
  it('이력 없음 수정 중에는 저장된 완료 상태를 유지한다', () => {
    const rows = initialRows();
    rows.noHistory = ['career'];
    rows.career[0] = {
      ...rows.career[0],
      state: 'editing',
      input: { ...emptyValues(resumeSections.career.fields), company: '수정 중인 회사' },
      noHistory: false,
    };
    expect(calculateDocumentProgress(rows, resumeProgressSections).percentage).toBe(50);
  });

  it('이력 없음으로 저장한 선택 항목을 재진입·마스터본 불러오기 후에도 완료로 집계한다', () => {
    const draft: ResumeDraft = {
      education: [],
      career: [],
      certifications: [],
      awards: [],
      noHistory: ['career', 'certifications', 'awards'],
    };
    expect(getResumeProgress(draft).percentage).toBe(75);
    const imported = withResumeEntryIds(draft);
    expect(imported.noHistory).toEqual(draft.noHistory);
    expect(getResumeProgress(imported).percentage).toBe(75);
    expect(createResumeSource(imported).masterEntryIds).toEqual([]);
    expect(getResumeProgress({ ...draft, noHistory: [] }).percentage).toBe(0);
  });

  it('필수값을 검증한 저장 데이터만 완료로 집계한다', () => {
    const rows = initialRows();
    expect(calculateDocumentProgress(rows, resumeProgressSections).percentage).toBe(25);
    rows.certifications = initializeRows(resumeSections.certifications.fields, [
      { ...certificate, issuedDate: '2025.02.30' },
    ]);
    expect(calculateDocumentProgress(rows, resumeProgressSections).percentage).toBe(0);
  });

  it('수정 중인 필수값이 비어 있어도 기존 저장 상태를 유지한다', () => {
    const rows = initialRows();
    rows.certifications = [
      {
        id: 'editing',
        state: 'editing',
        input: { ...certificate, name: '' },
        saved: certificate,
      },
    ];
    expect(calculateDocumentProgress(rows, resumeProgressSections).percentage).toBe(25);
    rows.certifications = [{ id: 'new', state: 'editing', input: certificate }];
    expect(calculateDocumentProgress(rows, resumeProgressSections).percentage).toBe(0);
  });

  it('재직중이면 비활성화된 퇴사년월을 완료 조건에서 제외한다', () => {
    const rows = initialRows();
    rows.career = initializeRows(resumeSections.career.fields, [
      {
        company: '위버',
        position: '개발자',
        employmentType: '정규직',
        employmentStatus: '재직중',
        startMonth: '2023.03',
        endMonth: '',
        duties: '서비스 개발',
      },
    ]);
    expect(calculateDocumentProgress(rows, resumeProgressSections).percentage).toBe(50);
  });
});
