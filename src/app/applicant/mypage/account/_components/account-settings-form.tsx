'use client';

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

interface AccountSettingsFormProps {
  email: string;
  isSubmitting: boolean;
  onSubmit: (values: PasswordFormValues) => void;
}

function PasswordInput({
  label,
  name,
  value,
  autoComplete,
  onChange,
}: {
  label: string;
  name: keyof PasswordFormValues;
  value: string;
  autoComplete: string;
  onChange: (name: keyof PasswordFormValues, value: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const inputId = `account-${name}`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-body1 text-text-primary">
        {label}
      </label>
      <div className="relative">
        <Input
          id={inputId}
          name={name}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          autoComplete={autoComplete}
          className="pr-14"
        />
        <button
          type="button"
          aria-label={isVisible ? `${label} 숨기기` : `${label} 보기`}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
          className="text-text-disabled hover:text-text-tertiary absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer transition-colors"
        >
          {isVisible ? <EyeOff size={22} /> : <Eye size={22} />}
        </button>
      </div>
    </div>
  );
}

export function AccountSettingsForm({ email, isSubmitting, onSubmit }: AccountSettingsFormProps) {
  const [values, setValues] = useState<PasswordFormValues>({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  const handleChange = (name: keyof PasswordFormValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-[34px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="account-email" className="text-body1 text-text-primary">
            이메일
          </label>
          <Input id="account-email" type="email" value={email} disabled aria-label="이메일" />
        </div>

        <PasswordInput
          label="현재 비밀번호"
          name="currentPassword"
          value={values.currentPassword}
          autoComplete="current-password"
          onChange={handleChange}
        />

        <div className="flex flex-col gap-3.5">
          <PasswordInput
            label="새 비밀번호"
            name="newPassword"
            value={values.newPassword}
            autoComplete="new-password"
            onChange={handleChange}
          />
          <div className="flex flex-col gap-1.5" aria-label="새 비밀번호 규칙">
            <p className="text-caption text-text-primary">
              최소 1자 이상 영문, 숫자, 특수문자가 들어가야 합니다.
            </p>
            <p className="text-caption text-text-primary">8자 이상 14자 이하여야 합니다.</p>
          </div>
        </div>

        <PasswordInput
          label="새 비밀번호 확인"
          name="newPasswordConfirm"
          value={values.newPasswordConfirm}
          autoComplete="new-password"
          onChange={handleChange}
        />
      </div>

      <Button type="submit" size="md" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? '비밀번호 변경 중...' : '비밀번호 변경 완료'}
      </Button>
    </form>
  );
}
