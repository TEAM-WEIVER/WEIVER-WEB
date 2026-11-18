import { type FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { ApiError } from '@/lib/api-client';
import { MEMBER_HOME_PATH } from '@/lib/auth-paths';
import { setAuthSession } from '@/lib/auth-token';
import { loginApplicant } from '@/lib/login-api';

type LoginError = 'credentials' | 'request';

export function useLoginForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestInProgress = useRef(false);

  const trimmedEmail = email.trim();
  const isFormValid = trimmedEmail !== '' && password.trim() !== '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFormValid || requestInProgress.current) return;

    requestInProgress.current = true;
    setIsSubmitting(true);
    setLoginError(null);

    try {
      const { data } = await loginApplicant({ email: trimmedEmail, password });

      if (data.role !== 'APPLICANT' || !data.accessToken) {
        throw new Error('Invalid applicant session');
      }

      setAuthSession(data.accessToken, data.role);
      navigate(MEMBER_HOME_PATH);
    } catch (error) {
      setLoginError(
        error instanceof ApiError && error.apiStatus === 'INVALID_PASSWORD'
          ? 'credentials'
          : 'request',
      );
    } finally {
      requestInProgress.current = false;
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
