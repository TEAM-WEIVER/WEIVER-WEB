import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { MEMBER_HOME_PATH } from '@/lib/auth-paths';
import { setAuthSession } from '@/lib/auth-token';
import { loginApplicant } from '@/lib/login-api';

export function useLoginForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedEmail = email.trim();
  const isFormValid = trimmedEmail !== '' && password.trim() !== '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setLoginError(null);

    try {
      const { data } = await loginApplicant({ email: trimmedEmail, password });

      if (data.role !== 'APPLICANT' || !data.accessToken) {
        throw new Error('Invalid applicant session');
      }

      setAuthSession(data.accessToken, data.role);
      navigate(MEMBER_HOME_PATH);
    } catch {
      setLoginError('로그인에 실패했습니다. 이메일과 비밀번호를 다시 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    showPassword,
    email,
    password,
    loginError,
    isSubmitting,
    isFormValid,
    setEmail,
    setPassword,
    setShowPassword,
    handleSubmit,
  };
}

export type UseLoginFormReturn = ReturnType<typeof useLoginForm>;
