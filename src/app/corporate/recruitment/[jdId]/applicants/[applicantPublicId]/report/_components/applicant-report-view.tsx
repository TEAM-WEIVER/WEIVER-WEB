'use client';

import {
  useAiSummary,
  useCardSummary,
  useCultureFit,
  useDocumentSummary,
  useSkillFit,
} from '@/hooks/corporate/use-report';
import type {
  AiSummary,
  CardSummary,
  CultureFit,
  DocumentSummary,
  SkillFit,
} from '@/schemas/corporate/report';

import { CultureFitSection } from './culture-fit-section';
import { DocumentsSection } from './documents-section';
import { ReportCard } from './report-card';
import { ReportHeader } from './report-header';
import { ReportSidePanel } from './report-side-panel';
import type { ReportTab } from './report-tabs';
import { SkillFitSection } from './skill-fit-section';
import type { SkillScriptItem } from './skill-script-modal';
import { SummarySection } from './summary-section';

const EMPTY_CARD_SUMMARY: CardSummary = {
  profile: null,
  card: null,
  memo: null,
};

const EMPTY_AI_SUMMARY: AiSummary = {
  aiSummary: null,
  majorCareers: [],
};

const EMPTY_SKILL_FIT: SkillFit = {
  matchingRate: null,
  skillTags: [],
  aiAbilitySummary: null,
  aiSkillAnalysis: [],
};

const EMPTY_CULTURE_FIT: CultureFit = {
  matchStatus: null,
  culturefitStyle: null,
  topTwoAxes: [],
  aiSummary: null,
  axesDetails: [],
};

const EMPTY_DOCUMENT_SUMMARY: DocumentSummary = {
  portfolio: null,
  techInterviewScripts: [],
  cultureInterviewScripts: [],
};

const EMPTY_SKILL_SCRIPTS: Record<string, SkillScriptItem[]> = {};

type ApplicantReportViewProps = {
  activeTab: ReportTab;
  jdId: string;
  applicantPublicId: string;
};

type ReportContentProps = {
  activeTab: ReportTab;
  aiSummary: AiSummary | null;
  aiSummaryLoading: boolean;
  aiSummaryError: Error | null;
  skillFit: SkillFit | null;
  skillFitLoading: boolean;
  skillFitError: Error | null;
  cultureFit: CultureFit | null;
  cultureFitLoading: boolean;
  cultureFitError: Error | null;
  documentSummary: DocumentSummary | null;
  documentSummaryLoading: boolean;
  documentSummaryError: Error | null;
};

function ReportSectionFallback({ message }: { message: string }) {
  return (
    <ReportCard className="flex min-h-[320px] items-center justify-center">
      <p className="text-body1 text-text-tertiary">{message}</p>
    </ReportCard>
  );
}

function ReportSectionSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <ReportCard className="flex flex-col gap-5">
        <div className="bg-bg-tertiary h-8 w-40 rounded" />
        <div className="bg-bg-tertiary h-5 w-full rounded" />
        <div className="bg-bg-tertiary h-5 w-3/4 rounded" />
      </ReportCard>
      <ReportCard className="flex flex-col gap-4">
        <div className="bg-bg-tertiary h-8 w-36 rounded" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="bg-bg-tertiary h-16 rounded-xl" />
        ))}
      </ReportCard>
    </div>
  );
}

