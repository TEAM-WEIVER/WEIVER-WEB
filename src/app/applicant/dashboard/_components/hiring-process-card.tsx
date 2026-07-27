import { ProgressIcon } from './progress-icon';

const HIRING_STEPS = [
  { key: 'document-analysis', label: 'AI 서류분석' },
  { key: 'interview', label: 'AI 면접' },
  { key: 'matching', label: '기업 매칭' },
] as const;

type HiringProcessCardProps = {
  isDocumentAnalysisReady: boolean;
};

export function HiringProcessCard({ isDocumentAnalysisReady }: HiringProcessCardProps) {
  return (
    <section className="border-border-light bg-bg-primary flex flex-col gap-4 rounded-[20px] border px-6 py-7 lg:min-h-[194px] lg:px-[34px]">
      <h2 className="text-h3 text-text-secondary">AI 채용 프로세스</h2>
      <div className="grid gap-3.5 md:grid-cols-3">
        {HIRING_STEPS.map((step) => (
          <HiringStepCard
            key={step.key}
            label={step.label}
            active={step.key === 'document-analysis' && isDocumentAnalysisReady}
          />
        ))}
      </div>
    </section>
  );
}

function HiringStepCard({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`border-border-light flex h-[82px] min-w-0 items-center gap-[18px] rounded-lg border px-[19px] py-4 ${
        active ? 'bg-bg-tertiary' : 'bg-bg-secondary'
      }`}
    >
      <ProgressIcon variant="process" complete={active} />
      <div
        className={`flex min-w-0 flex-col gap-1 ${active ? 'text-text-secondary' : 'text-text-disabled'}`}
      >
        <p className="text-h4 whitespace-nowrap">{label}</p>
        <p className="text-body2">{active ? '진행 완료' : '미진행'}</p>
      </div>
    </div>
  );
}
