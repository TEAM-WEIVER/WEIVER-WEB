import { NotebookText, Rocket } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AxisDetail, CultureFit } from '@/schemas/corporate/report';

import { ProgressBar } from './report-card';

function CultureSummaryCard({ cultureFit }: { cultureFit: CultureFit }) {
  const topAxes = cultureFit.topTwoAxes ?? [];

  return (
    <section className="border-border-light bg-bg-primary flex min-h-[232px] flex-col gap-4 rounded-[20px] border p-6">
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-col gap-2">
            <span className="border-border-default bg-primary-200 text-body2 text-text-primary inline-flex h-7 w-fit items-center rounded-md border px-2">
              {cultureFit.matchStatus ?? '높은 매칭률'}
            </span>
            <h2 className="text-h3 text-text-secondary">{cultureFit.culturefitStyle}</h2>
          </div>

          <div className="text-body2 text-text-primary flex flex-wrap items-center">
            {topAxes.map((axis, index) => (
              <div
                key={axis.name}
                className={[
                  'flex items-center gap-2',
                  index > 0 ? 'border-border-default ml-2 border-l pl-2' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="text-text-tertiary">{axis.name}</span>
                <span>{axis.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary-200 flex size-[62px] shrink-0 items-center justify-center rounded-lg">
          <Rocket className="text-primary-700 size-[42px]" />
        </div>
      </div>

      <div className="border-border-light bg-bg-secondary rounded-[14px] border p-5">
        <p className="text-body2 text-text-tertiary leading-5">{cultureFit.aiSummary}</p>
      </div>
    </section>
  );
}

function TraitChip({ name, percentage }: { name: string; percentage: number }) {
  return (
    <div className="border-border-light bg-bg-secondary min-w-[84px] rounded-lg border px-3 py-2.5">
      <p className="text-body2 text-text-tertiary">{name}</p>
      <p className="text-body2 text-text-primary">{percentage}%</p>
    </div>
  );
}

function CultureAxisCard({ axis }: { axis: AxisDetail }) {
  const isLowScore = axis.percentage < 65;

  return (
    <article className="border-border-light bg-bg-primary rounded-[20px] border p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-body1 text-text-secondary">{axis.name}</h3>
            <p className={isLowScore ? 'text-h3 text-text-disabled' : 'text-h3 text-text-primary'}>
              {axis.percentage}%
            </p>
          </div>
          <ProgressBar
            value={axis.percentage}
            barClassName={isLowScore ? 'bg-text-disabled' : 'bg-primary-700'}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {(axis.subTraits ?? []).map((trait) => (
            <TraitChip key={trait.name} name={trait.name} percentage={trait.percentage} />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="border-border-light bg-bg-tertiary text-text-secondary hover:bg-primary-200 h-[42px] w-full rounded-lg shadow-none"
        >
          <NotebookText className="text-text-disabled size-[18px]" />
          AI 스크립트 확인하기
        </Button>
      </div>
    </article>
  );
}

export function CultureFitSection({ cultureFit }: { cultureFit: CultureFit }) {
  return (
    <div className="flex flex-col gap-6">
      <CultureSummaryCard cultureFit={cultureFit} />

      <div className="grid grid-cols-1 gap-[23px] md:grid-cols-2">
        {(cultureFit.axesDetails ?? []).map((axis) => (
          <CultureAxisCard key={axis.name} axis={axis} />
        ))}
      </div>
    </div>
  );
}
