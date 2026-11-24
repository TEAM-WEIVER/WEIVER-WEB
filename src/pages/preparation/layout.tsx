import { Link, Outlet } from 'react-router';

import { ApplicantHeaderProfile } from '@/components/common/applicant-header-profile';
import { GlobalHeader } from '@/components/common/global-header';
import { MemberFooter } from '@/components/common/member-footer';
import { MemberHeaderNavigation } from '@/components/common/member-header-navigation';
import { ProtectedRouteGuard } from '@/components/common/protected-route-guard';

export default function PreparationLayout() {
  return (
    <ProtectedRouteGuard>
      <div className="bg-bg-primary flex min-h-dvh flex-col">
        <GlobalHeader
          logo={
            <Link to="/home" aria-label="위버 홈">
              <img src="/weiver.svg" alt="위버" width={72} height={18} />
            </Link>
          }
          navigation={<MemberHeaderNavigation />}
          profile={<ApplicantHeaderProfile />}
        />
        <div className="flex-1">
          <Outlet />
        </div>
        <MemberFooter />
      </div>
    </ProtectedRouteGuard>
  );
}
