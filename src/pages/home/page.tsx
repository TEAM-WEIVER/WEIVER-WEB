import { useState } from 'react';
import { useNavigate } from 'react-router';

import { ApplicantHeaderProfile } from '@/components/common/applicant-header-profile';
import { ProtectedRouteGuard } from '@/components/common/protected-route-guard';
import { useApiResource } from '@/hooks/use-api-resource';
import { loadHomePoints, loadHomePostings, loadResumeSummary } from '@/lib/home-api';
import { PREPARATION_PATH, MASTER_RESUME_PATH, postingPath } from '@/lib/preparation-paths';

import { MemberHomeView } from './home-view';

function MemberHomeContent() {
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();
  const resume = useApiResource(loadResumeSummary);
  const points = useApiResource(loadHomePoints);
  const postings = useApiResource(loadHomePostings);

  return (
    <MemberHomeView
      fullName={fullName}
      profile={<ApplicantHeaderProfile onNameLoaded={setFullName} />}
      resume={resume.state}
      points={points.state}
      postings={postings.state}
      onRetryResume={resume.retry}
      onRetryPoints={points.retry}
      onRetryPostings={postings.retry}
      onEditResume={() => navigate(MASTER_RESUME_PATH)}
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
