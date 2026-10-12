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

  it('allows a profile image up to 1MB', () => {
    const profileImage = new File(['profile'], 'profile.png', { type: 'image/png' });
    Object.defineProperty(profileImage, 'size', { value: 1024 * 1024 });

    expect(resumeSchema.safeParse({ ...resumeWithGpa('3.8'), profileImage }).success).toBe(true);
  });

  it('rejects a profile image larger than 1MB', () => {
    const profileImage = new File(['profile'], 'profile.png', { type: 'image/png' });
    Object.defineProperty(profileImage, 'size', { value: 1024 * 1024 + 1 });

    const result = resumeSchema.safeParse({ ...resumeWithGpa('3.8'), profileImage });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['profileImage']);
      expect(result.error.issues[0]?.message).toBe('증명사진은 1MB 이하로 업로드해주세요.');
    }
  });
});