function ReportContent({
  activeTab,
  aiSummary,
  aiSummaryLoading,
  aiSummaryError,
  skillFit,
  skillFitLoading,
  skillFitError,
  cultureFit,
  cultureFitLoading,
  cultureFitError,
  documentSummary,
  documentSummaryLoading,
  documentSummaryError,
}: ReportContentProps) {
  if (activeTab === 'skill-fit') {
    if (skillFitLoading) return <ReportSectionSkeleton />;
    if (skillFitError) {
      return <ReportSectionFallback message="스킬핏 리포트를 불러오지 못했습니다." />;
    }

    return (
      <SkillFitSection
        skillFit={skillFit ?? EMPTY_SKILL_FIT}
        scriptsByCompetency={EMPTY_SKILL_SCRIPTS}
      />
    );
  }

  if (activeTab === 'culture-fit') {
    if (cultureFitLoading) return <ReportSectionSkeleton />;
    if (cultureFitError) {
      return <ReportSectionFallback message="컬처핏 리포트를 불러오지 못했습니다." />;
    }

    return <CultureFitSection cultureFit={cultureFit ?? EMPTY_CULTURE_FIT} />;
  }

  if (activeTab === 'documents') {
    if (documentSummaryLoading) return <ReportSectionSkeleton />;
    if (documentSummaryError) {
      return <ReportSectionFallback message="제출 서류 정보를 불러오지 못했습니다." />;
    }

    return <DocumentsSection documents={documentSummary ?? EMPTY_DOCUMENT_SUMMARY} />;
  }

  if (aiSummaryLoading) return <ReportSectionSkeleton />;
  if (aiSummaryError) {
    return <ReportSectionFallback message="AI 요약 리포트를 불러오지 못했습니다." />;
  }

  return <SummarySection summary={aiSummary ?? EMPTY_AI_SUMMARY} />;
}

export function ApplicantReportView({
  activeTab,
  jdId,
  applicantPublicId,
}: ApplicantReportViewProps) {
  const numericJdId = Number(jdId);
  const {
    data: cardSummary,
    isLoading: cardSummaryLoading,
    error: cardSummaryError,
  } = useCardSummary(numericJdId, applicantPublicId);
  const {
    data: aiSummary,
    isLoading: aiSummaryLoading,
    error: aiSummaryError,
  } = useAiSummary(numericJdId, applicantPublicId, { enabled: activeTab === 'summary' });
  const {
    data: skillFit,
    isLoading: skillFitLoading,
    error: skillFitError,
  } = useSkillFit(numericJdId, applicantPublicId, { enabled: activeTab === 'skill-fit' });
  const {
    data: cultureFit,
    isLoading: cultureFitLoading,
    error: cultureFitError,
  } = useCultureFit(numericJdId, applicantPublicId, { enabled: activeTab === 'culture-fit' });
  const {
    data: documentSummary,
    isLoading: documentSummaryLoading,
    error: documentSummaryError,
  } = useDocumentSummary(numericJdId, applicantPublicId, { enabled: activeTab === 'documents' });
  const resolvedCardSummary = cardSummary ?? EMPTY_CARD_SUMMARY;

  return (
    <div className="-mx-6 flex min-h-[calc(100vh-68px)] flex-col lg:-mx-20">
      <ReportHeader
        activeTab={activeTab}
        cardSummary={resolvedCardSummary}
        jdId={jdId}
        numericJdId={numericJdId}
        applicantPublicId={applicantPublicId}
        isLoading={cardSummaryLoading}
        error={cardSummaryError}
      />

      <main className="mx-auto grid w-full max-w-[1208px] grid-cols-1 gap-6 py-6 xl:grid-cols-[minmax(0,797px)_387px]">
        <div className="min-w-0">
          <ReportContent
            activeTab={activeTab}
            aiSummary={aiSummary}
            aiSummaryLoading={aiSummaryLoading}
            aiSummaryError={aiSummaryError}
            skillFit={skillFit}
            skillFitLoading={skillFitLoading}
            skillFitError={skillFitError}
            cultureFit={cultureFit}
            cultureFitLoading={cultureFitLoading}
            cultureFitError={cultureFitError}
            documentSummary={documentSummary}
            documentSummaryLoading={documentSummaryLoading}
            documentSummaryError={documentSummaryError}
          />
        </div>
        <ReportSidePanel
          cardSummary={resolvedCardSummary}
          isLoading={cardSummaryLoading}
          error={cardSummaryError}
        />
      </main>
    </div>
  );
}
