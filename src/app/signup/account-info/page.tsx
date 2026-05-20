'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CircleCheck, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTimer } from '@/hooks/use-timer';
import {
  initApplicantSignup,
  sendApplicantVerificationEmail,
  verifyApplicantEmail,
} from '@/lib/signup-api';
import { getNextStep, getStepNumber } from '@/lib/signup-flow';
import { individualAccountSchema, type IndividualAccountData } from '@/schemas/signup';
import { useSignupStore } from '@/store/signup-store';

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
  const [verificationToken, setVerificationToken] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const timer = useTimer(300);

  const isEmailVerified = email !== '' && verifiedEmail === email;
  const isCodeSent = email !== '' && sentEmail === email;

  const sendVerification = async () => {
    if (!email || isSending) return;

    setIsSending(true);
    setSendError(null);
    setVerifyError(null);

    try {
      await sendApplicantVerificationEmail(email);
      setSentEmail(email);
      setVerifiedEmail(null);
      setVerificationToken('');
      setVerificationCode('');
      timer.start();
    } catch {
      setSendError('인증번호 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode.length !== 6 || !timer.isRunning || isVerifying) return;

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const response = await verifyApplicantEmail({ email, code: verificationCode });
      setVerificationToken(response.data.verificationToken);
      setVerifiedEmail(email);
      timer.reset();
    } catch {
      setVerifyError('인증번호 확인에 실패했습니다. 다시 확인해주세요.');
    } finally {
      setIsVerifying(false);
    }
  };

  const updateVerificationCode = (value: string) => {
    setVerificationCode(value.replace(/\D/g, ''));
  };

  return {
    isEmailVerified,
    isSending,
    isVerifying,
    sendError,
    verifyError,
    verificationToken,
    verificationCode,
    isCodeSent,
    timer,
    sendVerification,
    verifyCode,
    updateVerificationCode,
  };
}

export default function SignupAccountInfoPage() {
  const router = useRouter();
  const savedAccount = useSignupStore((state) => state.account);
  const setAccount = useSignupStore((state) => state.setAccount);

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<IndividualAccountData>({
    resolver: zodResolver(individualAccountSchema),
    defaultValues: {
      email: savedAccount.email,
      password: '',
      passwordConfirm: '',
    },
    mode: 'onChange',
  });

  const watchedEmail = useWatch({ control, name: 'email' }) ?? '';
  const watchedPassword = useWatch({ control, name: 'password' }) ?? '';
  const verification = useEmailVerification(watchedEmail);

  const stepNumber = getStepNumber('account-info');
  const nextStep = getNextStep('account-info');
  const canSubmit = isValid && verification.isEmailVerified;

  const onSubmit = async (data: IndividualAccountData) => {
    if (!verification.isEmailVerified) return;

    setSubmitError(null);

    try {
      const response = await initApplicantSignup({
        email: data.email,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
        verificationToken: verification.verificationToken,
      });

      setAccount({ email: data.email, signupToken: response.data.signupToken });
      if (nextStep) router.push(`/signup/${nextStep}`);
    } catch {
      setSubmitError('회원가입 계정 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
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
            <FormField label="이메일을 입력해주세요." error={errors.email?.message}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  {...register('email')}
                  placeholder="personal@gmail.com"
                  disabled={verification.isEmailVerified}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => void verification.sendVerification()}
                  disabled={verification.isEmailVerified || !watchedEmail || verification.isSending}
                  className="w-full rounded-lg sm:w-24"
                >
                  {verification.isSending ? '전송 중' : '인증하기'}
                </Button>
              </div>
            </FormField>
            {verification.sendError ? (
              <p className="text-caption text-error">{verification.sendError}</p>
            ) : null}

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
                      onClick={() => void verification.verifyCode()}
                      disabled={
                        verification.verificationCode.length !== 6 ||
                        !verification.timer.isRunning ||
                        verification.isVerifying
                      }
                      className="w-full rounded-lg sm:w-24"
                    >
                      {verification.isVerifying ? '확인 중' : '확인'}
                    </Button>
                  ) : null}
                </div>
                {verification.verifyError ? (
                  <p className="text-caption text-error">{verification.verifyError}</p>
                ) : null}
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
              <FieldError>{errors.passwordConfirm?.message}</FieldError>
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" size="md" disabled={!canSubmit || isSubmitting} className="w-full">
        {isSubmitting ? '처리 중' : '다음 단계'}
        <ArrowRight size={20} />
      </Button>
      {submitError ? <p className="text-caption text-error text-right">{submitError}</p> : null}
    </form>
  );
}
