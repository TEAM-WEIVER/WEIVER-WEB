import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { GlobalHeader } from '@/components/common/global-header';
import { HeaderProfileButton } from '@/components/common/header-profile-button';
import { MemberFooter, type MemberFooterLink } from '@/components/common/member-footer';
import { MemberHeaderNavigation } from '@/components/common/member-header-navigation';

import { MasterResumeSummary } from './_components/master-resume-summary';
import { HeaderPoints, PointsSummary } from './_components/points-summary';
import { PreparingPostings } from './_components/preparing-postings';
import type { HomePoints, HomePostings, HomeSectionState, ResumeSummary } from './_types/home';

export type MemberHomeViewProps = {
  fullName?: string;
  profile?: ReactNode;
  resume: HomeSectionState<ResumeSummary>;
  points: HomeSectionState<HomePoints>;
  postings: HomeSectionState<HomePostings>;
  footerLinks?: readonly MemberFooterLink[];
  onEditResume?: () => void;
  onRetryResume?: () => void;
  onOpenPointHistory?: () => void;
  onChargePoints?: () => void;
  onRetryPoints?: () => void;
  onViewAllPostings?: () => void;
  onContinuePosting?: (id: string) => void;
  onRegisterPosting?: () => void;
  onRetryPostings?: () => void;
};

export function MemberHomeView({
  fullName,
  profile,
  resume,
  points,
  postings,
  footerLinks,
  onEditResume,
  onRetryResume,
  onOpenPointHistory,
  onChargePoints,
  onRetryPoints,
  onViewAllPostings,
  onContinuePosting,
  onRegisterPosting,
  onRetryPostings,
}: MemberHomeViewProps) {
  const name = fullName?.trim();

  return (
    <div className="bg-bg-primary flex min-h-dvh flex-col">
      <GlobalHeader
        logo={
          <Link to="/home" aria-label="위버 홈">
            <img src="/weiver.svg" alt="위버" width={72} height={18} />
          </Link>
        }
        navigation={<MemberHeaderNavigation />}
        profile={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="hidden sm:inline-flex">
              <HeaderPoints state={points} />
            </span>
            {profile ?? <HeaderProfileButton fullName={name} />}
          </div>
        }
      />
      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-10 px-4 py-10 sm:px-6 lg:px-15">
        <div className="min-w-0 wrap-anywhere">
          <h1 className="text-h2 text-text-primary">
            {name ? `${name}님, ` : ''}오늘도 면접을 준비해볼까요?
          </h1>
          <p className="text-body1 text-text-tertiary mt-2">
            준비 중인 공고를 확인하고 다음 단계를 이어가보세요.
          </p>
        </div>
        <div className="grid items-stretch gap-6 lg:min-h-74 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <MasterResumeSummary state={resume} onEdit={onEditResume} onRetry={onRetryResume} />
          <PointsSummary
            state={points}
            onOpenHistory={onOpenPointHistory}
            onCharge={onChargePoints}
            onRetry={onRetryPoints}
          />
        </div>
        <PreparingPostings
          state={postings}
          onViewAll={onViewAllPostings}
          onContinue={onContinuePosting}
          onRegister={onRegisterPosting}
          onRetry={onRetryPostings}
        />
      </main>
      <MemberFooter links={footerLinks} />
    </div>
  );
}
