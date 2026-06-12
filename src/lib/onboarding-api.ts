import { apiRequest } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

export interface DocumentStatus {
  resumeCompleted: boolean;
  essayCompleted: boolean;
  portfolioCompleted: boolean;
}

export interface EssayAnswerData {
  answerId: string | null;
  answer: string | null;
}

export interface PortfolioData {
  portfolioId: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  urlGithub: string | null;
  urlTech: string | null;
  urlEtc: string | null;
}

export interface ApplicantsAllData {
  ApplicantDTO: {
    photoUrl: string | null;
    name: string;
    birthday: string | null;
    phoneNumber: string;
    email: string;
    address: string | null;
  } | null;
  EducationDTO: {
    educationId: number;
    schoolName: string;
    degree: string;
    major: string | null;
    gpa: number | null;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
  }[];
  AwardDTO: {
    awardId: number;
    awardName: string;
    awardDate: string | null;
    issuer: string | null;
  }[];
  WorkExperienceDTO: {
    experienceId: number;
    companyName: string;
    position: string | null;
    startDate: string | null;
    endDate: string | null;
    duties: string | null;
    employmentType: string | null;
  }[];
  CertificateDTO: {
    certificateId: number;
    certificateName: string;
    acquisitionDate: string | null;
    issuer: string | null;
  }[];
}

let applicantsAllPromise: Promise<ApiResponse<ApplicantsAllData>> | null = null;

export function getDocumentStatus() {
  return apiRequest<ApiResponse<DocumentStatus>>('/api/applicants/document-status');
}

export function getApplicantsAll() {
  applicantsAllPromise ??= apiRequest<ApiResponse<ApplicantsAllData>>('/api/applicants').finally(
    () => {
      applicantsAllPromise = null;
    },
  );

  return applicantsAllPromise;
}

export function getEssayAnswer() {
  return apiRequest<ApiResponse<EssayAnswerData>>('/api/essay-answers');
}

export function postEssayAnswer(answer: string) {
  return apiRequest<ApiResponse<null>>('/api/essay-answers', {
    method: 'POST',
    body: { answer },
  });
}

export function patchEssayAnswer(answerId: string, answer: string) {
  return apiRequest<ApiResponse<null>>(`/api/essay-answers/${answerId}`, {
    method: 'PATCH',
    body: { answer },
  });
}

export function getPortfolio() {
  return apiRequest<ApiResponse<PortfolioData>>('/api/portfolios');
}

export function saveApplicantInfo(formData: FormData) {
  return apiRequest<ApiResponse<null>>('/api/applicants/info', { method: 'PUT', body: formData });
}

export function saveEducations(
  educations: {
    degreeType: string;
    schoolName: string;
    major?: string;
    gpa?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }[],
) {
  return apiRequest<ApiResponse<null>>('/api/applicants/education', {
    method: 'POST',
    body: { educations },
  });
}

export function saveExperiences(
  workExperiences: {
    companyName: string;
    startDate?: string;
    endDate?: string;
    employmentType?: string;
    position?: string;
    duties?: string;
    isRecognized?: boolean;
  }[],
) {
  return apiRequest<ApiResponse<null>>('/api/applicants/experience', {
    method: 'POST',
    body: { workExperiences },
  });
}

export function saveCertificates(
  certificates: {
    acquisitionDate?: string;
    certificateName: string;
    issuer?: string;
  }[],
) {
  return apiRequest<ApiResponse<null>>('/api/applicants/certificate', {
    method: 'POST',
    body: { certificates },
  });
}

export function saveAwards(
  awards: {
    awardDate?: string;
    awardName: string;
    issuer?: string;
  }[],
) {
  return apiRequest<ApiResponse<null>>('/api/applicants/award', {
    method: 'POST',
    body: { awards },
  });
}

export function postPortfolio(formData: FormData) {
  return apiRequest<ApiResponse<null>>('/api/portfolios', { method: 'POST', body: formData });
}

export function patchPortfolio(portfolioId: string, formData: FormData) {
  return apiRequest<ApiResponse<null>>(`/api/portfolios/${portfolioId}`, {
    method: 'PATCH',
    body: formData,
  });
}
