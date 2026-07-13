import { CultureFitSection } from './culture-fit-section';
import { DocumentsSection } from './documents-section';
import {
  MOCK_AI_SUMMARY,
  MOCK_CARD_SUMMARY,
  MOCK_CULTURE_FIT,
  MOCK_DOCUMENTS,
  MOCK_REPORT_KEYWORDS,
  MOCK_SKILL_SCRIPTS,
  MOCK_SKILL_FIT,
} from './report-fixtures';
import { ReportHeader } from './report-header';
import { ReportSidePanel } from './report-side-panel';
import type { ReportTab } from './report-tabs';
import { SkillFitSection } from './skill-fit-section';
import { SummarySection } from './summary-section';

type ApplicantReportViewProps = {
  activeTab: ReportTab;
  jdId: string;
};

function ReportContent({ activeTab }: { activeTab: ReportTab }) {
  if (activeTab === 'skill-fit') {
    return <SkillFitSection skillFit={MOCK_SKILL_FIT} scriptsByCompetency={MOCK_SKILL_SCRIPTS} />;
  }

  if (activeTab === 'culture-fit') {
    return <CultureFitSection cultureFit={MOCK_CULTURE_FIT} />;
  }

  if (activeTab === 'documents') {
    return <DocumentsSection documents={MOCK_DOCUMENTS} />;
  }

  return <SummarySection summary={MOCK_AI_SUMMARY} />;
}

export function ApplicantReportView({ activeTab, jdId }: ApplicantReportViewProps) {
  return (
    <div className="-mx-6 flex min-h-[calc(100vh-68px)] flex-col lg:-mx-20">
      <ReportHeader activeTab={activeTab} cardSummary={MOCK_CARD_SUMMARY} jdId={jdId} />

      <main className="mx-auto grid w-full max-w-[1208px] grid-cols-1 gap-6 py-6 xl:grid-cols-[minmax(0,797px)_387px]">
        <div className="min-w-0">
          <ReportContent activeTab={activeTab} />
        </div>
        <ReportSidePanel cardSummary={MOCK_CARD_SUMMARY} keywords={MOCK_REPORT_KEYWORDS} />
      </main>
    </div>
  );
}
