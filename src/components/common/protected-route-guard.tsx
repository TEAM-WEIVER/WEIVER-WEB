'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { reissueAccessToken } from '@/lib/auth-api';
import { getAccessToken, getAuthRole } from '@/lib/auth-token';
import { LOGIN_PATH } from '@/lib/auth-paths';

async function hasApplicantSession() {
  if (getAuthRole() !== 'APPLICANT') return false;

  if (!getAccessToken()) {
    try {
      await reissueAccessToken();
    } catch {
      return false;
    }
  }

  return getAuthRole() === 'APPLICANT' && Boolean(getAccessToken());
}

export function ProtectedRouteGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void hasApplicantSession().then((allowed) => {
      if (!isMounted) return;

      if (allowed) {
        setIsAllowed(true);
      } else {
        navigate(LOGIN_PATH, { replace: true });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (!isAllowed) return null;

  return children;
}
