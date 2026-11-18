import { type FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { ApiError } from '@/lib/api-client';
import { MEMBER_HOME_PATH } from '@/lib/auth-paths';
import { setAuthSession } from '@/lib/auth-token';
import { loginApplicant } from '@/lib/login-api';

type LoginError = 'credentials' | 'request';
const REMEMBERED_EMAIL_KEY = 'weiver.auth.remembered-email';

function readRememberedEmail() {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveRememberedEmail(email: string | null) {
  try {
    if (email === null) {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } else {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    }
  } catch {
    // Login also works when browser storage is unavailable.
  }
}

export function useLoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(readRememberedEmail);
  const [rememberEmail, setRememberEmail] = useState(Boolean(email));
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestInProgress = useRef(false);

  const updateRememberEmail = (checked: boolean) => {
    setRememberEmail(checked);
    if (!checked) saveRememberedEmail(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim() || requestInProgress.current) return;

    requestInProgress.current = true;
    setIsSubmitting(true);
    setLoginError(null);

    try {
      const { data } = await loginApplicant({ email: trimmedEmail, password });

      if (data.role !== 'APPLICANT' || !data.accessToken) {
        throw new Error('Invalid applicant session');
      }

      setAuthSession(data.accessToken, data.role);
      if (rememberEmail) saveRememberedEmail(trimmedEmail);
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
    email,
    password,
    rememberEmail,
    loginError,
    isSubmitting,
    setEmail,
    setPassword,
    setRememberEmail: updateRememberEmail,
    handleSubmit,
  };
}

export type UseLoginFormReturn = ReturnType<typeof useLoginForm>;
