import { ApplicantListView } from './_components/applicant-list-view';

type RecruitmentDetailPageProps = {
  params: Promise<{
    jdId: string;
  }>;
};

export default async function RecruitmentDetailPage({ params }: RecruitmentDetailPageProps) {
  const { jdId } = await params;

  return <ApplicantListView jdId={jdId} />;
}
