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
          <p className="text-caption text-text-tertiary mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-15">
            입력한 공고와 이력서는 현재 탭에 임시 보관되며 서버에는 저장되지 않아요.
          </p>
          <Outlet />
        </div>
        <MemberFooter />
      </div>
    </ProtectedRouteGuard>
  );
}
