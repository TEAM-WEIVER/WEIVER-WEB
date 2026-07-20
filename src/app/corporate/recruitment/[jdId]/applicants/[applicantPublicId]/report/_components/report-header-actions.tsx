import { ApplicantContactButton } from '../../../../_components/applicant-contact-button';
import { ReportDeleteButton } from './report-delete-button';

export function ReportHeaderActions({
  jdId,
  applicantPublicId,
}: {
  jdId: number;
  applicantPublicId: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <ReportDeleteButton />
      <ApplicantContactButton
        jdId={jdId}
        applicantPublicId={applicantPublicId}
        className="h-[42px] w-[132px]"
      />
    </div>
  );
}
