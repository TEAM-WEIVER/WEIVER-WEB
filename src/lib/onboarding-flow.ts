const ONBOARDING_STEPS = ['resume', 'cover-letter', 'portfolio'] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const STEP_TITLES: Record<OnboardingStep, string> = {
  resume: '이력서를 작성해주세요.',
  'cover-letter': '자기소개서를 작성해주세요.',
  portfolio: '포트폴리오를 업로드해주세요.',
};

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function getOnboardingPath(step: OnboardingStep) {
  return `/onboarding/${step}`;
}

export function getNextOnboardingStep(current: OnboardingStep): OnboardingStep | null {
  const idx = ONBOARDING_STEPS.indexOf(current);
  return idx >= 0 && idx < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[idx + 1] : null;
}

export function getPrevOnboardingStep(current: OnboardingStep): OnboardingStep | null {
  const idx = ONBOARDING_STEPS.indexOf(current);
  return idx > 0 ? ONBOARDING_STEPS[idx - 1] : null;
}

export function getOnboardingStepNumber(current: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(current) + 1;
}

export function getOnboardingStepTitle(current: OnboardingStep): string {
  return STEP_TITLES[current];
}
