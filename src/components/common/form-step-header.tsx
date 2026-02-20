interface FormStepHeaderProps {
  totalSteps: number;
  currentStep: number;
  title: string;
}

export function FormStepHeader({ totalSteps, currentStep, title }: FormStepHeaderProps) {
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className="rounded-t-[20px] border-x border-t border-[var(--border-light)] bg-[var(--bg-secondary)] p-11">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          <p className="text-body2 text-[var(--text-tertiary)]">
            {totalSteps}단계 중 {currentStep}단계
          </p>
          <h1 className="text-h2 text-[var(--text-secondary)]">{title}</h1>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[var(--primary-700)] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
