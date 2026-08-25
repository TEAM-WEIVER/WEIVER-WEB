import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { FieldError } from '@/components/ui/form-field';
import type { PortfolioData } from '@/schemas/onboarding';

interface AgreementSectionProps {
  control: Control<PortfolioData>;
  error?: string;
  showErrors: boolean;
}

export function AgreementSection({ control, error, showErrors }: AgreementSectionProps) {
  const errorMessage = showErrors ? error : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Controller
        control={control}
        name="agreement"
        render={({ field }) => (
          <label
            htmlFor="portfolio-agreement"
            className={`bg-bg-tertiary flex cursor-pointer items-center gap-2.5 rounded-lg border px-5 py-3 ${
              errorMessage ? 'border-error' : 'border-transparent'
            }`}
          >
            <Checkbox
              id="portfolio-agreement"
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              aria-invalid={!!errorMessage}
              className={errorMessage ? 'border-error' : undefined}
            />
            <span className="text-body2 text-text-secondary">
              제공한 정보가 정확함을 확인하며, 채용 절차를 위해 개인정보가 활용되는 것에 동의합니다.
            </span>
          </label>
        )}
      />
      <FieldError>{errorMessage}</FieldError>
    </div>
  );
}
