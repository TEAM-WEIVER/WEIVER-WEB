import { getApplicantsAll, getSubmissionStatus } from './onboarding-api';
import type { SyncStatus } from './onboarding-api';
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
  submitted: boolean;
  syncStatus: SyncStatus;
  submittable: boolean;
}

export async function getApplicantProfileOverview(): Promise<ApplicantProfileOverview> {
  const [submissionStatusResult, applicantsAllResult] = await Promise.allSettled([
    getSubmissionStatus(),
    getApplicantsAll(),
  ]);

  if (submissionStatusResult.status === 'rejected') {
    throw submissionStatusResult.reason;
  }

  const status = submissionStatusResult.value.data;
  const applicantDTO =
    applicantsAllResult.status === 'fulfilled' ? applicantsAllResult.value.data.ApplicantDTO : null;

  return {
    applicant: applicantDTO
      ? {
          photoUrl: applicantDTO.photoUrl,
          name: applicantDTO.name,
          birthday: applicantDTO.birthday,
          phoneNumber: applicantDTO.phoneNumber,
          email: applicantDTO.email,
        }
      : undefined,
    progress: {
      resume: status.resumeCompleted,
      'cover-letter': status.essayCompleted,
      portfolio: status.portfolioCompleted,
    },
    submitted: status.submitted,
    syncStatus: status.syncStatus,
    submittable: status.submittable,
  };
}
