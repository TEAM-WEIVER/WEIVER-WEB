import { z } from 'zod';

/* ─── 채용 공고 요청 DTO ─── */

export const JobPostingRequestSchema = z.object({
  title: z.string().min(1),
  deadline: z.string(),
  jobCategory: z.string().min(1),
  detailedJob: z.string().min(1),
  jobDescription: z.string().nullable().optional(),
  qualifications: z.string().nullable().optional(),
  requirements: z.string().nullable().optional(),
  preferredQualifications: z.string().nullable().optional(),
  competencyPriorities: z.array(z.string()).optional(),
  requiredTechs: z.array(z.string()).optional(),
  traitPriorities: z.array(z.string()).optional(),
  emailTitle: z.string().min(1),
  emailContent: z.string().min(1),
});

export type JobPostingRequest = z.infer<typeof JobPostingRequestSchema>;

/* ─── 채용 공고 응답 DTO ─── */

export const JobPostingResponseSchema = JobPostingRequestSchema.extend({
  jdId: z.number(),
});

export type JobPostingResponse = z.infer<typeof JobPostingResponseSchema>;
