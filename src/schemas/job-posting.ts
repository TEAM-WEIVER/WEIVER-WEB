import { z } from 'zod';

export const jobPostingSchema = z.object({
  companyName: z.string().trim().min(1, '회사명을 입력해주세요.'),
  positionName: z.string().trim().min(1, '포지션명을 입력해주세요.'),
  sourceUrl: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
      } catch {
        return false;
      }
    }, 'http:// 또는 https://로 시작하는 올바른 URL을 입력해주세요.'),
  content: z.string().trim().min(1, '채용 공고 내용을 입력해주세요.'),
});

export type JobPostingValues = z.infer<typeof jobPostingSchema>;
