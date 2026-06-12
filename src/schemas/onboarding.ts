import { z } from 'zod';

/* ─── 학력 ─── */

export const educationSchema = z.object({
  educationId: z.number().optional(),
  type: z.string().min(1, '학력구분을 선택해주세요.'),
  school: z.string().min(1, '학교명을 입력해주세요.'),
  major: z.string().optional(),
  gpa: z.string().optional(),
  enrollmentDate: z.string().optional(),
  graduationDate: z.string().optional(),
  status: z.string().optional(),
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
  acquiredDate: z.string().optional(),
  name: z.string().min(1, '자격증명을 입력해주세요.'),
  issuer: z.string().optional(),
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
  date: z.string().optional(),
  name: z.string().min(1, '수상명을 입력해주세요.'),
  issuer: z.string().optional(),
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
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.string().optional(),
  position: z.string().optional(),
  duty: z.string().optional(),
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
  email: z.string().email('올바른 이메일 형식을 입력해주세요.').or(z.literal('')),
  phone: z.string().min(1, '전화번호를 입력해주세요.'),
  address: z.string().min(1, '주소를 입력해주세요.'),
  birthday: z.string().optional(),
  profileImage: z.instanceof(File).optional(),
  education: z.array(z.union([educationSchema, emptyEducationSchema])),
  certifications: z.array(z.union([certificationSchema, emptyCertificationSchema])),
  awards: z.array(z.union([awardSchema, emptyAwardSchema])),
  careers: z.array(z.union([careerSchema, emptyCareerSchema])),
});

export type ResumeData = z.infer<typeof resumeSchema>;

/* ─── 자기소개서 (2단계) ─── */

export const coverLetterSchema = z.object({
  question1: z.string().min(1, '내용을 입력해주세요.').max(1000, '1000자를 초과할 수 없습니다.'),
  question2: z.string().min(1, '내용을 입력해주세요.').max(1000, '1000자를 초과할 수 없습니다.'),
  question3: z.string().min(1, '내용을 입력해주세요.').max(500, '500자를 초과할 수 없습니다.'),
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
