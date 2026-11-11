'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void hasApplicantSession().then((allowed) => {
      if (!isMounted) return;

      if (allowed) {
        setIsAllowed(true);
      } else {
        router.replace(LOGIN_PATH);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!isAllowed) return null;

  return children;
}
