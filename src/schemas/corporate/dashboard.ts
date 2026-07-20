import { z } from 'zod';

/* ─── 업무 방식 ─── */

export const WayOfWorkingDetailSchema = z.object({
  workPace: z.string().nullable().optional(),
  decisionMaking: z.string().nullable().optional(),
  roleDefinition: z.string().nullable().optional(),
  operationStyle: z.string().nullable().optional(),
});

export type WayOfWorkingDetail = z.infer<typeof WayOfWorkingDetailSchema>;

/* ─── 기업 대시보드 ─── */

export const CompanyDashboardSchema = z.object({
  companyId: z.number(),
  companyLogoUrl: z.string().nullable().optional(),
  companyCeoName: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  employeeNum: z.number().nullable().optional(),
  foundedYear: z.string().nullable().optional(),
  wayOfWorkingDetail: WayOfWorkingDetailSchema.nullable().optional(),
});

export type CompanyDashboard = z.infer<typeof CompanyDashboardSchema>;

/* ─── 채용 공고 상태 ─── */

export const JobPostingStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'CLOSED']);

export type JobPostingStatus = z.infer<typeof JobPostingStatusSchema>;

/* ─── 채용 공고 목록 단일 아이템 ─── */

export const JobPostingsDetailsSchema = z.object({
  jdId: z.number(),
  title: z.string(),
  status: z.string(),
  jobCategory: z.string().nullable().optional(),
  detailedJob: z.string().nullable().optional(),
  newApplicantCount: z.number().nullable().optional(),
});

export type JobPostingsDetails = z.infer<typeof JobPostingsDetailsSchema>;

/* ─── 페이징 메타 ─── */

export const PageInfoSchema = z.object({
  pageNumber: z.number(),
  pageSize: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
});

export type PageInfo = z.infer<typeof PageInfoSchema>;

/* ─── 채용 공고 목록 (페이징) ─── */

export const JobPostingsSummarySchema = z.object({
  content: z.array(JobPostingsDetailsSchema),
  pageable: PageInfoSchema.optional(),
});

export type JobPostingsSummary = z.infer<typeof JobPostingsSummarySchema>;

/* ─── 알림 ─── */

export const NotificationSchema = z.object({
  notificationId: z.number(),
  type: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  isRead: z.boolean(),
  jdId: z.number().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

export type Notification = z.infer<typeof NotificationSchema>;
