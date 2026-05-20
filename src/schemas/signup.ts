import { z } from 'zod';

export const individualTermsSchema = z.object({
  serviceTerms: z.boolean().refine((v) => v === true, '서비스 이용약관에 동의해주세요.'),
  privacyPolicy: z.boolean().refine((v) => v === true, '개인정보 처리방침에 동의해주세요.'),
  individualTerms: z.boolean().refine((v) => v === true, '개인회원 이용약관에 동의해주세요.'),
  aiAnalysisConsent: z.boolean().refine((v) => v === true, 'AI 분석 동의에 동의해주세요.'),
  sensitiveDataConsent: z.boolean().refine((v) => v === true, '민감정보 처리 동의에 동의해주세요.'),
  marketingConsent: z.boolean(),
});

export type IndividualTermsData = z.infer<typeof individualTermsSchema>;

export const individualAccountSchema = z
  .object({
    email: z.string().email('올바른 이메일 형식을 입력해주세요.'),
    password: z
      .string()
      .min(6, '6자 이상이어야 합니다.')
      .max(14, '14자 이하여야 합니다.')
      .regex(/[a-zA-Z]/, '영문이 포함되어야 합니다.')
      .regex(/[0-9]/, '숫자가 포함되어야 합니다.')
      .regex(/[^a-zA-Z0-9]/, '특수문자가 포함되어야 합니다.'),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

export type IndividualAccountData = z.infer<typeof individualAccountSchema>;
