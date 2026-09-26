import { ApplicantListView } from './_components/applicant-list-view';

type RecruitmentDetailPageProps = {
  params: Promise<{
    jdId: string;
  }>;
  searchParams: Promise<{
    refresh?: string;
  }>;
};

export default async function RecruitmentDetailPage({
  params,
  searchParams,
}: RecruitmentDetailPageProps) {
  const { jdId } = await params;
  const { refresh } = await searchParams;

  return <ApplicantListView key={refresh ?? 'default'} jdId={jdId} />;
}
