import { describe, expect, it } from 'vitest';

import { hasMasterResume } from './master-resume';
import type { ResumeDraft } from './resume-sections';

const draft: ResumeDraft = {
  education: [
    {
      level: '대학교 (4년제)',
      school: '위버대학교',
      major: '컴퓨터공학',
      grade: '4.1',
      gradeScale: '4.5',
      startMonth: '2020.03',
      endMonth: '2024.02',
      status: '졸업',
    },
  ],
  career: [],
  certifications: [],
  awards: [],
};

describe('마스터본 선행 작성 조건', () => {
  it('빈 저장이나 미완성 학력으로 공고별 작성에 진입하지 않는다', () => {
    expect(hasMasterResume()).toBe(false);
    expect(hasMasterResume({ ...draft, education: [] })).toBe(false);
    expect(hasMasterResume({ ...draft, education: [{ ...draft.education[0], school: '' }] })).toBe(
      false,
    );
  });

  it('경력·자격증·수상 이력이 없어도 유효한 학력이 있으면 진입한다', () => {
    expect(hasMasterResume(draft)).toBe(true);
  });

  it('선택 항목을 입력했다면 필수값과 날짜가 유효해야 한다', () => {
    expect(
      hasMasterResume({
        ...draft,
        certifications: [{ name: '기사', issuer: '', issuedDate: '2025.02.30', score: '' }],
      }),
    ).toBe(false);
    expect(
      hasMasterResume({
        ...draft,
        career: [
          {
            company: '위버',
            position: '개발자',
            employmentType: '정규직',
            employmentStatus: '재직중',
            startMonth: '2024.03',
            endMonth: '',
            duties: '서비스 개발',
          },
        ],
      }),
    ).toBe(true);
  });
});
