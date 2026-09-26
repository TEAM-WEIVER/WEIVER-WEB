import { accountSettingsHandlers } from './account-settings';
import { onboardingNewUserHandlers } from './onboarding';
import { interviewPageHandlers } from './interview';
import { inquiryHandlers } from './inquiry';

export const handlers = [
  ...onboardingNewUserHandlers,
  ...interviewPageHandlers,
  ...accountSettingsHandlers,
  ...inquiryHandlers,
];
