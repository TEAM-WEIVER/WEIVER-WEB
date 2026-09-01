import { describe, expect, it } from 'vitest';

import { resumeSchema } from '../onboarding';

const resumeWithGpa = (gpa: string) => ({
  name: '홍길동',
  email: 'hong@example.com',
  phone: '010-1234-5678',
  address: '서울시 강남구',
  birthday: '2000-01-01',
  education: [
    {
      type: '대학교(4년)',
      school: '위버대학교',
      major: '컴퓨터공학과',
      gpa,
      enrollmentDate: '2020-03',
      graduationDate: '2024-02',
      status: '졸업',
    },
  ],
  certifications: [],
  awards: [],
  careers: [],
});

describe('onboarding schemas', () => {
  it.each(['3.8', '3.75', '4.5', '4.50'])('allows a 4.5-scale GPA: %s', (gpa) => {
    expect(resumeSchema.safeParse(resumeWithGpa(gpa)).success).toBe(true);
  });

  it.each(['3.8/4.5', '4.51', '3.755', '학점 3.8'])('rejects invalid GPA: %s', (gpa) => {
    const result = resumeSchema.safeParse(resumeWithGpa(gpa));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('학점'))).toBe(true);
    }
  });
});
