import { Building2, CalendarDays, Sparkles } from 'lucide-react';

import type { AiSummary } from '@/schemas/corporate/report';

import { ReportCard, ReportSectionTitle } from './report-card';

export function SummarySection({ summary }: { summary: AiSummary }) {
  return (
    <div className="flex flex-col gap-6">
      <ReportCard className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary-200 flex size-10 items-center justify-center rounded-lg">
            <Sparkles className="text-primary-700 size-5" />
          </div>
          <ReportSectionTitle title="AI 요약" />
        </div>
        <p className="text-body1 text-text-secondary leading-7">{summary.aiSummary}</p>
      </ReportCard>

      <ReportCard className="flex flex-col gap-6">
        <ReportSectionTitle title="주요 커리어" />
        <div className="flex flex-col gap-4">
          {(summary.majorCareers ?? []).map((career) => (
            <article
              key={career.experienceId ?? career.companyName}
              className="border-border-light bg-bg-secondary rounded-xl border p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-primary-600 size-5" />
                    <h3 className="text-h4 text-text-primary">{career.companyName}</h3>
                    {career.employeeType && (
                      <span className="border-border-default bg-bg-primary text-caption text-text-tertiary inline-flex h-6 items-center rounded-md border px-2">
                        {career.employeeType}
                      </span>
                    )}
                  </div>
                  <p className="text-body2 text-text-secondary">{career.position}</p>
                </div>
                <p className="text-caption text-text-tertiary flex shrink-0 items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {career.startDate} - {career.endDate}
                </p>
              </div>
              <p className="text-body2 text-text-tertiary mt-4 leading-6">{career.duties}</p>
            </article>
          ))}
        </div>
      </ReportCard>
    </div>
  );
}
