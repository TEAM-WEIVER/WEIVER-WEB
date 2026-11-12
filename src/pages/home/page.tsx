import { LogoutButton } from '@/components/common/logout-button';
import { ProtectedRouteGuard } from '@/components/common/protected-route-guard';
import { Button } from '@/components/ui/button';

export default function MemberHomePage() {
  return (
    <ProtectedRouteGuard>
      <GlobalHeader
        logo={
          <Link to="/home" aria-label="위버 홈">
            <img src="/weiver.svg" alt="위버" width={72} height={18} />
          </Link>
        }
        navigation={
          <HeaderNavItem asChild active>
            <Link to="/home">홈</Link>
          </HeaderNavItem>
        }
        profile={<ApplicantHeaderProfile />}
      />
      <main className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-6 py-12">
        <h1 className="text-h2 text-text-primary">회원 홈</h1>
        <LogoutButton asChild>
          <Button type="button" variant="outline">
            로그아웃
          </Button>
        </LogoutButton>
      </main>
    </ProtectedRouteGuard>
  );
}
import { Link } from 'react-router';

import { ApplicantHeaderProfile } from '@/components/common/applicant-header-profile';
import { GlobalHeader, HeaderNavItem } from '@/components/common/global-header';
