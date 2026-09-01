import type { FieldArrayWithId, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller, useWatch, type Control } from 'react-hook-form';

import { DatePicker } from '@/components/ui/date-picker';
import { FieldError, formControlClass, nativeSelectClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ResumeData } from '@/schemas/onboarding';

import { RemoveButton, RepeatableSection } from './repeatable-section';

const EMPTY_EDUCATION = {
  educationId: undefined,
  type: '',
  school: '',
  major: '',
  gpa: '',
  enrollmentDate: '',
  graduationDate: '',
  status: '',
};

interface EducationSectionProps {
  fields: FieldArrayWithId<ResumeData, 'education', 'id'>[];
  control: Control<ResumeData>;
  errors: FieldErrors<ResumeData>;
  register: UseFormRegister<ResumeData>;
  append: (value: typeof EMPTY_EDUCATION) => void;
  remove: (index: number) => void;
  showErrors: boolean;
}

export function EducationSection({
  fields,
  control,
  errors,
  register,
  append,
  remove,
  showErrors,
}: EducationSectionProps) {
  const watchedEducation = useWatch({ control, name: 'education' });

  return (
    <RepeatableSection
      title="학력"
      addLabel="학력 추가하기"
      onAdd={() => append({ ...EMPTY_EDUCATION })}
    >
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="bg-bg-tertiary relative flex flex-col gap-2 rounded-[10px] p-6"
        >
          {fields.length > 1 ||
          watchedEducation?.[index]?.school ||
          watchedEducation?.[index]?.type ? (
            <RemoveButton label="학력 삭제" onClick={() => remove(index)} />
          ) : null}
          <div className="flex gap-3.5">
            <div className="flex w-[164px] flex-col gap-2">
              <Label className="text-text-secondary">학력구분</Label>
              <select
                {...register(`education.${index}.type`)}
                aria-invalid={showErrors && !!errors.education?.[index]?.type}
                className={`${nativeSelectClass} ${
                  showErrors && errors.education?.[index]?.type
                    ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                    : ''
                }`}
              >
                <option value="">학력구분</option>
                <option value="고등학교">고등학교</option>
                <option value="대학교(2,3년)">대학교(2,3년)</option>
                <option value="대학교(4년)">대학교(4년)</option>
                <option value="대학원(석사)">대학원(석사)</option>
                <option value="대학원(박사)">대학원(박사)</option>
              </select>
              {showErrors ? (
                <FieldError>{errors.education?.[index]?.type?.message}</FieldError>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">학교명</Label>
              <Input
                {...register(`education.${index}.school`)}
                placeholder="학교명을 입력해주세요."
                aria-invalid={showErrors && !!errors.education?.[index]?.school}
                className={`${formControlClass} ${
                  showErrors && errors.education?.[index]?.school
                    ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                    : ''
                }`}
              />
              {showErrors ? (
                <FieldError>{errors.education?.[index]?.school?.message}</FieldError>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">전공명</Label>
              <Input
                {...register(`education.${index}.major`)}
                placeholder="전공명을 입력해주세요."
                className={formControlClass}
              />
            </div>
          </div>
          <div className="flex gap-3.5">
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">학점</Label>
              <Input
                {...register(`education.${index}.gpa`)}
                inputMode="decimal"
                placeholder="예: 3.8 (4.5 만점)"
                aria-invalid={!!errors.education?.[index]?.gpa}
                className={`${formControlClass} ${
                  errors.education?.[index]?.gpa
                    ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                    : ''
                }`}
              />
              {errors.education?.[index]?.gpa ? (
                <FieldError>{errors.education?.[index]?.gpa?.message}</FieldError>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">입학년월</Label>
              <Controller
                control={control}
                name={`education.${index}.enrollmentDate`}
                render={({ field }) => (
                  <DatePicker
                    mode="month"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    aria-label="입학년월 선택"
                    aria-invalid={showErrors && !!errors.education?.[index]?.enrollmentDate}
                  />
                )}
              />
              {showErrors ? (
                <FieldError>{errors.education?.[index]?.enrollmentDate?.message}</FieldError>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">졸업년월</Label>
              <Controller
                control={control}
                name={`education.${index}.graduationDate`}
                render={({ field }) => (
                  <DatePicker
                    mode="month"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    aria-label="졸업년월 선택"
                    aria-invalid={showErrors && !!errors.education?.[index]?.graduationDate}
                  />
                )}
              />
              {showErrors ? (
                <FieldError>{errors.education?.[index]?.graduationDate?.message}</FieldError>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">졸업상태</Label>
              <select
                {...register(`education.${index}.status`)}
                aria-label="졸업상태"
                aria-invalid={showErrors && !!errors.education?.[index]?.status}
                className={`${nativeSelectClass} ${
                  showErrors && errors.education?.[index]?.status
                    ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                    : ''
                }`}
              >
                <option value="">졸업상태</option>
                <option value="재학중">재학중</option>
                <option value="휴학중">휴학중</option>
                <option value="졸업">졸업</option>
                <option value="졸업예정">졸업예정</option>
              </select>
              {showErrors ? (
                <FieldError>{errors.education?.[index]?.status?.message}</FieldError>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </RepeatableSection>
  );
}

export { EMPTY_EDUCATION };
