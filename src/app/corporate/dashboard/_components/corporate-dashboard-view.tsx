import {
  MOCK_COMPANY_DASHBOARD,
  MOCK_JOB_POSTINGS,
  MOCK_NOTIFICATIONS,
} from './dashboard-fixtures';
import { CompanySummaryCard } from './company-summary-card';
import { JobPostingList } from './job-posting-list';
import { MatchingNotificationCard } from './matching-notification-card';

export function CorporateDashboardView() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid gap-6 min-[1180px]:grid-cols-2">
        <CompanySummaryCard company={MOCK_COMPANY_DASHBOARD} />
        <MatchingNotificationCard notifications={MOCK_NOTIFICATIONS} />
      </div>

      <JobPostingList postings={MOCK_JOB_POSTINGS} />
    </div>
  );
}
