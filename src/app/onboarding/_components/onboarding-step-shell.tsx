import type { FormEventHandler, ReactNode } from 'react';

import { FormStepHeader } from '@/components/common/form-step-header';

interface OnboardingStepShellProps {
  totalSteps: number;
  currentStep: number;
  title: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  footer: ReactNode;
}

export function OnboardingStepShell({
  totalSteps,
  currentStep,
  title,
  onSubmit,
  children,
  footer,
}: OnboardingStepShellProps) {
  return (
    <div>
      <FormStepHeader totalSteps={totalSteps} currentStep={currentStep} title={title} />

      <div className="border-border-light bg-bg-primary rounded-b-[20px] border p-11">
        <form onSubmit={onSubmit} className="flex flex-col gap-11">
          <div className="flex flex-col gap-[34px]">{children}</div>
          {footer}
        </form>
      </div>
    </div>
  );
}
