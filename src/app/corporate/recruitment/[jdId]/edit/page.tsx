import { JobPostingEditView } from './_components/job-posting-edit-view';

type JobPostingEditPageProps = {
  params: Promise<{ jdId: string }>;
};

export default async function JobPostingEditPage({ params }: JobPostingEditPageProps) {
  const { jdId } = await params;

  return <JobPostingEditView jdId={jdId} />;
}
