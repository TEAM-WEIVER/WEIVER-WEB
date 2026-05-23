import { ProgressIcon } from './progress-icon';

const HIRING_STEPS = ['AI 서류분석', 'AI 면접', '기업 매칭'];

export function HiringProcessCard() {
  return (
    <section className="border-border-light bg-bg-primary flex flex-col gap-4 rounded-[20px] border px-6 py-7 lg:min-h-[194px] lg:px-[34px]">
      <h2 className="text-h3 text-text-secondary">AI 채용 프로세스</h2>
      <div className="grid gap-3.5 md:grid-cols-3">
        {HIRING_STEPS.map((step) => (
          <div
            key={step}
            className="border-border-light bg-bg-secondary flex h-[82px] min-w-0 items-center gap-[18px] rounded-lg border px-[19px] py-4"
          >
            <ProgressIcon variant="process" />
            <div className="text-text-disabled flex min-w-0 flex-col gap-1">
              <p className="text-h4 whitespace-nowrap">{step}</p>
              <p className="text-body2">미진행</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
