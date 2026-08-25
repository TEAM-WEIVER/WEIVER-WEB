import { describe, expect, it } from 'vitest';

import { resumeSchema } from '../onboarding';

const resumeWithGpa = (gpa: string) => ({
  name: '홍길동',
  email: '',
  phone: '010-1234-5678',
  address: '서울시 강남구',
  education: [
    {
      type: '대학교(4년)',
      school: '위버대학교',
      major: '',
      gpa,
      enrollmentDate: '',
      graduationDate: '',
      status: '',
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
      expect(result.error.issues[0]?.message).toBe('0~4.5 사이의 숫자로 입력해주세요.');
    }
  });
});
