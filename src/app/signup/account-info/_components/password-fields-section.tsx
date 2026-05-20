import { useState } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';

import { FieldError } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { IndividualAccountData } from '@/schemas/signup';

import { PasswordRules } from './password-rules';

interface PasswordFieldsSectionProps {
  register: UseFormRegister<IndividualAccountData>;
  errors: FieldErrors<IndividualAccountData>;
  password: string;
}

export function PasswordFieldsSection({ register, errors, password }: PasswordFieldsSectionProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <Label className="text-text-primary">비밀번호를 입력해주세요.</Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="영문, 숫자, 특수문자 조합 6-14자"
              className="pr-14"
            />
            <button
              type="button"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
              className="text-text-disabled hover:text-text-tertiary absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer transition-colors"
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
        </div>
        <PasswordRules password={password} />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-text-primary">비밀번호를 확인해주세요.</Label>
        <div className="relative">
          <Input
            type={showPasswordConfirm ? 'text' : 'password'}
            {...register('passwordConfirm')}
            placeholder="위에서 입력한 비밀번호를 입력해주세요."
            className="pr-14"
          />
          <button
            type="button"
            aria-label={showPasswordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
            aria-pressed={showPasswordConfirm}
            onClick={() => setShowPasswordConfirm((current) => !current)}
            className="text-text-disabled hover:text-text-tertiary absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer transition-colors"
          >
            {showPasswordConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>
        <FieldError>{errors.passwordConfirm?.message}</FieldError>
      </div>
    </div>
  );
}
