import { Mail, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ApplicantDetail } from '@/lib/applicant-profile-api';
import type { OnboardingProgress, OnboardingStep } from '@/lib/onboarding-flow';

import { ProgressIcon } from './progress-icon';

const PROFILE_STEPS: Array<{ key: OnboardingStep; label: string }> = [
  { key: 'resume', label: '이력서' },
  { key: 'cover-letter', label: '자기소개서' },
  { key: 'portfolio', label: '포트폴리오' },
];

type ProfileOverviewCardProps = {
  applicant?: ApplicantDetail;
  progress: OnboardingProgress;
  onEditProfile: () => void;
};

function ProfilePhoto({ photoUrl }: { photoUrl?: string | null }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" className="size-full rounded-[10px] object-cover" />
    );
  }

  return (
    <div
      aria-hidden
      className="size-full rounded-[10px] bg-[linear-gradient(45deg,#fcfcfc_25%,transparent_25%,transparent_75%,#fcfcfc_75%,#fcfcfc),linear-gradient(45deg,#fcfcfc_25%,#f1f5f9_25%,#f1f5f9_75%,#fcfcfc_75%,#fcfcfc)] bg-[length:14px_14px] bg-[position:0_0,7px_7px]"
    />
  );
}

function ProfileStepCard({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div
      className={`border-border-light flex h-[78px] w-full items-end justify-between rounded-lg border p-3.5 ${
        complete ? 'bg-bg-tertiary' : 'bg-bg-secondary'
      } sm:w-[137px]`}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-body1 text-text-primary whitespace-nowrap">{label}</p>
        <p className={`text-body2 ${complete ? 'text-success' : 'text-text-disabled'}`}>
          {complete ? '작성완료' : '미작성'}
        </p>
      </div>
      <ProgressIcon complete={complete} />
    </div>
  );
}

export function ProfileOverviewCard({
  applicant,
  progress,
  onEditProfile,
}: ProfileOverviewCardProps) {
  const isProfileReady = PROFILE_STEPS.every((step) => progress[step.key]);

  return (
    <section className="border-border-light bg-bg-primary flex flex-col rounded-[20px] border px-6 py-7 lg:min-h-[188px] lg:px-[34px]">
      <div className="flex w-full flex-col gap-8 min-[1440px]:flex-row min-[1440px]:items-center min-[1440px]:justify-between min-[1440px]:gap-10">
        <div className="border-border-default flex min-w-0 flex-col gap-6 min-[1440px]:w-[min(34%,520px)] min-[1440px]:border-r lg:flex-row lg:items-center">
          <div className="h-[120px] w-[90px] shrink-0">
            <ProfilePhoto photoUrl={applicant?.photoUrl} />
          </div>

          <div className="flex min-w-0 flex-col gap-4 rounded-lg py-3.5 lg:w-[336px] lg:px-3.5">
            <h1 className="text-h3 text-text-secondary truncate">
              {applicant?.name ?? '피우다'}님
            </h1>
            <div className="text-body2 text-text-tertiary flex min-w-0 flex-col gap-2">
              <p className="flex min-w-0 items-center gap-2.5">
                <Mail className="text-icon-muted size-4 shrink-0 fill-current" />
                <span className="truncate">{applicant?.email ?? 'personal@gmail.com'}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="text-icon-muted size-4 shrink-0 fill-current" />
                <span>{applicant?.phoneNumber ?? '010-0000-0000'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 min-[1208px]:w-[439px]">
          <h2 className="text-h4 text-text-primary">프로필 완성도</h2>
          <div className="flex flex-wrap gap-3.5">
            {PROFILE_STEPS.map((step) => (
              <ProfileStepCard key={step.key} complete={progress[step.key]} label={step.label} />
            ))}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-4 sm:w-[123px]">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onEditProfile}
            className="border-border-default h-[42px] w-full rounded-[10px] shadow-none"
          >
            프로필 수정
          </Button>
          <Button
            type="button"
            size="xs"
            className="h-[42px] w-full rounded-[10px]"
            disabled={!isProfileReady}
          >
            프로필 제출
          </Button>
        </div>
      </div>
    </section>
  );
}
