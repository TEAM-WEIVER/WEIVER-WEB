import { z } from 'zod';

/* ─── 기업 유형 ─── */

export const CompanyTypeSchema = z.enum([
  'LARGE_ENTERPRISE',
  'MIDDLE_MARKET',
  'SME',
  'STARTUP',
  'VENTURE',
]);

export type CompanyType = z.infer<typeof CompanyTypeSchema>;

/* ─── 기업 상세 정보 ─── */

export const CompanyDetailSchema = z.object({
  companyName: z.string().nullable().optional(),
  companyType: CompanyTypeSchema.nullable().optional(),
  employeeNum: z.number().nullable().optional(),
  companyCeoName: z.string().nullable().optional(),
  foundedYear: z.string().nullable().optional(),
  companyLogoUrl: z.string().nullable().optional(),
  companyUrl: z.string().nullable().optional(),
  avgSale: z.number().nullable().optional(),
  address: z.string().nullable().optional(),
  cultureDescription: z.string().nullable().optional(),
  directionDescription: z.string().nullable().optional(),
  workPace: z.enum(['FAST_EXECUTION', 'CAREFUL_EXECUTION']).nullable().optional(),
  decisionMaking: z.enum(['RESPECT_INDIVIDUAL', 'TEAM_CONSENSUS']).nullable().optional(),
  roleDefinition: z.enum(['CLEAR_RESPONSIBILITY', 'FLEXIBLE_ROLE']).nullable().optional(),
  operationStyle: z.enum(['EXPERIMENT_ORIENTED', 'STABILITY_ORIENTED']).nullable().optional(),
  additionalWorkStyle: z.string().nullable().optional(),
});

export type CompanyDetail = z.infer<typeof CompanyDetailSchema>;
