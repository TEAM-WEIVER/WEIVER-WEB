'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  type ApplicantProfileOverview,
  getApplicantProfileOverview,
} from '@/lib/applicant-profile-api';
import { getProfileEditPath, type OnboardingProgress } from '@/lib/onboarding-flow';

import { HiringProcessCard } from './_components/hiring-process-card';
import { InterviewCallout } from './_components/interview-callout';
import { ProfileOverviewCard } from './_components/profile-overview-card';
import { ReapplyNotice } from './_components/reapply-notice';

const EMPTY_PROGRESS: OnboardingProgress = {
  resume: false,
  'cover-letter': false,
  portfolio: false,
};

export default function ApplicantDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<ApplicantProfileOverview | null>(null);
  const [hasOverviewError, setHasOverviewError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getApplicantProfileOverview()
      .then((nextOverview) => {
        if (isMounted) {
          setOverview(nextOverview);
          setHasOverviewError(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOverview(null);
          setHasOverviewError(true);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const progress = overview?.progress ?? EMPTY_PROGRESS;

  const handleProfileEdit = () => {
    router.push(getProfileEditPath(progress));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {hasOverviewError && (
        // TODO: 실패 창이나 모달 추후에 하나 만들긴 해야 할 듯
        <p className="text-body2 text-text-tertiary">
          프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {isLoading ? (
        // TODO: 로딩 창이나 모달 추후에 하나 만들긴 해야 할 듯
        <p>로딩 중...</p>
      ) : (
        <>
          <ProfileOverviewCard
            applicant={overview?.applicant}
            progress={progress}
            onEditProfile={handleProfileEdit}
          />

          <div className="grid gap-[23px] min-[1440px]:grid-cols-[798px_387px]">
            <HiringProcessCard />
            <InterviewCallout />
          </div>

          <ReapplyNotice />
        </>
      )}
    </div>
  );
}
