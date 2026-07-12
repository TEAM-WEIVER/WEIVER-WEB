import { Rocket } from 'lucide-react';

import type { CultureFit } from '@/schemas/corporate/report';

import { ProgressBar, ReportCard, ReportSectionTitle } from './report-card';

export function CultureFitSection({ cultureFit }: { cultureFit: CultureFit }) {
  return (
    <div className="flex flex-col gap-6">
      <ReportCard className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-6">
          <ReportSectionTitle
            title="컬처핏 분석"
            description="지원자의 업무 성향과 조직 문화 적합도를 분석합니다."
          />
          <span className="border-info bg-bg-tertiary text-body1 text-text-primary inline-flex h-10 items-center rounded-lg border px-4">
            적합도 {cultureFit.matchStatus}
          </span>
        </div>

        <div className="border-border-light bg-bg-secondary flex items-center gap-5 rounded-xl border p-5">
          <div className="bg-primary-200 flex size-14 shrink-0 items-center justify-center rounded-lg">
            <Rocket className="text-primary-700 size-8" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-caption text-text-tertiary">컬처핏 스타일</p>
            <h3 className="text-h3 text-text-primary">{cultureFit.culturefitStyle}</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(cultureFit.topTwoAxes ?? []).map((axis) => (
            <div
              key={axis.name}
              className="border-border-light bg-bg-secondary rounded-xl border p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-body1 text-text-secondary">{axis.name}</p>
                <p className="text-body2 text-text-tertiary">{axis.percentage}%</p>
              </div>
              <ProgressBar value={axis.percentage} />
            </div>
          ))}
        </div>
      </ReportCard>

      <ReportCard className="flex flex-col gap-5">
        <ReportSectionTitle title="성향 상세" />
        {(cultureFit.axesDetails ?? []).map((axis) => (
          <div key={axis.name} className="border-border-light rounded-xl border p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-body1 text-text-primary">{axis.name}</p>
              <p className="text-body2 text-text-tertiary">{axis.percentage}%</p>
            </div>
            <ProgressBar value={axis.percentage} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(axis.subTraits ?? []).map((trait) => (
                <div
                  key={trait.name}
                  className="bg-bg-tertiary flex items-center justify-between rounded-lg px-4 py-3"
                >
                  <span className="text-body2 text-text-secondary">{trait.name}</span>
                  <span className="text-caption text-text-tertiary">{trait.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-body1 text-text-secondary leading-7">{cultureFit.aiSummary}</p>
      </ReportCard>
    </div>
  );
}
