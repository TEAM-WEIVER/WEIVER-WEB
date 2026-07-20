import { z } from 'zod';

/* ─── 지원자 목록 단일 아이템 ─── */

export const ApplicantListItemSchema = z.object({
  publicId: z.string(),
  profileImageUrl: z.string().nullable().optional(),
  applicantName: z.string(),
  position: z.string().nullable().optional(),
  skillScore: z.number().nullable().optional(),
  cultureStyle: z.string().nullable().optional(),
  cultureTags: z.array(z.string()).optional(),
  techStacks: z.array(z.string()).optional(),
});

export type ApplicantListItem = z.infer<typeof ApplicantListItemSchema>;

/* ─── 페이지네이션 객체 ─── */

const SortObjectSchema = z.object({
  sorted: z.boolean().optional(),
  empty: z.boolean().optional(),
  unsorted: z.boolean().optional(),
});

const PageableObjectSchema = z.object({
  paged: z.boolean().optional(),
  pageNumber: z.number().optional(),
  pageSize: z.number().optional(),
  offset: z.number().optional(),
  sort: SortObjectSchema.optional(),
  unpaged: z.boolean().optional(),
});

/* ─── 지원자 목록 응답 (페이징) ─── */

export const ApplicantListResponseSchema = z.object({
  content: z.array(ApplicantListItemSchema),
  totalElements: z.number().optional(),
  totalPages: z.number().optional(),
  pageable: PageableObjectSchema.optional(),
  size: z.number().optional(),
  number: z.number().optional(),
  sort: SortObjectSchema.optional(),
  numberOfElements: z.number().optional(),
  first: z.boolean().optional(),
  last: z.boolean().optional(),
  empty: z.boolean().optional(),
});

export type ApplicantListResponse = z.infer<typeof ApplicantListResponseSchema>;

/* ─── 지원자 기본 정보 DTO ─── */

export const ApplicantDTOSchema = z.object({
  photoUrl: z.string().nullable().optional(),
  name: z.string(),
  address: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(),
  phoneNumber: z.string(),
  email: z.string(),
});

export type ApplicantDTO = z.infer<typeof ApplicantDTOSchema>;

/* ─── 학력 DTO ─── */

export const EducationDTOSchema = z.object({
  educationId: z.number(),
  schoolName: z.string(),
  degree: z.string(),
  major: z.string().nullable().optional(),
  gpa: z.number().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export type EducationDTO = z.infer<typeof EducationDTOSchema>;

/* ─── 수상 이력 DTO ─── */

export const AwardDTOSchema = z.object({
  awardId: z.number(),
  awardName: z.string(),
  awardDate: z.string().nullable().optional(),
  issuer: z.string().nullable().optional(),
});

export type AwardDTO = z.infer<typeof AwardDTOSchema>;

/* ─── 경력 정보 DTO ─── */

export const WorkExperienceDTOSchema = z.object({
  experienceId: z.number(),
  companyName: z.string(),
  position: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  duties: z.string().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  isRecognized: z.boolean().nullable().optional(),
});

export type WorkExperienceDTO = z.infer<typeof WorkExperienceDTOSchema>;

/* ─── 자격증 DTO ─── */

export const CertificateDTOSchema = z.object({
  certificateId: z.number(),
  certificateName: z.string(),
  acquisitionDate: z.string().nullable().optional(),
  issuer: z.string().nullable().optional(),
});

export type CertificateDTO = z.infer<typeof CertificateDTOSchema>;

/* ─── 지원자 상세 정보 ─── */

export const ApplicantDetailSchema = z.object({
  ApplicantDTO: ApplicantDTOSchema.nullable().optional(),
  EducationDTO: z.array(EducationDTOSchema).nullable().optional(),
  AwardDTO: z.array(AwardDTOSchema).nullable().optional(),
  WorkExperienceDTO: z.array(WorkExperienceDTOSchema).nullable().optional(),
  CertificateDTO: z.array(CertificateDTOSchema).nullable().optional(),
});

export type ApplicantDetail = z.infer<typeof ApplicantDetailSchema>;
