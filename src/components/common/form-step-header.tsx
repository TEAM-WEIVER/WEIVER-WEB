interface FormStepHeaderProps {
  totalSteps: number;
  currentStep: number;
  title: string;
}

export function FormStepHeader({ totalSteps, currentStep, title }: FormStepHeaderProps) {
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className="border-border-light bg-bg-secondary rounded-t-[20px] border-x border-t p-11">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          <p className="text-body2 text-text-tertiary">
            {totalSteps}단계 중 {currentStep}단계
          </p>
          <h1 className="text-h2 text-text-secondary">{title}</h1>
        </div>
        <div className="bg-bg-tertiary h-4 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary-700 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
