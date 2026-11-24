import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResumeDraft } from '@/pages/preparation/resume/_model/resume-sections';
import { createResumeSource } from '@/pages/preparation/resume/_model/resume-source';
import { usePreparationStore } from '../preparation-store';

const master: ResumeDraft = {
  education: [
    {
      entryId: 'education-1',
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
const posting = { companyName: '위버', positionName: '개발자', sourceUrl: '', content: '공고' };

beforeEach(() => usePreparationStore.getState().reset());
afterEach(() => {
  vi.restoreAllMocks();
  usePreparationStore.getState().reset();
});

describe('공고별 서류와 마스터본 분리', () => {
  it('이력 없음 선택도 원본과 분리하여 저장하고 새로고침 후 복원한다', async () => {
    const state = usePreparationStore.getState();
    const id = state.registerPosting(posting);
    const draft: ResumeDraft = {
      ...master,
      noHistory: ['career', 'certifications', 'awards'],
    };
    state.saveMasterResume(draft);
    state.saveResume(id, draft, { source: createResumeSource(draft) });
    draft.noHistory!.pop();
    expect(usePreparationStore.getState().resumes[id].noHistory).toEqual([
      'career',
      'certifications',
      'awards',
    ]);
    expect(usePreparationStore.getState().masterResume?.noHistory).toEqual([
      'career',
      'certifications',
      'awards',
    ]);
    const serialized = sessionStorage.getItem('weiver.preparation.drafts')!;
    usePreparationStore.setState({ masterResume: undefined, resumes: {}, resumeSources: {} });
    sessionStorage.setItem('weiver.preparation.drafts', serialized);
    await usePreparationStore.persist.rehydrate();
    expect(usePreparationStore.getState().resumes[id].noHistory).toEqual([
      'career',
      'certifications',
      'awards',
    ]);
    expect(usePreparationStore.getState().resumeSources[id].baseline.noHistory).toEqual([
      'career',
      'certifications',
      'awards',
    ]);
  });

  it('불러온 이력서를 편집·저장해도 마스터본과 다른 공고의 이력서는 유지한다', () => {
    const state = usePreparationStore.getState();
    const a = state.registerPosting(posting);
    const b = state.registerPosting(posting);
    state.saveMasterResume(master);
    state.saveResume(a, master, { source: createResumeSource(master) });
    state.saveResume(b, master, { source: createResumeSource(master) });
    const edited = structuredClone(master);
    edited.education[0].school = '공고 A 학교';
    const source = state.saveResume(a, edited);
    edited.education[0].school = '저장 후 추가 편집';
    expect(usePreparationStore.getState().resumes[a].education[0].school).toBe('공고 A 학교');
    expect(usePreparationStore.getState().resumes[b]).toEqual(master);
    expect(usePreparationStore.getState().masterResume).toEqual(master);
    expect(source?.baseline.education[0].school).toBe('공고 A 학교');
    expect(source?.masterEntryIds).toEqual(['education-1']);
  });

  it('새로고침용 복원에서도 항목 ID와 불러오기·저장 기준이 유지된다', async () => {
    const state = usePreparationStore.getState();
    const id = state.registerPosting(posting);
    state.saveMasterResume(master);
    state.saveResume(id, master, { source: createResumeSource(master) });
    const persisted = JSON.parse(sessionStorage.getItem('weiver.preparation.drafts')!).state;
    usePreparationStore.setState({ resumes: {}, resumeSources: {} });
    sessionStorage.setItem(
      'weiver.preparation.drafts',
      JSON.stringify({ version: 1, state: persisted }),
    );
    await usePreparationStore.persist.rehydrate();
    expect(usePreparationStore.getState().resumes[id]).toEqual(master);
    expect(usePreparationStore.getState().resumeSources[id].baseline).toEqual(master);
    expect(usePreparationStore.getState().masterResume).toEqual(master);
  });

  it('저장 실패 시 공고 저장본과 불러오기 기준을 함께 복원하고 재시도할 수 있다', () => {
    const state = usePreparationStore.getState();
    const id = state.registerPosting(posting);
    state.saveMasterResume(master);
    state.saveResume(id, master, { source: createResumeSource(master) });
    const previous = usePreparationStore.getState();
    const serialized = sessionStorage.getItem('weiver.preparation.drafts');
    const edited = structuredClone(master);
    edited.education[0].school = '실패 후 재시도';
    vi.spyOn(Object.getPrototypeOf(sessionStorage), 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    expect(() => state.saveResume(id, edited)).toThrow();
    expect(usePreparationStore.getState().resumes).toEqual(previous.resumes);
    expect(usePreparationStore.getState().resumeSources).toEqual(previous.resumeSources);
    expect(sessionStorage.getItem('weiver.preparation.drafts')).toBe(serialized);
    state.saveResume(id, edited);
    expect(usePreparationStore.getState().resumes[id].education[0].school).toBe('실패 후 재시도');
  });

  it('공고 삭제 시 그 공고의 서류와 기준 데이터만 제거한다', () => {
    const state = usePreparationStore.getState();
    const a = state.registerPosting(posting);
    const b = state.registerPosting(posting);
    for (const id of [a, b]) {
      state.saveResume(id, master, { source: createResumeSource(master) });
      state.saveCoverLetter(id, {
        questions: [{ id: `question-${id}`, question: id, answer: '답변' }],
      });
      state.savePortfolio(id, {
        items: [],
        editingItem: {
          id: null,
          title: id,
          file: new File(['pdf'], `${id}.pdf`, { type: 'application/pdf' }),
        },
      });
    }
    state.deletePosting(a);
    const current = usePreparationStore.getState();
    expect(current.resumes[a]).toBeUndefined();
    expect(current.resumeSources[a]).toBeUndefined();
    expect(current.coverLetters[a]).toBeUndefined();
    expect(current.portfolios[a]).toBeUndefined();
    expect(current.resumes[b]).toEqual(master);
    expect(current.coverLetters[b].questions[0].question).toBe(b);
    expect(current.portfolios[b].editingItem?.file?.name).toBe(`${b}.pdf`);
  });

  it('새 항목의 ID는 기존 항목 순서가 바뀌어도 유지되고 다른 공고와 공유되지 않는다', () => {
    const state = usePreparationStore.getState();
    const id = state.registerPosting(posting);
    const two = structuredClone(master);
    two.education.push({ ...two.education[0], entryId: undefined, school: '두 번째 학교' });
    state.saveResume(id, two);
    const saved = structuredClone(usePreparationStore.getState().resumes[id]);
    const addedId = saved.education[1].entryId;
    saved.education.reverse();
    state.saveResume(id, saved);
    expect(
      usePreparationStore.getState().resumes[id].education.map(({ entryId }) => entryId),
    ).toEqual([addedId, 'education-1']);
  });
});
