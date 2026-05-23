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

  useEffect(() => {
    let isMounted = true;

    getApplicantProfileOverview()
      .then((nextOverview) => {
        if (isMounted) setOverview(nextOverview);
      })
      .catch(() => undefined);

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
    </div>
  );
}
