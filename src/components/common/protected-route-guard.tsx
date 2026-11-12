'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { reissueAccessToken } from '@/lib/auth-api';
import { getAccessToken, getAuthRole } from '@/lib/auth-token';
import { LOGIN_PATH } from '@/lib/auth-paths';
import { Spinner } from '@/components/ui/spinner';

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

  if (!isAllowed)
    return (
      <div className="text-text-secondary flex min-h-48 items-center justify-center gap-3">
        <Spinner aria-label="로그인 상태 확인 중" />
        <span>로그인 상태를 확인하고 있습니다.</span>
      </div>
    );

  return children;
}
