const SIGNUP_FLOW = ['account-info', 'agreements', 'completion'] as const;

export function getSignupFlow() {
  return SIGNUP_FLOW;
}

export function getFirstStep() {
  return SIGNUP_FLOW[0];
}

export function getNextStep(currentStep: string): string | null {
  const idx = SIGNUP_FLOW.indexOf(currentStep as (typeof SIGNUP_FLOW)[number]);
  return idx >= 0 && idx < SIGNUP_FLOW.length - 1 ? SIGNUP_FLOW[idx + 1] : null;
}

export function getPrevStep(currentStep: string): string | null {
  const idx = SIGNUP_FLOW.indexOf(currentStep as (typeof SIGNUP_FLOW)[number]);
  return idx > 0 ? SIGNUP_FLOW[idx - 1] : null;
}

export function getStepNumber(currentStep: string): number {
  return SIGNUP_FLOW.indexOf(currentStep as (typeof SIGNUP_FLOW)[number]) + 1;
}
