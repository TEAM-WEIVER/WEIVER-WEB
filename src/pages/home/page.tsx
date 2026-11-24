import { useState } from 'react';
import { useNavigate } from 'react-router';

import { ApplicantHeaderProfile } from '@/components/common/applicant-header-profile';
import { LogoutButton } from '@/components/common/logout-button';
import { ProtectedRouteGuard } from '@/components/common/protected-route-guard';
import { PREPARATION_PATH, MASTER_RESUME_PATH, postingPath } from '@/lib/preparation-paths';
import { getResumeProgress } from '@/pages/preparation/resume/_model/master-resume';
import { usePreparationStore } from '@/store/preparation-store';
import { getPostingDocuments } from '@/lib/preparation-documents';

import { MemberHomeView } from './home-view';

function MemberHomeContent() {
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();
  const preparation = usePreparationStore();

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
      resume={{
        status: 'ready',
        data: { status: getResumeProgress(preparation.masterResume).status },
      }}
      onEditResume={() => navigate(MASTER_RESUME_PATH)}
      points={{ status: 'unavailable' }}
      postings={{
        status: 'ready',
        data: {
          total: preparation.postings.length,
          postings: preparation.postings.slice(0, 3).map((posting) => ({
            ...posting,
            documents: getPostingDocuments(preparation, posting.id),
            interviewCount: 0,
          })),
        },
      }}
      onViewAllPostings={() => navigate(PREPARATION_PATH)}
      onRegisterPosting={() => navigate(`${PREPARATION_PATH}/new`)}
      onContinuePosting={(id) => navigate(postingPath(id))}
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
