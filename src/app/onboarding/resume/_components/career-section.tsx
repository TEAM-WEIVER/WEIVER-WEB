import type { FieldArrayWithId, UseFormRegister } from 'react-hook-form';
import { Controller, useWatch, type Control } from 'react-hook-form';

import { DatePicker } from '@/components/ui/date-picker';
import { formControlClass, nativeSelectClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ResumeData } from '@/schemas/onboarding';

import { RemoveButton, RepeatableSection } from './repeatable-section';

const EMPTY_CAREER = {
  workExperienceId: undefined,
  isRecognized: undefined,
  company: '',
  startDate: '',
  endDate: '',
  type: '',
  position: '',
  duty: '',
};

interface CareerSectionProps {
  fields: FieldArrayWithId<ResumeData, 'careers', 'id'>[];
  control: Control<ResumeData>;
  register: UseFormRegister<ResumeData>;
  append: (value: typeof EMPTY_CAREER) => void;
  remove: (index: number) => void;
}

export function CareerSection({ fields, control, register, append, remove }: CareerSectionProps) {
  const watchedCareers = useWatch({ control, name: 'careers' });

  return (
    <RepeatableSection
      title="경력사항"
      addLabel="경력 추가하기"
      onAdd={() => append({ ...EMPTY_CAREER })}
    >
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="bg-bg-tertiary relative flex flex-col gap-2 rounded-[10px] p-6"
        >
          {fields.length > 1 || watchedCareers?.[index]?.company ? (
            <RemoveButton label="경력 삭제" onClick={() => remove(index)} />
          ) : null}
          <div className="flex gap-3.5">
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">회사명-부서</Label>
              <Input
                {...register(`careers.${index}.company`)}
                placeholder="회사명-부서의 형태로 입력해주세요."
                className={formControlClass}
              />
            </div>
            <div className="flex w-[220px] flex-col gap-2">
              <Label className="text-text-secondary">입사일</Label>
              <Controller
                control={control}
                name={`careers.${index}.startDate`}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    aria-label="입사일 선택"
                  />
                )}
              />
            </div>
            <div className="flex w-[220px] flex-col gap-2">
              <Label className="text-text-secondary">퇴사일</Label>
              <Controller
                control={control}
                name={`careers.${index}.endDate`}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    aria-label="퇴사일 선택"
                  />
                )}
              />
            </div>
            <div className="flex w-[221px] flex-col gap-2">
              <Label className="text-text-secondary">경력형태</Label>
              <select {...register(`careers.${index}.type`)} className={nativeSelectClass}>
                <option value="">경력형태</option>
                <option value="정규직">정규직</option>
                <option value="인턴">인턴</option>
                <option value="계약직">계약직</option>
                <option value="프리랜서">프리랜서</option>
                <option value="병역특례">병역특례</option>
                <option value="아르바이트">아르바이트</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3.5">
            <div className="flex w-[388px] flex-col gap-2">
              <Label className="text-text-secondary">직급</Label>
              <Input
                {...register(`careers.${index}.position`)}
                placeholder="직급을 입력해주세요."
                className={formControlClass}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">담당업무</Label>
              <Input
                {...register(`careers.${index}.duty`)}
                placeholder="담당업무를 한 줄정도로 적어주세요."
                className={formControlClass}
              />
            </div>
          </div>
        </div>
      ))}
    </RepeatableSection>
  );
}

export { EMPTY_CAREER };
