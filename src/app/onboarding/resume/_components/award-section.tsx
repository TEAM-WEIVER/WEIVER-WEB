import type { FieldArrayWithId, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller, useWatch, type Control } from 'react-hook-form';

import { DatePicker } from '@/components/ui/date-picker';
import { FieldError, formControlClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ResumeData } from '@/schemas/onboarding';

import { RemoveButton, RepeatableSection } from './repeatable-section';

const EMPTY_AWARD = { awardId: undefined, date: '', name: '', issuer: '' };

interface AwardSectionProps {
  fields: FieldArrayWithId<ResumeData, 'awards', 'id'>[];
  control: Control<ResumeData>;
  errors: FieldErrors<ResumeData>;
  register: UseFormRegister<ResumeData>;
  append: (value: typeof EMPTY_AWARD) => void;
  remove: (index: number) => void;
  showErrors: boolean;
}

export function AwardSection({
  fields,
  control,
  errors,
  register,
  append,
  remove,
  showErrors,
}: AwardSectionProps) {
  const watchedAwards = useWatch({ control, name: 'awards' });

  return (
    <RepeatableSection
      title="수상이력"
      addLabel="수상이력 추가하기"
      onAdd={() => append({ ...EMPTY_AWARD })}
    >
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="bg-bg-tertiary relative flex flex-col gap-2 rounded-[10px] p-6"
        >
          {fields.length > 1 || watchedAwards?.[index]?.name ? (
            <RemoveButton label="수상이력 삭제" onClick={() => remove(index)} />
          ) : null}
          <div className="flex gap-3.5">
            <div className="flex flex-col gap-2">
              <Label className="text-text-secondary">수상일</Label>
              <Controller
                control={control}
                name={`awards.${index}.date`}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    aria-label="수상일 선택"
                    aria-invalid={showErrors && !!errors.awards?.[index]?.date}
                  />
                )}
              />
              {showErrors ? <FieldError>{errors.awards?.[index]?.date?.message}</FieldError> : null}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">수상명</Label>
              <Input
                {...register(`awards.${index}.name`)}
                placeholder="수상명을 정확하게 입력해주세요."
                aria-invalid={showErrors && !!errors.awards?.[index]?.name}
                className={`${formControlClass} ${
                  showErrors && errors.awards?.[index]?.name
                    ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                    : ''
                }`}
              />
              {showErrors ? <FieldError>{errors.awards?.[index]?.name?.message}</FieldError> : null}
            </div>
            <div className="flex w-[388px] flex-col gap-2">
              <Label className="text-text-secondary">발행처</Label>
              <Input
                {...register(`awards.${index}.issuer`)}
                placeholder="발행처를 입력해주세요."
                aria-invalid={showErrors && !!errors.awards?.[index]?.issuer}
                className={`${formControlClass} ${
                  showErrors && errors.awards?.[index]?.issuer
                    ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                    : ''
                }`}
              />
              {showErrors ? (
                <FieldError>{errors.awards?.[index]?.issuer?.message}</FieldError>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </RepeatableSection>
  );
}

export { EMPTY_AWARD };
