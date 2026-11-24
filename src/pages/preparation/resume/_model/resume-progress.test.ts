import { describe, expect, it } from 'vitest';

import { calculateDocumentProgress } from '@/lib/document-progress';

import { initializeRows } from './resume-editor';
import { resumeProgressSections } from './resume-progress';
import { resumeSections, type ResumeRows } from './resume-sections';

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
