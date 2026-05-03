'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CircleCheck, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTimer } from '@/hooks/use-timer';
import { getNextStep, getStepNumber } from '@/lib/signup-flow';
import {
  corporateAccountSchema,
  individualAccountSchema,
  type CorporateAccountData,
  type IndividualAccountData,
} from '@/schemas/signup';
import { useSignupStore, type SignupType } from '@/store/signup-store';

type AccountFormData = CorporateAccountData | IndividualAccountData;

interface AccountFormConfig {
  schema: typeof corporateAccountSchema | typeof individualAccountSchema;
  emailLabel: string;
  emailPlaceholder: string;
  submitLabel: string;
  showCompanyName: boolean;
}

const ACCOUNT_FORM_CONFIG: Record<SignupType, AccountFormConfig> = {
  corporate: {
    schema: corporateAccountSchema,
    emailLabel: '기업 이메일을 입력해주세요.',
    emailPlaceholder: 'work@company.co.kr',
    submitLabel: '기업 정보 입력하기',
    showCompanyName: true,
  },
  individual: {
    schema: individualAccountSchema,
    emailLabel: '이메일을 입력해주세요.',
    emailPlaceholder: 'personal@gmail.com',
    submitLabel: '다음 단계',
    showCompanyName: false,
  },
};

function PasswordRules({ password }: { password: string }) {
  const hasCharTypes =
    /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password);
  const hasValidLength = password.length >= 6 && password.length <= 14;

  return (
    <div className="flex flex-col gap-1.5">
      <PasswordRuleItem
        passed={hasCharTypes}
        label="최소 1자 이상 영문, 숫자, 특수문자가 들어가야 합니다."
      />
      <PasswordRuleItem passed={hasValidLength} label="6자 이상 14자 이하여야 합니다." />
    </div>
  );
}

function PasswordRuleItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <CircleCheck size={18} className={passed ? 'text-error' : 'text-text-disabled'} />
      <span className="text-caption text-text-primary">{label}</span>
    </div>
  );
}

function useEmailVerification(email: string) {
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const timer = useTimer(300);

  const isEmailVerified = email !== '' && verifiedEmail === email;
  const isCodeSent = email !== '' && sentEmail === email;

  const sendVerification = () => {
    // TODO: 실제 이메일 인증 API 연동
    setSentEmail(email);
    setVerifiedEmail(null);
    setVerificationCode('');
    timer.start();
  };

  const verifyCode = () => {
    // TODO: 실제 인증 코드 검증 API 연동
    if (verificationCode.length !== 6 || !timer.isRunning) return;
    setVerifiedEmail(email);
    timer.reset();
  };

  const updateVerificationCode = (value: string) => {
    setVerificationCode(value.replace(/\D/g, ''));
  };

  return {
    isEmailVerified,
    verificationCode,
    isCodeSent,
    timer,
    sendVerification,
    verifyCode,
    updateVerificationCode,
  };
}

export default function AccountPage() {
  const params = useParams<{ type: SignupType }>();
  const router = useRouter();
  const type = params.type;
  const config = ACCOUNT_FORM_CONFIG[type];
  const savedAccount = useSignupStore((state) => state.account);
  const setAccount = useSignupStore((state) => state.setAccount);

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<AccountFormData>({
    resolver: zodResolver(config.schema),
    defaultValues: {
      email: savedAccount.email,
      password: '',
      passwordConfirm: '',
      companyName: savedAccount.companyName ?? '',
    },
    mode: 'onChange',
  });

  const watchedEmail = useWatch({ control, name: 'email' }) ?? '';
  const watchedPassword = useWatch({ control, name: 'password' }) ?? '';
  const verification = useEmailVerification(watchedEmail);

  const stepNumber = getStepNumber(type, 'account');
  const nextStep = getNextStep(type, 'account');
  const canSubmit = isValid && verification.isEmailVerified;

  const onSubmit = (data: AccountFormData) => {
    if (!verification.isEmailVerified) return;

    const { email } = data;
    const companyName = 'companyName' in data ? data.companyName : undefined;
    setAccount({ email, companyName });

    if (nextStep) router.push(`/signup/${type}/${nextStep}`);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-[500px] flex-col gap-[34px]"
    >
      <div className="flex flex-col gap-[34px]">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-text-secondary">계정을 생성하세요</h1>
          <p className="text-body2 text-text-tertiary">
            {stepNumber}단계 : 계정 정보를 입력해주세요.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3.5">
            <FormField label={config.emailLabel} error={errors.email?.message}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  {...register('email')}
                  placeholder={config.emailPlaceholder}
                  disabled={verification.isEmailVerified}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={verification.sendVerification}
                  disabled={verification.isEmailVerified || !watchedEmail}
                  className="w-full rounded-lg sm:w-24"
                >
                  인증하기
                </Button>
              </div>
            </FormField>

            {verification.isCodeSent ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-end justify-between gap-4">
                  <Label className="text-text-primary">인증 코드를 입력해주세요.</Label>
                  {verification.timer.isRunning ? (
                    <span className="text-caption text-error">
                      {verification.timer.formatted} 제한시간
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verification.verificationCode}
                    onChange={(event) => verification.updateVerificationCode(event.target.value)}
                    placeholder="숫자 6자리"
                    disabled={verification.isEmailVerified}
                    className="flex-1"
                  />
                  {!verification.isEmailVerified ? (
                    <Button
                      type="button"
                      onClick={verification.verifyCode}
                      disabled={
                        verification.verificationCode.length !== 6 || !verification.timer.isRunning
                      }
                      className="w-full rounded-lg sm:w-24"
                    >
                      확인
                    </Button>
                  ) : null}
                </div>
                {verification.isEmailVerified ? (
                  <p className="text-caption text-success">이메일이 인증되었습니다.</p>
                ) : null}
                {!verification.timer.isRunning &&
                !verification.isEmailVerified &&
                verification.isCodeSent &&
                verification.timer.seconds === 0 ? (
                  <p className="text-caption text-error">
                    인증 시간이 만료되었습니다. 다시 인증해주세요.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

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
              <PasswordRules password={watchedPassword} />
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
              {'passwordConfirm' in errors ? (
                <FieldError>{errors.passwordConfirm?.message}</FieldError>
              ) : null}
            </div>
          </div>

          {config.showCompanyName ? (
            <div className="flex flex-col gap-2">
              <Label className="text-text-primary">회사명을 입력해주세요.</Label>
              <Input
                type="text"
                {...register('companyName')}
                placeholder="회사명을 정확하게 입력해주세요."
              />
              {'companyName' in errors ? (
                <FieldError>{errors.companyName?.message}</FieldError>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <Button type="submit" size="md" disabled={!canSubmit} className="w-full">
        {config.submitLabel}
        <ArrowRight size={20} />
      </Button>
    </form>
  );
}
