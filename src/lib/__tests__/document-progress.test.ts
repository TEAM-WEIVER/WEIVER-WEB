import { describe, expect, it } from 'vitest';

import {
  calculateDocumentProgress,
  calculateOverallDocumentProgress,
  type DocumentProgressSection,
} from '../document-progress';

type SavedSections = Record<string, readonly string[]>;

function sections(...ids: string[]): DocumentProgressSection<SavedSections>[] {
  return ids.map((id) => ({
    id,
    isComplete: (saved) => saved[id]?.some((value) => value.trim().length > 0) ?? false,
  }));
}

describe('document-progress', () => {
  it('대상이 없거나 아직 저장하지 않았으면 미작성 0%다', () => {
    expect(calculateDocumentProgress({}, [])).toEqual({
      completed: 0,
      total: 0,
      percentage: 0,
      status: 'notStarted',
    });
    expect(calculateDocumentProgress({}, sections('education'))).toMatchObject({
      total: 1,
      percentage: 0,
      status: 'notStarted',
    });
  });

  it('페이지별 완료 기준으로 집계하고 소수점은 버린다', () => {
    expect(
      calculateDocumentProgress(
        { education: ['졸업'], career: ['  '] },
        sections('education', 'career', 'awards'),
      ),
    ).toEqual({ completed: 1, total: 3, percentage: 33, status: 'inProgress' });
  });

  it('같은 섹션의 여러 항목과 중복 ID를 중복 집계하지 않는다', () => {
    const config = sections('education', 'education', 'career', 'awards', 'certifications');
    const saved = { education: ['학교 1', '학교 2'] };
    expect(calculateDocumentProgress(saved, config)).toEqual({
      completed: 1,
      total: 4,
      percentage: 25,
      status: 'inProgress',
    });
    expect(calculateDocumentProgress(saved, config).percentage).toBe(25);
  });

  it('제외된 섹션은 완료 판정도 실행하지 않는다', () => {
    const config: DocumentProgressSection<SavedSections>[] = [
      ...sections('education'),
      {
        id: 'awards',
        included: false,
        isComplete: () => {
          throw new Error('제외된 섹션은 검사하지 않아야 한다');
        },
      },
    ];
    expect(calculateDocumentProgress({ education: ['졸업'] }, config)).toEqual({
      completed: 1,
      total: 1,
      percentage: 100,
      status: 'complete',
    });
    expect(calculateDocumentProgress({}, [{ ...config[0], included: false }]).percentage).toBe(0);
  });

  it('대상 추가·제외·삭제와 저장 데이터 재로딩을 현재 구성에 맞게 계산한다', () => {
    const saved = { education: ['졸업'] };
    expect(calculateDocumentProgress(saved, sections('education')).percentage).toBe(100);
    const config = sections('education', 'career');
    expect(calculateDocumentProgress(saved, config).percentage).toBe(50);
    const reloaded: SavedSections = JSON.parse(JSON.stringify(saved));
    expect(calculateDocumentProgress(reloaded, config)).toEqual(
      calculateDocumentProgress(saved, config),
    );
    expect(calculateDocumentProgress({ education: [] }, config).percentage).toBe(0);
  });

  it('전체 진행률은 서류별 항목 수를 합산하고 모든 항목 완료 시에만 100%다', () => {
    const resume = calculateDocumentProgress({ education: ['졸업'] }, sections('education'));
    const coverLetter = calculateDocumentProgress({}, sections('q1', 'q2', 'q3'));
    expect(calculateOverallDocumentProgress([resume, coverLetter])).toEqual({
      completed: 1,
      total: 4,
      percentage: 25,
      status: 'inProgress',
    });
    expect(calculateOverallDocumentProgress([resume, resume])).toMatchObject({
      percentage: 100,
      status: 'complete',
    });
    expect(calculateOverallDocumentProgress([])).toMatchObject({
      percentage: 0,
      status: 'notStarted',
    });
  });
});
