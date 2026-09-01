import { z } from 'zod';

/* ─── 학력 ─── */

export const educationSchema = z.object({
  educationId: z.number().optional(),
  type: z.string().min(1, '학력구분을 선택해주세요.'),
  school: z.string().min(1, '학교명을 입력해주세요.'),
  major: z.string().min(1, '전공명을 입력해주세요.'),
  gpa: z
    .string()
    .regex(
      /^(?:[0-3](?:\.\d{1,2})?|4(?:\.([0-4]\d?|5(?:0)?))?)$/,
      '학점은 0~4.5 사이의 숫자로 입력해주세요.',
    ),
  enrollmentDate: z.string().min(1, '입학년월을 선택해주세요.'),
  graduationDate: z.string().min(1, '졸업년월을 선택해주세요.'),
  status: z.string().min(1, '졸업상태를 선택해주세요.'),
});

const emptyEducationSchema = z.object({
  educationId: z.number().optional(),
  type: z.literal(''),
  school: z.literal(''),
  major: z.literal(''),
  gpa: z.literal(''),
  enrollmentDate: z.literal(''),
  graduationDate: z.literal(''),
  status: z.literal(''),
});

export type EducationData = z.infer<typeof educationSchema>;

/* ─── 자격증 ─── */

export const certificationSchema = z.object({
  certificateId: z.number().optional(),
  acquiredDate: z.string().min(1, '취득일을 선택해주세요.'),
  name: z.string().min(1, '자격증명을 입력해주세요.'),
  issuer: z.string().min(1, '발행처를 입력해주세요.'),
});

const emptyCertificationSchema = z.object({
  certificateId: z.number().optional(),
  acquiredDate: z.literal(''),
  name: z.literal(''),
  issuer: z.literal(''),
});

export type CertificationData = z.infer<typeof certificationSchema>;

/* ─── 수상이력 ─── */

export const awardSchema = z.object({
  awardId: z.number().optional(),
  date: z.string().min(1, '수상일을 선택해주세요.'),
  name: z.string().min(1, '수상명을 입력해주세요.'),
  issuer: z.string().min(1, '발행처를 입력해주세요.'),
});

const emptyAwardSchema = z.object({
  awardId: z.number().optional(),
  date: z.literal(''),
  name: z.literal(''),
  issuer: z.literal(''),
});

export type AwardData = z.infer<typeof awardSchema>;

/* ─── 경력사항 ─── */

export const careerSchema = z.object({
  workExperienceId: z.number().optional(),
  isRecognized: z.boolean().optional(),
  company: z.string().min(1, '경력명을 입력해주세요.'),
  startDate: z.string().min(1, '입사일을 선택해주세요.'),
  endDate: z.string().min(1, '퇴사일을 선택해주세요.'),
  type: z.string().min(1, '경력형태를 선택해주세요.'),
  position: z.string().min(1, '직급을 입력해주세요.'),
  duty: z.string().min(1, '담당업무를 입력해주세요.'),
});

const emptyCareerSchema = z.object({
  workExperienceId: z.number().optional(),
  isRecognized: z.boolean().optional(),
  company: z.literal(''),
  startDate: z.literal(''),
  endDate: z.literal(''),
  type: z.literal(''),
  position: z.literal(''),
  duty: z.literal(''),
});

export type CareerData = z.infer<typeof careerSchema>;

/* ─── 이력서 전체 (1단계) ─── */

export const resumeSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  email: z.string().min(1, '이메일을 입력해주세요.').email('올바른 이메일 형식을 입력해주세요.'),
  phone: z
    .string()
    .min(1, '전화번호를 입력해주세요.')
    .regex(/^01[0-9]-\d{3,4}-\d{4}$/, '010-1234-5678 형식으로 입력해주세요.'),
  address: z.string().min(1, '주소를 입력해주세요.'),
  birthday: z.string().min(1, '생년월일을 선택해주세요.'),
  profileImage: z.instanceof(File).optional(),
  education: z.array(z.union([educationSchema, emptyEducationSchema])),
  certifications: z.array(z.union([certificationSchema, emptyCertificationSchema])),
  awards: z.array(z.union([awardSchema, emptyAwardSchema])),
  careers: z.array(z.union([careerSchema, emptyCareerSchema])),
});

export type ResumeData = z.infer<typeof resumeSchema>;

/* ─── 자기소개서 (2단계) ─── */

export const coverLetterSchema = z.object({
  question1: z.string().max(1000, '최대 1000자까지 입력해주세요.'),
  question2: z.string().max(1000, '최대 1000자까지 입력해주세요.'),
  question3: z.string().max(500, '최대 500자까지 입력해주세요.'),
});

export type CoverLetterData = z.infer<typeof coverLetterSchema>;

/* ─── 포트폴리오 업로드 (3단계) ─── */

const optionalUrl = z.string().url('올바른 URL 형식을 입력해주세요.').or(z.literal(''));

export const portfolioSchema = z.object({
  githubUrl: optionalUrl,
  notionUrl: optionalUrl,
  otherUrl: optionalUrl,
  agreement: z.literal(true, { message: '동의가 필요합니다.' }),
});

export type PortfolioData = z.infer<typeof portfolioSchema>;
