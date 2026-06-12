'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { reissueAccessToken } from '@/lib/auth-api';
import { getAccessToken, getAuthRole } from '@/lib/auth-token';
import { type ProtectedArea, getRoleRedirectPath } from '@/lib/protected-routing';

interface ProtectedRouteGuardProps {
  area: ProtectedArea;
  children: ReactNode;
}

export function ProtectedRouteGuard({ area, children }: ProtectedRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function guardRoute() {
      setIsAllowed(false);

      let role = getAuthRole();

      if (!getAccessToken() || !role) {
        try {
          await reissueAccessToken();
          role = getAuthRole();
        } catch {
          role = null;
        }
      }

      const roleRedirectPath = getRoleRedirectPath(pathname, role);
      if (roleRedirectPath) {
        router.replace(roleRedirectPath);
        return;
      }

      if (isMounted) setIsAllowed(true);
    }

    void guardRoute();

    return () => {
      isMounted = false;
    };
  }, [area, pathname, router]);

  if (!isAllowed) return null;

  return children;
}
