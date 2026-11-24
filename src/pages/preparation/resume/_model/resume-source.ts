import type { ResumeDraft } from './resume-sections';
import type { ResumeValues } from './resume-types';

/** 마지막 불러오기/저장 시점을 기준으로 다음 변경분을 계산한다. */
export type ResumeSource = {
  baseline: ResumeDraft;
  masterEntryIds: string[];
};

export function withResumeEntryIds(draft: ResumeDraft): ResumeDraft {
  function identify<Name extends string>(entries: ResumeValues<Name>[]) {
    return entries.map((entry) => ({ ...entry, entryId: entry.entryId ?? crypto.randomUUID() }));
  }
  return {
    education: identify(draft.education),
    career: identify(draft.career),
    certifications: identify(draft.certifications),
    awards: identify(draft.awards),
  };
}

export function createResumeSource(draft: ResumeDraft): ResumeSource {
  return {
    baseline: structuredClone(draft),
    masterEntryIds: Object.values(draft).flatMap((entries) =>
      entries.flatMap(({ entryId }) => (entryId ? [entryId] : [])),
    ),
  };
}

export function advanceResumeSource(source: ResumeSource, draft: ResumeDraft): ResumeSource {
  return {
    baseline: structuredClone(draft),
    masterEntryIds: [...source.masterEntryIds],
  };
}

// TODO(#205): baseline과 항목 ID를 기준으로 변경분을 비교하고 선택적으로 마스터본에 반영한다.
