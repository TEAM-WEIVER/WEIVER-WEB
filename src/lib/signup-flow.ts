import type { SignupType } from '@/store/signup-store';

const SIGNUP_FLOWS: Record<SignupType, string[]> = {
  corporate: ['account', 'company-info', 'terms'],
  individual: ['account', 'terms'],
};

export function getSignupFlow(type: SignupType) {
  return SIGNUP_FLOWS[type];
}

export function getFirstStep(type: SignupType) {
  return SIGNUP_FLOWS[type][0];
}

export function getNextStep(type: SignupType, currentStep: string): string | null {
  const flow = SIGNUP_FLOWS[type];
  const idx = flow.indexOf(currentStep);
  return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
}

export function getPrevStep(type: SignupType, currentStep: string): string | null {
  const flow = SIGNUP_FLOWS[type];
  const idx = flow.indexOf(currentStep);
  return idx > 0 ? flow[idx - 1] : null;
}

export function getStepNumber(type: SignupType, currentStep: string): number {
  return SIGNUP_FLOWS[type].indexOf(currentStep) + 1;
}
