import { useState } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';

import { FieldError } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { IndividualAccountData } from '@/schemas/signup';

import { isPasswordRuleSatisfied, PasswordRules } from './password-rules';

interface PasswordFieldsSectionProps {
  register: UseFormRegister<IndividualAccountData>;
  errors: FieldErrors<IndividualAccountData>;
  password: string;
}

const visibilityToggleClass =
  'text-icon-muted hover:text-text-secondary focus-visible:ring-ring absolute top-1/2 right-1 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none';

export function PasswordFieldsSection({ register, errors, password }: PasswordFieldsSectionProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const passwordErrorMessage = isPasswordRuleSatisfied(password)
    ? undefined
    : errors.password?.message;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-text-primary text-sm leading-5">
          <span>
            <span id="signup-password-label">비밀번호</span> <span aria-hidden="true">*</span>
          </span>
        </Label>
        <div className="relative">
          <Input
            id="password"
            aria-labelledby="signup-password-label"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            required
            autoComplete="new-password"
            placeholder="영문/숫자/특수문자 포함 8~64자"
            aria-invalid={Boolean(passwordErrorMessage)}
            aria-describedby={
              passwordErrorMessage ? 'password-rules password-error' : 'password-rules'
            }
            className="bg-bg-primary h-14 px-3 pr-12 text-sm leading-5"
          />
          <button
            type="button"
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            aria-controls="password"
            onClick={() => setShowPassword((current) => !current)}
            className={visibilityToggleClass}
          >
            {showPassword ? (
              <Eye aria-hidden="true" size={22} />
            ) : (
              <EyeOff aria-hidden="true" size={22} />
            )}
          </button>
        </div>
        <PasswordRules password={password} id="password-rules" />
        <FieldError id="password-error">{passwordErrorMessage}</FieldError>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="passwordConfirm" className="text-text-primary text-sm leading-5">
          <span>
            <span id="signup-password-confirm-label">비밀번호 확인</span>{' '}
            <span aria-hidden="true">*</span>
          </span>
        </Label>
        <div className="relative">
          <Input
            id="passwordConfirm"
            aria-labelledby="signup-password-confirm-label"
            type={showPasswordConfirm ? 'text' : 'password'}
            {...register('passwordConfirm')}
            required
            autoComplete="new-password"
            placeholder="비밀번호를 다시 입력해주세요."
            aria-invalid={Boolean(errors.passwordConfirm)}
            aria-describedby={errors.passwordConfirm ? 'password-confirm-error' : undefined}
            className="bg-bg-primary h-14 px-3 pr-12 text-sm leading-5"
          />
          <button
            type="button"
            aria-label={
              showPasswordConfirm ? '비밀번호 확인 필드 숨기기' : '비밀번호 확인 필드 표시'
            }
            aria-controls="passwordConfirm"
            onClick={() => setShowPasswordConfirm((current) => !current)}
            className={visibilityToggleClass}
          >
            {showPasswordConfirm ? (
              <Eye aria-hidden="true" size={22} />
            ) : (
              <EyeOff aria-hidden="true" size={22} />
            )}
          </button>
        </div>
        <FieldError id="password-confirm-error">{errors.passwordConfirm?.message}</FieldError>
      </div>
    </div>
  );
}
