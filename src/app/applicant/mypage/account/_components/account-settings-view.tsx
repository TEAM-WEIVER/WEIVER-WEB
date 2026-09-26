'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  changeMyPassword,
  type PasswordChangePayload,
  withdrawApplicant,
} from '@/lib/applicant-account-api';
import { clearAccessToken } from '@/lib/auth-token';
import { getApplicantsAll } from '@/lib/onboarding-api';
import { Button } from '@/components/ui/button';

import { AccountSettingsForm, type PasswordFormValues } from './account-settings-form';

const ALLOWED_PASSWORD_CHARACTERS = /^[A-Za-z\d!@#$%^&*()_+\-={}:;"'<>,.?/]+$/;

function isValidNewPassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 14 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_+\-={}:;"'<>,.?/]/.test(password) &&
    ALLOWED_PASSWORD_CHARACTERS.test(password)
  );
}

function getValidationMessage(values: PasswordFormValues) {
  if (!values.currentPassword || !values.newPassword || !values.newPasswordConfirm) {
    return '모든 비밀번호를 입력해주세요.';
  }

  if (!isValidNewPassword(values.newPassword)) {
    return '비밀번호는 8자 이상 14자 이하여야 합니다.';
  }

  if (values.newPassword !== values.newPasswordConfirm) {
    return '새 비밀번호가 일치하지 않습니다.';
  }

  return null;
}

export function AccountSettingsView() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void getApplicantsAll()
      .then((response) => {
        if (isMounted) setEmail(response.data.ApplicantDTO?.email ?? '');
      })
      .catch(() => {
        if (isMounted)
          setAlertMessage('계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (values: PasswordFormValues) => {
    if (isSubmitting) return;

    const validationMessage = getValidationMessage(values);
    if (validationMessage) {
      setAlertMessage(validationMessage);
      return;
    }

    setAlertMessage(null);
    setIsSubmitting(true);

    try {
      const payload: PasswordChangePayload = values;
      await changeMyPassword(payload);
      clearAccessToken();
      router.replace('/login');
    } catch (error) {
      setAlertMessage(
        error instanceof Error && error.message !== 'API request failed'
          ? error.message
          : '비밀번호 변경에 실패했습니다. 다시 시도해주세요.',
      );
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (isWithdrawing) return;

    setAlertMessage(null);
    setIsWithdrawing(true);

    try {
      await withdrawApplicant();
      clearAccessToken();
      router.replace('/login');
    } catch (error) {
      setAlertMessage(
        error instanceof Error && error.message !== 'API request failed'
          ? error.message
          : '회원 탈퇴에 실패했습니다. 다시 시도해주세요.',
      );
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {alertMessage ? (
        <div
          role="alert"
          aria-label="계정 설정 알림"
          className="bg-primary-900 text-body2 fixed top-6 right-6 z-50 max-w-sm rounded-lg px-5 py-4 text-white shadow-lg"
        >
          {alertMessage}
        </div>
      ) : null}

      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-text-secondary">계정 설정</h1>
        <p className="text-body1 text-text-tertiary">비밀번호를 변경할 수 있습니다.</p>
      </header>

      <section className="border-border-light bg-bg-primary mx-auto w-full max-w-[628px] rounded-[20px] border px-6 py-11 sm:px-16">
        <AccountSettingsForm email={email} isSubmitting={isSubmitting} onSubmit={handleSubmit} />

        <div className="border-border-light mt-10 border-t pt-8">
          <h2 className="text-h3 text-text-secondary">회원 탈퇴</h2>
          <p className="text-body2 text-text-tertiary mt-2">탈퇴하면 계정을 복구할 수 없습니다.</p>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            className="mt-5"
            onClick={() => setIsWithdrawalDialogOpen(true)}
          >
            회원 탈퇴
          </Button>
        </div>
      </section>

      {isWithdrawalDialogOpen ? (
        <div className="bg-primary-900/30 fixed inset-0 z-50 flex items-center justify-center p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdrawal-dialog-title"
            className="border-border-light bg-bg-primary w-full max-w-[386px] rounded-[20px] border p-6 shadow-[0px_8px_24px_0px_rgba(149,157,165,0.2)]"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h2 id="withdrawal-dialog-title" className="text-h3 text-text-secondary">
                  회원 탈퇴
                </h2>
                <p className="text-body2 text-text-tertiary">
                  탈퇴 후에는 계정을 복구할 수 없습니다. 정말 탈퇴하시겠습니까?
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isWithdrawing}
                  onClick={() => setIsWithdrawalDialogOpen(false)}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  disabled={isWithdrawing}
                  aria-busy={isWithdrawing}
                  onClick={handleWithdraw}
                >
                  {isWithdrawing ? '탈퇴 중...' : '탈퇴하기'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
