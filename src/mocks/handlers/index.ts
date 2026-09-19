import { onboardingNewUserHandlers } from './onboarding';
import { interviewPageHandlers } from './interview';
import { corporateDashboardHandlers } from './corporate-dashboard';

export const handlers = [
  ...onboardingNewUserHandlers,
  ...interviewPageHandlers,
  ...corporateDashboardHandlers,
];
