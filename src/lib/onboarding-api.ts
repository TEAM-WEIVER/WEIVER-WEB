import { apiRequest } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string | null;
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
  EducationDTO?:
    | {
        educationId: number;
        schoolName: string;
        degree: string;
        major: string | null;
        gpa: number | null;
        startDate: string | null;
        endDate: string | null;
        status: string | null;
      }[]
    | null;
  AwardDTO?:
    | {
        awardId: number;
        awardName: string;
        awardDate: string | null;
        issuer: string | null;
      }[]
    | null;
  WorkExperienceDTO?:
    | {
        experienceId: number;
        companyName: string;
        position: string | null;
        startDate: string | null;
        endDate: string | null;
        duties: string | null;
        employmentType: string | null;
        isRecognized?: boolean | null;
      }[]
    | null;
  CertificateDTO?:
    | {
        certificateId: number;
        certificateName: string;
        acquisitionDate: string | null;
        issuer: string | null;
      }[]
    | null;
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

interface EducationDTO {
  degreeType: string;
  schoolName: string;
  major?: string;
  gpa?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}

interface EducationUpdateDTO extends EducationDTO {
  educationId?: number;
}

export function postEducations(educations: EducationDTO[]) {
  return apiRequest<ApiResponse<string>>('/api/applicants/education', {
    method: 'POST',
    body: { EducationDTO: educations },
  });
}

export function putEducations(educations: EducationUpdateDTO[]) {
  return apiRequest<ApiResponse<string>>('/api/applicants/education', {
    method: 'PUT',
    body: { EducationUpdateDTO: educations },
  });
}

interface WorkExperienceDTO {
  companyName: string;
  startDate?: string;
  endDate?: string;
  employmentType?: string;
  position?: string;
  duties?: string;
  isRecognized?: boolean;
}

interface WorkExperienceUpdateDTO extends WorkExperienceDTO {
  workExperienceId?: number;
}

export function postExperiences(workExperiences: WorkExperienceDTO[]) {
  return apiRequest<ApiResponse<string>>('/api/applicants/experience', {
    method: 'POST',
    body: { WorkExperienceDTO: workExperiences },
  });
}

export function putExperiences(workExperiences: WorkExperienceUpdateDTO[]) {
  return apiRequest<ApiResponse<string>>('/api/applicants/experience', {
    method: 'PUT',
    body: { WorkExperienceUpdateDTO: workExperiences },
  });
}

interface CertificateDTO {
  acquisitionDate?: string;
  certificateName: string;
  issuer?: string;
}

interface CertificateUpdateDTO extends CertificateDTO {
  certificateId?: number;
}

export function postCertificates(certificates: CertificateDTO[]) {
  return apiRequest<ApiResponse<string>>('/api/applicants/certificate', {
    method: 'POST',
    body: { CertificateDTO: certificates },
  });
}

export function putCertificates(certificates: CertificateUpdateDTO[]) {
  return apiRequest<ApiResponse<string>>('/api/applicants/certificate', {
    method: 'PUT',
    body: { CertificateUpdateDTO: certificates },
  });
}

interface AwardDTO {
  awardDate?: string;
  awardName: string;
  issuer?: string;
}

interface AwardUpdateDTO extends AwardDTO {
  awardId?: number;
}

export function postAwards(awards: AwardDTO[]) {
  return apiRequest<ApiResponse<string>>('/api/applicants/award', {
    method: 'POST',
    body: { AwardDTO: awards },
  });
}

export function putAwards(awards: AwardUpdateDTO[]) {
  return apiRequest<ApiResponse<string>>('/api/applicants/award', {
    method: 'PUT',
    body: { AwardUpdateDTO: awards },
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
