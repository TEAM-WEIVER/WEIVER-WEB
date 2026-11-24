import { Link, Outlet } from 'react-router';

import { GlobalHeader } from '@/components/common/global-header';
import { MemberHeaderNavigation } from '@/components/common/member-header-navigation';
import { MemberFooter } from '@/components/common/member-footer';

export default function ServiceLayout() {
  return (
    <div className="bg-bg-primary flex min-h-dvh flex-col">
      <GlobalHeader
        logo={
          <Link to="/home" aria-label="위버 홈">
            <img src="/weiver.svg" alt="위버" width={72} height={18} />
          </Link>
        }
        navigation={<MemberHeaderNavigation />}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <Outlet />
      </main>
      <MemberFooter />
    </div>
  );
}
