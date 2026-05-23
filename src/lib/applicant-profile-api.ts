import { ApiError, apiRequest } from './api-client';
import type { OnboardingProgress } from './onboarding-flow';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

export interface ApplicantDetail {
  photoUrl: string | null;
  name: string;
  birthday: string | null;
  phoneNumber: string;
  email: string;
}

export interface ApplicantInfo {
  ApplicantDTO: ApplicantDetail;
  EducationDTO: unknown[];
  AwardDTO: unknown[];
  WorkExperienceDTO: unknown[];
  CertificateDTO: unknown[];
}

interface EssayAnswer {
  answerId?: number;
  answer?: string | null;
}

interface Portfolio {
  portfolioId?: number;
  downloadUrl?: string | null;
  urlGithub?: string | null;
  urlTech?: string | null;
  urlEtc?: string | null;
}

export interface ApplicantProfileOverview {
  applicant: ApplicantDetail;
  progress: OnboardingProgress;
}

function hasResume(info: ApplicantInfo) {
  return (
    info.EducationDTO.length > 0 ||
    info.AwardDTO.length > 0 ||
    info.WorkExperienceDTO.length > 0 ||
    info.CertificateDTO.length > 0
  );
}

function hasEssayAnswer(essay: EssayAnswer | null | undefined) {
  return Boolean(essay?.answerId || essay?.answer?.trim());
}

function hasPortfolio(portfolio: Portfolio | null | undefined) {
  return Boolean(
    portfolio?.portfolioId ||
    portfolio?.downloadUrl ||
    portfolio?.urlGithub ||
    portfolio?.urlTech ||
    portfolio?.urlEtc,
  );
}

async function readOptionalProfileSection<TData>(
  request: () => Promise<ApiResponse<TData>>,
  isComplete: (data: TData) => boolean,
) {
  try {
    return isComplete((await request()).data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false;
    throw error;
  }
}

export function getApplicantInfo() {
  return apiRequest<ApiResponse<ApplicantInfo>>('/applicants');
}

function getEssayAnswer() {
  return apiRequest<ApiResponse<EssayAnswer>>('/essay-answers');
}

function getPortfolio() {
  return apiRequest<ApiResponse<Portfolio>>('/portfolios');
}

export async function getApplicantProfileOverview(): Promise<ApplicantProfileOverview> {
  const applicantInfoPromise = getApplicantInfo();
  const essayPromise = readOptionalProfileSection(getEssayAnswer, hasEssayAnswer);
  const portfolioPromise = readOptionalProfileSection(getPortfolio, hasPortfolio);

  const [applicantInfo, coverLetter, portfolio] = await Promise.all([
    applicantInfoPromise,
    essayPromise,
    portfolioPromise,
  ]);

  return {
    applicant: applicantInfo.data.ApplicantDTO,
    progress: {
      resume: hasResume(applicantInfo.data),
      'cover-letter': coverLetter,
      portfolio,
    },
  };
}
