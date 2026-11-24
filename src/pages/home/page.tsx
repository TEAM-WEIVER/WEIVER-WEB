import { useState } from 'react';

import { ApplicantHeaderProfile } from '@/components/common/applicant-header-profile';
import { LogoutButton } from '@/components/common/logout-button';
import { ProtectedRouteGuard } from '@/components/common/protected-route-guard';

import { MemberHomeView } from './home-view';

function MemberHomeContent() {
  const [fullName, setFullName] = useState('');

  return (
    <MemberHomeView
      fullName={fullName}
      profile={
        <div className="flex items-center gap-2">
          <ApplicantHeaderProfile onNameLoaded={setFullName} />
          <LogoutButton
            showLabel={false}
            className="text-text-tertiary hover:text-text-primary focus-visible:outline-primary-600 rounded-md p-2 focus-visible:outline-2"
            iconSize={18}
          />
        </div>
      }
      resume={{ status: 'unavailable' }}
      points={{ status: 'unavailable' }}
      postings={{ status: 'unavailable' }}
    />
  );
}

export default function MemberHomePage() {
  return (
    <ProtectedRouteGuard>
      <MemberHomeContent />
    </ProtectedRouteGuard>
  );
}
