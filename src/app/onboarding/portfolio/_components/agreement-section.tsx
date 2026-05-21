import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import type { PortfolioData } from '@/schemas/onboarding';

export function AgreementSection({ control }: { control: Control<PortfolioData> }) {
  return (
    <Controller
      control={control}
      name="agreement"
      render={({ field }) => (
        <label className="bg-bg-tertiary flex cursor-pointer items-center gap-2.5 rounded-lg px-5 py-3">
          <Checkbox
            checked={field.value === true}
            onCheckedChange={(checked) => field.onChange(checked === true)}
          />
          <span className="text-body2 text-text-secondary">
            제공한 정보가 정확함을 확인하며, 채용 절차를 위해 개인정보가 활용되는 것에 동의합니다.
          </span>
        </label>
      )}
    />
  );
}
