'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowRight, CircleCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignupStore } from '@/store/signup-store';
import { useTimer } from '@/hooks/use-timer';
import { getNextStep, getStepNumber } from '@/lib/signup-flow';
import type { SignupType } from '@/store/signup-store';
import {
  corporateAccountSchema,
  individualAccountSchema,
  type CorporateAccountData,
  type IndividualAccountData,
} from '@/schemas/signup';

/* ─── 비밀번호 규칙 표시 ─── */

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

/* ─── 기업 회원 폼 ─── */

function CorporateAccountForm() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const { account: savedAccount, setAccount } = useSignupStore();

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const timer = useTimer(300);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<CorporateAccountData>({
    resolver: zodResolver(corporateAccountSchema),
    defaultValues: {
      email: savedAccount.email,
      password: savedAccount.password,
      passwordConfirm: savedAccount.passwordConfirm,
      companyName: savedAccount.companyName ?? '',
    },
    mode: 'onChange',
  });

  const watchedValues = watch();
  const watchedPassword = watchedValues.password ?? '';
  const canSubmit = isValid && isEmailVerified;

  const handleSendVerification = () => {
    // TODO: 실제 이메일 인증 API 연동
    setIsCodeSent(true);
    timer.start();
  };

  const handleVerifyCode = () => {
    // TODO: 실제 인증 코드 검증 API 연동
    if (verificationCode.length === 6) {
      setIsEmailVerified(true);
    }
  };

  const type = params.type as SignupType;
  const stepNumber = getStepNumber(type, 'account');
  const nextStep = getNextStep(type, 'account');

  const onSubmit = (data: CorporateAccountData) => {
    if (!isEmailVerified) return;
    setAccount(data);
    if (nextStep) router.push(`/signup/${type}/${nextStep}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-[500px] flex-col gap-[34px]">
      <div className="flex flex-col gap-[34px]">
        {/* 타이틀 */}
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-text-secondary">계정을 생성하세요</h1>
          <p className="text-body2 text-text-tertiary">
            {stepNumber}단계 : 계정 정보를 입력해주세요.
          </p>
        </div>

        {/* 폼 필드 */}
        <div className="flex flex-col gap-6">
          {/* 이메일 인증 그룹 */}
          <div className="flex flex-col gap-3.5">
            {/* 이메일 */}
            <FormField label="기업 이메일을 입력해주세요." error={errors.email?.message}>
              <div className="flex gap-2">
                <Input
                  type="email"
                  {...register('email')}
                  placeholder="work@company.co.kr"
                  disabled={isEmailVerified}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isEmailVerified}
                  className="w-24 shrink-0 rounded-lg"
                >
                  인증하기
                </Button>
              </div>
            </FormField>

            {/* 인증 코드 */}
            {isCodeSent && (
              <div className="flex flex-col gap-2">
                <div className="flex items-end justify-between">
                  <Label className="text-text-primary">인증 코드를 입력해주세요.</Label>
                  {timer.isRunning && (
                    <span className="text-caption text-error">{timer.formatted} 제한시간</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="숫자 6자리"
                    disabled={isEmailVerified}
                    className="flex-1"
                  />
                  {!isEmailVerified && (
                    <Button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verificationCode.length !== 6 || !timer.isRunning}
                      className="w-24 shrink-0 rounded-lg"
                    >
                      확인
                    </Button>
                  )}
                </div>
                {isEmailVerified && (
                  <p className="text-caption text-success">이메일이 인증되었습니다.</p>
                )}
                {!timer.isRunning && !isEmailVerified && isCodeSent && timer.seconds === 0 && (
                  <p className="text-caption text-error">
                    인증 시간이 만료되었습니다. 다시 인증해주세요.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 비밀번호 그룹 */}
          <div className="flex flex-col gap-3.5">
            {/* 비밀번호 + 규칙 */}
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
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-text-disabled hover:text-text-tertiary absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>
              <PasswordRules password={watchedPassword} />
            </div>

            {/* 비밀번호 확인 */}
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
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="text-text-disabled hover:text-text-tertiary absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer transition-colors"
                >
                  {showPasswordConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
              {errors.passwordConfirm && <FieldError>{errors.passwordConfirm.message}</FieldError>}
            </div>
          </div>

          {/* 회사명 */}
          <div className="flex flex-col gap-2">
            <Label className="text-text-primary">회사명을 입력해주세요.</Label>
            <Input
              type="text"
              {...register('companyName')}
              placeholder="회사명을 정확하게 입력해주세요."
            />
            {errors.companyName && <FieldError>{errors.companyName.message}</FieldError>}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <Button type="submit" size="md" disabled={!canSubmit}>
        기업 정보 입력하기
        <ArrowRight size={20} />
      </Button>
    </form>
  );
}

/* ─── 개인 회원 폼 ─── */

function IndividualAccountForm() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const { account: savedAccount, setAccount } = useSignupStore();

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const timer = useTimer(300);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<IndividualAccountData>({
    resolver: zodResolver(individualAccountSchema),
    defaultValues: {
      email: savedAccount.email,
      password: savedAccount.password,
      passwordConfirm: savedAccount.passwordConfirm,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();
  const watchedPassword = watchedValues.password ?? '';
  const canSubmit = isValid && isEmailVerified;

  const handleSendVerification = () => {
    // TODO: 실제 이메일 인증 API 연동
    setIsCodeSent(true);
    timer.start();
  };

  const handleVerifyCode = () => {
    // TODO: 실제 인증 코드 검증 API 연동
    if (verificationCode.length === 6) {
      setIsEmailVerified(true);
    }
  };

  const type = params.type as SignupType;
  const stepNumber = getStepNumber(type, 'account');
  const nextStep = getNextStep(type, 'account');

  const onSubmit = (data: IndividualAccountData) => {
    if (!isEmailVerified) return;
    setAccount(data);
    if (nextStep) router.push(`/signup/${type}/${nextStep}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-[500px] flex-col gap-[34px]">
      <div className="flex flex-col gap-[34px]">
        {/* 타이틀 */}
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-text-secondary">계정을 생성하세요</h1>
          <p className="text-body2 text-text-tertiary">
            {stepNumber}단계 : 계정 정보를 입력해주세요.
          </p>
        </div>

        {/* 폼 필드 */}
        <div className="flex flex-col gap-6">
          {/* 이메일 인증 그룹 */}
          <div className="flex flex-col gap-3.5">
            {/* 이메일 */}
            <FormField label="이메일을 입력해주세요." error={errors.email?.message}>
              <div className="flex gap-2">
                <Input
                  type="email"
                  {...register('email')}
                  placeholder="personal@gmail.com"
                  disabled={isEmailVerified}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isEmailVerified}
                  className="w-24 shrink-0 rounded-lg"
                >
                  인증하기
                </Button>
              </div>
            </FormField>

            {/* 인증 코드 */}
            {isCodeSent && (
              <div className="flex flex-col gap-2">
                <div className="flex items-end justify-between">
                  <Label className="text-text-primary">인증 코드를 입력해주세요.</Label>
                  {timer.isRunning && (
                    <span className="text-caption text-error">{timer.formatted} 제한시간</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="숫자 6자리"
                    disabled={isEmailVerified}
                    className="flex-1"
                  />
                  {!isEmailVerified && (
                    <Button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verificationCode.length !== 6 || !timer.isRunning}
                      className="w-24 shrink-0 rounded-lg"
                    >
                      확인
                    </Button>
                  )}
                </div>
                {isEmailVerified && (
                  <p className="text-caption text-success">이메일이 인증되었습니다.</p>
                )}
                {!timer.isRunning && !isEmailVerified && isCodeSent && timer.seconds === 0 && (
                  <p className="text-caption text-error">
                    인증 시간이 만료되었습니다. 다시 인증해주세요.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 비밀번호 그룹 */}
          <div className="flex flex-col gap-3.5">
            {/* 비밀번호 + 규칙 */}
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
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-text-disabled hover:text-text-tertiary absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>
              <PasswordRules password={watchedPassword} />
            </div>

            {/* 비밀번호 확인 */}
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
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="text-text-disabled hover:text-text-tertiary absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer transition-colors"
                >
                  {showPasswordConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
              {errors.passwordConfirm && <FieldError>{errors.passwordConfirm.message}</FieldError>}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <Button type="submit" size="md" disabled={!canSubmit}>
        다음 단계
        <ArrowRight size={20} />
      </Button>
    </form>
  );
}

/* ─── 라우터 ─── */

export default function AccountPage() {
  const params = useParams<{ type: string }>();
  const isCorporate = params.type === 'corporate';

  return isCorporate ? <CorporateAccountForm /> : <IndividualAccountForm />;
}
