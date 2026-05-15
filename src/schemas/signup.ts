import { z } from 'zod';

const requiredString = (message: string) => z.string().trim().min(1, message);
const numericString = (message: string) => z.string().trim().regex(/^\d+$/, message);

/* ─── 약관 동의 ─── */

export const corporateTermsSchema = z.object({
  serviceTerms: z.boolean().refine((v) => v === true, '서비스 이용약관에 동의해주세요.'),
  privacyPolicy: z.boolean().refine((v) => v === true, '개인정보 처리방침에 동의해주세요.'),
  corporateTerms: z.boolean().refine((v) => v === true, '기업회원 이용약관에 동의해주세요.'),
  marketingConsent: z.boolean(),
});

export type CorporateTermsData = z.infer<typeof corporateTermsSchema>;

export const individualTermsSchema = z.object({
  serviceTerms: z.boolean().refine((v) => v === true, '서비스 이용약관에 동의해주세요.'),
  privacyPolicy: z.boolean().refine((v) => v === true, '개인정보 처리방침에 동의해주세요.'),
  individualTerms: z.boolean().refine((v) => v === true, '개인회원 이용약관에 동의해주세요.'),
  aiAnalysisConsent: z.boolean().refine((v) => v === true, 'AI 분석 동의에 동의해주세요.'),
  sensitiveDataConsent: z.boolean().refine((v) => v === true, '민감정보 처리 동의에 동의해주세요.'),
  marketingConsent: z.boolean(),
});

export type IndividualTermsData = z.infer<typeof individualTermsSchema>;

/* ─── 계정 정보 (기업) ─── */

export const corporateAccountSchema = z
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
    companyName: z.string().min(1, '회사명을 입력해주세요.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

export type CorporateAccountData = z.infer<typeof corporateAccountSchema>;

/* ─── 계정 정보 (개인) ─── */

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

/* ─── 기업 정보 (기업 회원 2단계) ─── */

export const companyInfoSchema = z.object({
  companyType: requiredString('기업 형태를 선택해주세요.'),
  employeeCount: numericString('사원수는 숫자만 입력해주세요.'),
  ceoName: requiredString('대표명을 입력해주세요.').max(10, '대표명은 10자 이하여야 합니다.'),
  foundedYear: numericString('설립연도는 숫자만 입력해주세요.').length(
    4,
    '설립연도는 4자리로 입력해주세요.',
  ),
  averageRevenue: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), '평균매출액은 숫자만 입력해주세요.'),
  website: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^https?:\/\/.+/.test(value),
      '웹사이트는 http:// 또는 https://로 시작해야 합니다.',
    ),
  companyAddress: requiredString('회사 주소를 입력해주세요.'),
  culture: z.string().max(300, '300자를 초과할 수 없습니다.').optional(),
  workSpeed: z.string().optional(),
  decisionMaking: z.string().optional(),
  roleDefinition: z.string().optional(),
  operationStyle: z.string().optional(),
  workStyleNote: z.string().max(80, '80자를 초과할 수 없습니다.').optional(),
});

export type CompanyInfoData = z.infer<typeof companyInfoSchema>;
