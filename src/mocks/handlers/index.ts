import { accountSettingsHandlers } from './account-settings';
import { onboardingNewUserHandlers } from './onboarding';
import { interviewAudioUploadHandlers, interviewPageHandlers } from './interview';
import { inquiryHandlers } from './inquiry';

export const handlers = [
  ...onboardingNewUserHandlers,
  ...interviewPageHandlers,
  ...interviewAudioUploadHandlers,
  ...accountSettingsHandlers,
  ...inquiryHandlers,
];
