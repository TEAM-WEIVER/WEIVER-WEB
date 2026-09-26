import { accountSettingsHandlers } from './account-settings';
import { onboardingNewUserHandlers } from './onboarding';
import { interviewPageHandlers } from './interview';

export const handlers = [
  ...onboardingNewUserHandlers,
  ...interviewPageHandlers,
  ...accountSettingsHandlers,
];
