import { z } from 'zod';

/* ─── 프로필 상세 ─── */

export const ProfileDetailSchema = z.object({
  applicantId: z.number().optional(),
  name: z.string(),
  phoneNumber: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
});

export type ProfileDetail = z.infer<typeof ProfileDetailSchema>;

/* ─── 카드 상세 ─── */

export const CardDetailSchema = z.object({
  skillScore: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  culturefitStyle: z.string().nullable().optional(),
  skillTags: z.array(z.string()).optional(),
});

export type CardDetail = z.infer<typeof CardDetailSchema>;

/* ─── 카드 요약 (ApplicantCardResponseDTO) ─── */

export const CardSummarySchema = z.object({
  profile: ProfileDetailSchema.nullable().optional(),
  card: CardDetailSchema.nullable().optional(),
  memo: z.string().nullable().optional(),
});

export type CardSummary = z.infer<typeof CardSummarySchema>;

/* ─── 주요 경력 ─── */

export const MajorCareerSchema = z.object({
  experienceId: z.number().optional(),
  companyName: z.string(),
  position: z.string().nullable().optional(),
  employeeType: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  duties: z.string().nullable().optional(),
});

export type MajorCareer = z.infer<typeof MajorCareerSchema>;

/* ─── AI 요약 (SummaryCardResponseDTO) ─── */

export const AiSummarySchema = z.object({
  aiSummary: z.string().nullable().optional(),
  majorCareers: z.array(MajorCareerSchema).optional(),
});

export type AiSummary = z.infer<typeof AiSummarySchema>;

/* ─── 역량 상세 ─── */

export const CompetencyDetailSchema = z.object({
  name: z.string(),
  percentage: z.number(),
});

export type CompetencyDetail = z.infer<typeof CompetencyDetailSchema>;

/* ─── 스킬핏 (SkillFitSummaryDTO) ─── */

export const SkillFitSchema = z.object({
  aiSkillAnalysis: z.array(CompetencyDetailSchema).optional(),
  aiAbilitySummary: z.string().nullable().optional(),
  skillTags: z.array(z.string()).optional(),
  matchingRate: z.number().nullable().optional(),
});

export type SkillFit = z.infer<typeof SkillFitSchema>;

/* ─── 컬처핏 축 ─── */

export const CultureAxisSchema = z.object({
  name: z.string(),
  percentage: z.number(),
});

export type CultureAxis = z.infer<typeof CultureAxisSchema>;

/* ─── 하위 성향 ─── */

export const SubTraitSchema = z.object({
  name: z.string(),
  percentage: z.number(),
});

export type SubTrait = z.infer<typeof SubTraitSchema>;

/* ─── 컬처핏 축 상세 ─── */

export const AxisDetailSchema = z.object({
  name: z.string(),
  percentage: z.number(),
  subTraits: z.array(SubTraitSchema).optional(),
});

export type AxisDetail = z.infer<typeof AxisDetailSchema>;

/* ─── 컬처핏 (CultureFitSummaryDTO) ─── */

export const CultureFitSchema = z.object({
  matchStatus: z.string().nullable().optional(),
  culturefitStyle: z.string().nullable().optional(),
  topTwoAxes: z.array(CultureAxisSchema).optional(),
  aiSummary: z.string().nullable().optional(),
  axesDetails: z.array(AxisDetailSchema).optional(),
});

export type CultureFit = z.infer<typeof CultureFitSchema>;

/* ─── 포트폴리오 상세 ─── */

export const PortfolioDetailSchema = z.object({
  portfolioFileUrl: z.string().nullable().optional(),
  urlGithub: z.string().nullable().optional(),
  urlTech: z.string().nullable().optional(),
  urlEtc: z.string().nullable().optional(),
});

export type PortfolioDetail = z.infer<typeof PortfolioDetailSchema>;

/* ─── 면접 스크립트 턴 ─── */

export const InterviewTurnSchema = z.object({
  question_code: z.string().nullable().optional(),
  sequence: z.number().optional(),
  question: z.string().nullable().optional(),
  answer: z.string().nullable().optional(),
});

export type InterviewTurn = z.infer<typeof InterviewTurnSchema>;

/* ─── 서류 요약 (DocumentTabSummaryDTO) ─── */

export const DocumentSummarySchema = z.object({
  portfolio: PortfolioDetailSchema.nullable().optional(),
  techInterviewScripts: z.array(InterviewTurnSchema).optional(),
  cultureInterviewScripts: z.array(InterviewTurnSchema).optional(),
});

export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;
