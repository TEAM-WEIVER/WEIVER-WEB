import type { UserRole } from './auth-token';
import { getNextIncompleteOnboardingStep, getOnboardingPath } from './onboarding-flow';
import type { OnboardingProgress } from './onboarding-flow';

export const LOGIN_PATH = '/login';
export const APPLICANT_DASHBOARD_PATH = '/applicant/dashboard';
export const CORPORATE_DASHBOARD_PATH = '/corporate/dashboard';

export type ProtectedArea = 'onboarding' | 'corporate' | 'applicant';

export function getProtectedArea(pathname: string): ProtectedArea | null {
  if (pathname === '/onboarding' || pathname.startsWith('/onboarding/')) return 'onboarding';
  if (pathname === '/corporate' || pathname.startsWith('/corporate/')) return 'corporate';
  if (pathname === '/applicant' || pathname.startsWith('/applicant/')) return 'applicant';
  return null;
}

export function getRoleRedirectPath(pathname: string, role: UserRole | null) {
  const area = getProtectedArea(pathname);
  if (!area) return null;

  if (!role) return LOGIN_PATH;

  if (area === 'onboarding' && role !== 'APPLICANT') {
    return CORPORATE_DASHBOARD_PATH;
  }

  if (area === 'corporate' && role !== 'COMPANY') {
    return APPLICANT_DASHBOARD_PATH;
  }

  if (area === 'applicant' && role !== 'APPLICANT') {
    return CORPORATE_DASHBOARD_PATH;
  }

  return null;
}

export function getOnboardingProgressRedirectPath(pathname: string, progress: OnboardingProgress) {
  const nextStep = getNextIncompleteOnboardingStep(progress);
  const targetPath = nextStep ? getOnboardingPath(nextStep) : APPLICANT_DASHBOARD_PATH;

  return pathname === targetPath ? null : targetPath;
}
