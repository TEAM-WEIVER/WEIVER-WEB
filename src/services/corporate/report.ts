import { apiRequest } from '@/lib/api-client';
import type {
  CardSummary,
  AiSummary,
  SkillFit,
  CultureFit,
  DocumentSummary,
} from '@/schemas/corporate/report';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string | null;
}

function reportBase(jdId: number, applicantPublicId: string) {
  return `/api/job-postings/${jdId}/applicants/${applicantPublicId}/reports`;
}

export function getCardSummary(jdId: number, applicantPublicId: string) {
  return apiRequest<ApiResponse<CardSummary>>(`${reportBase(jdId, applicantPublicId)}/card-summary`);
}

export function getAiSummary(jdId: number, applicantPublicId: string) {
  return apiRequest<ApiResponse<AiSummary>>(`${reportBase(jdId, applicantPublicId)}/ai-summary`);
}

export function getSkillFit(jdId: number, applicantPublicId: string) {
  return apiRequest<ApiResponse<SkillFit>>(`${reportBase(jdId, applicantPublicId)}/skill-fit`);
}

export function getCultureFit(jdId: number, applicantPublicId: string) {
  return apiRequest<ApiResponse<CultureFit>>(`${reportBase(jdId, applicantPublicId)}/culture-fit`);
}

export function getDocumentSummary(jdId: number, applicantPublicId: string) {
  return apiRequest<ApiResponse<DocumentSummary>>(
    `${reportBase(jdId, applicantPublicId)}/document-summary`,
  );
}
