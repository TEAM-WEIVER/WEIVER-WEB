import { ApplicantContactButton } from '../../../../_components/applicant-contact-button';
import { ReportDeleteButton } from './report-delete-button';

export function ReportHeaderActions() {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <ReportDeleteButton />
      <ApplicantContactButton className="h-[42px] w-[132px]" />
    </div>
  );
}
