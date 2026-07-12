import { ExternalLink, FileText, MessageSquareText } from 'lucide-react';

import type { DocumentSummary, InterviewTurn } from '@/schemas/corporate/report';

import { ReportCard, ReportSectionTitle } from './report-card';

function PortfolioLink({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <a
      href={value.startsWith('http') ? value : '#'}
      className="border-border-light bg-bg-secondary hover:bg-bg-tertiary flex h-12 items-center justify-between rounded-lg border px-4 transition-colors"
    >
      <span className="text-body2 text-text-secondary">{label}</span>
      <span className="text-body2 text-text-tertiary flex min-w-0 items-center gap-2">
        <span className="truncate">{value}</span>
        <ExternalLink className="size-4 shrink-0" />
      </span>
    </a>
  );
}

function ScriptList({ title, scripts }: { title: string; scripts?: InterviewTurn[] }) {
  return (
    <ReportCard className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <MessageSquareText className="text-primary-700 size-6" />
        <ReportSectionTitle title={title} />
      </div>
      <div className="flex flex-col gap-4">
        {(scripts ?? []).map((script) => (
          <article
            key={`${script.question_code}-${script.sequence}`}
            className="border-border-light bg-bg-secondary rounded-xl border p-5"
          >
            <p className="text-caption text-text-tertiary mb-2">
              Q{script.sequence}. {script.question_code}
            </p>
            <h3 className="text-body1 text-text-primary">{script.question}</h3>
            <p className="text-body2 text-text-tertiary mt-3 leading-6">{script.answer}</p>
          </article>
        ))}
      </div>
    </ReportCard>
  );
}

export function DocumentsSection({ documents }: { documents: DocumentSummary }) {
  const portfolio = documents.portfolio;

  return (
    <div className="flex flex-col gap-6">
      <ReportCard className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <FileText className="text-primary-700 size-6" />
          <ReportSectionTitle title="제출서류" />
        </div>
        <div className="flex flex-col gap-3">
          <PortfolioLink label="포트폴리오 파일" value={portfolio?.portfolioFileUrl} />
          <PortfolioLink label="GitHub" value={portfolio?.urlGithub} />
          <PortfolioLink label="기술 블로그" value={portfolio?.urlTech} />
          <PortfolioLink label="기타 링크" value={portfolio?.urlEtc} />
        </div>
      </ReportCard>

      <ScriptList title="기술 면접 스크립트" scripts={documents.techInterviewScripts} />
      <ScriptList title="컬처 면접 스크립트" scripts={documents.cultureInterviewScripts} />
    </div>
  );
}
