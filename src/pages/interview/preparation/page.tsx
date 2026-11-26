import { Link, useNavigate, useParams } from 'react-router';

import { ProtectedRouteGuard } from '@/components/common/protected-route-guard';
import { useInterviewDeviceChecks } from '@/hooks/use-interview-device-checks';
import { PREPARATION_PATH, postingPath } from '@/lib/preparation-paths';
import { usePreparationStore } from '@/store/preparation-store';

import { InterviewPreparationGuide } from './guide';

function ConnectedGuide({ postingId }: { postingId: string }) {
  const navigate = useNavigate();
  const devices = useInterviewDeviceChecks();
  return (
    <InterviewPreparationGuide devices={devices} onExit={() => navigate(postingPath(postingId))} />
  );
}

function InterviewPreparationContent() {
  const { postingId = '' } = useParams();
  const exists = usePreparationStore((state) =>
    state.postings.some((posting) => posting.id === postingId),
  );
  if (!exists)
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-6 py-16">
        <h1 className="text-h2">공고를 찾을 수 없어요.</h1>
        <p className="text-body2 text-text-secondary">지원 공고 목록에서 다시 선택해주세요.</p>
        <Link to={PREPARATION_PATH} className="text-body2 underline">
          지원 공고 목록으로 돌아가기
        </Link>
      </main>
    );
  return <ConnectedGuide key={postingId} postingId={postingId} />;
}

export default function InterviewPreparationPage() {
  return (
    <ProtectedRouteGuard>
      <InterviewPreparationContent />
    </ProtectedRouteGuard>
  );
}
