import { z } from 'zod';

export const passwordResetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .max(64, '비밀번호는 64자 이하여야 합니다.')
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}:;"'<>,.?/]).+$/,
        '영문, 숫자, 특수문자를 각각 1자 이상 입력해주세요.',
      ),
    newPasswordConfirm: z.string().min(1, '새 비밀번호를 다시 입력해주세요.'),
  })
  .refine(({ newPassword, newPasswordConfirm }) => newPassword === newPasswordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['newPasswordConfirm'],
  });

export type PasswordResetData = z.infer<typeof passwordResetSchema>;
