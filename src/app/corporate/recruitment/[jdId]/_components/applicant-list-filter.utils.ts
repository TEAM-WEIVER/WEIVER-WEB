export const DEFAULT_SKILL_SCORE_MIN = 80;
export const MAX_TECH_STACK_FILTERS = 3;
export const ALL_CULTURE_STYLE_LABEL = '전체 스타일';

export const CULTURE_STYLE_OPTIONS = [
  ALL_CULTURE_STYLE_LABEL,
  '추진형 실행가',
  '자율형 혁신가',
  '협업형 조율가',
  '안정형 관리자',
] as const;

export type CultureStyleOption = (typeof CULTURE_STYLE_OPTIONS)[number];

export type ApplicantFilterDraft = {
  skillScoreMin: number;
  cultureStyle: CultureStyleOption;
  techStacks: string[];
};

export type AppliedApplicantFilters = {
  skillScoreMin?: number;
  cultureStyle?: string;
  techStacks?: string[];
};

export function createDefaultApplicantFilterDraft(): ApplicantFilterDraft {
  return {
    skillScoreMin: DEFAULT_SKILL_SCORE_MIN,
    cultureStyle: ALL_CULTURE_STYLE_LABEL,
    techStacks: [],
  };
}

export function toAppliedApplicantFilters(draft: ApplicantFilterDraft): AppliedApplicantFilters {
  return {
    skillScoreMin: draft.skillScoreMin,
    cultureStyle: draft.cultureStyle === ALL_CULTURE_STYLE_LABEL ? undefined : draft.cultureStyle,
    techStacks: draft.techStacks.length > 0 ? draft.techStacks : undefined,
  };
}

export function normalizeTechStackFilter(value: string) {
  return value.trim();
}

export function addTechStackFilter(
  techStacks: string[],
  value: string,
  maxCount = MAX_TECH_STACK_FILTERS,
) {
  const nextTechStack = normalizeTechStackFilter(value);
  if (!nextTechStack || techStacks.length >= maxCount) return techStacks;

  const hasSameTechStack = techStacks.some(
    (techStack) => techStack.toLowerCase() === nextTechStack.toLowerCase(),
  );

  return hasSameTechStack ? techStacks : [...techStacks, nextTechStack];
}

export function removeTechStackFilter(techStacks: string[], target: string) {
  return techStacks.filter((techStack) => techStack !== target);
}
