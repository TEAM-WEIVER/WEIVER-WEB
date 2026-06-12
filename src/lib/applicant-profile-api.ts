import { getDocumentStatus } from './onboarding-api';
import type { OnboardingProgress } from './onboarding-flow';

export interface ApplicantDetail {
  photoUrl: string | null;
  name: string;
  birthday: string | null;
  phoneNumber: string;
  email: string;
}

export interface ApplicantProfileOverview {
  applicant?: ApplicantDetail;
  progress: OnboardingProgress;
}

export async function getApplicantProfileOverview(): Promise<ApplicantProfileOverview> {
  const { data } = await getDocumentStatus();

  return {
    applicant: undefined,
    progress: {
      resume: data.resumeCompleted,
      'cover-letter': data.essayCompleted,
      portfolio: data.portfolioCompleted,
    },
  };
}
