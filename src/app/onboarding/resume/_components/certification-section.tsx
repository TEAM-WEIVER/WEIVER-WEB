import type { FieldArrayWithId, UseFormRegister } from 'react-hook-form';

import { formControlClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ResumeData } from '@/schemas/onboarding';

import { RemoveButton, RepeatableSection } from './repeatable-section';

const EMPTY_CERTIFICATION = { acquiredDate: '', name: '', issuer: '' };

interface CertificationSectionProps {
  fields: FieldArrayWithId<ResumeData, 'certifications', 'id'>[];
  register: UseFormRegister<ResumeData>;
  append: (value: typeof EMPTY_CERTIFICATION) => void;
  remove: (index: number) => void;
}

export function CertificationSection({
  fields,
  register,
  append,
  remove,
}: CertificationSectionProps) {
  return (
    <RepeatableSection
      title="자격증"
      addLabel="자격증 추가하기"
      onAdd={() => append({ ...EMPTY_CERTIFICATION })}
    >
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="bg-bg-tertiary relative flex flex-col gap-2 rounded-[10px] p-6"
        >
          {fields.length > 1 ? <RemoveButton onClick={() => remove(index)} /> : null}
          <div className="flex gap-3.5">
            <div className="flex flex-col gap-2">
              <Label className="text-text-secondary">취득일</Label>
              <Input
                {...register(`certifications.${index}.acquiredDate`)}
                placeholder="YYYY.MM.DD"
                className={formControlClass}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">자격증명</Label>
              <Input
                {...register(`certifications.${index}.name`)}
                placeholder="자격증명을 정확하게 입력해주세요."
                className={formControlClass}
              />
            </div>
            <div className="flex w-[388px] flex-col gap-2">
              <Label className="text-text-secondary">발행처</Label>
              <Input
                {...register(`certifications.${index}.issuer`)}
                placeholder="발행처를 입력해주세요."
                className={formControlClass}
              />
            </div>
          </div>
        </div>
      ))}
    </RepeatableSection>
  );
}

export { EMPTY_CERTIFICATION };
