import { getApplicantsAll, getDocumentStatus } from './onboarding-api';
import type { OnboardingProgress } from './onboarding-flow';

export interface ApplicantDetail {
  photoUrl: string | null;
  name: string;
  birthday: string | null;
  phoneNumber: string | null;
  email: string;
}

export interface ApplicantProfileOverview {
  applicant?: ApplicantDetail;
  progress: OnboardingProgress;
}

export async function getApplicantProfileOverview(): Promise<ApplicantProfileOverview> {
  const [documentStatusResponse, applicantsAllResponse] = await Promise.all([
    getDocumentStatus(),
    getApplicantsAll(),
  ]);
  const applicant = applicantsAllResponse.data.ApplicantDTO;

  return {
    applicant: applicant
      ? {
          photoUrl: applicant.photoUrl,
          name: applicant.name,
          birthday: applicant.birthday,
          phoneNumber: applicant.phoneNumber,
          email: applicant.email,
        }
      : undefined,
    progress: {
      resume: documentStatusResponse.data.resumeCompleted,
      'cover-letter': documentStatusResponse.data.essayCompleted,
      portfolio: documentStatusResponse.data.portfolioCompleted,
    },
  };
}
