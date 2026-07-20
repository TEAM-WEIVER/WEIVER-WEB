import { ApplicantReportView } from './_components/applicant-report-view';
import { normalizeReportTab } from './_components/report-tabs';

type ApplicantReportPageProps = {
  params: Promise<{
    jdId: string;
    applicantPublicId: string;
  }>;
  searchParams?: Promise<{
    tab?: string | string[];
  }>;
};

export default async function ApplicantReportPage({
  params,
  searchParams,
}: ApplicantReportPageProps) {
  const { jdId, applicantPublicId } = await params;
  const query = await searchParams;
  const activeTab = normalizeReportTab(query?.tab);

  return (
    <ApplicantReportView activeTab={activeTab} jdId={jdId} applicantPublicId={applicantPublicId} />
  );
}
