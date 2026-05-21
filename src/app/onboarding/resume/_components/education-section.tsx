import type { FieldArrayWithId, UseFormRegister } from 'react-hook-form';

import { formControlClass, nativeSelectClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ResumeData } from '@/schemas/onboarding';

import { RemoveButton, RepeatableSection } from './repeatable-section';

const EMPTY_EDUCATION = {
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
  register: UseFormRegister<ResumeData>;
  append: (value: typeof EMPTY_EDUCATION) => void;
  remove: (index: number) => void;
}

export function EducationSection({ fields, register, append, remove }: EducationSectionProps) {
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
          {fields.length > 1 ? <RemoveButton onClick={() => remove(index)} /> : null}
          <div className="flex gap-3.5">
            <div className="flex w-[164px] flex-col gap-2">
              <Label className="text-text-secondary">학력구분</Label>
              <select {...register(`education.${index}.type`)} className={nativeSelectClass}>
                <option value="">학력구분</option>
                <option value="고등학교">고등학교</option>
                <option value="대학교(2,3년)">대학교(2,3년)</option>
                <option value="대학교(4년)">대학교(4년)</option>
                <option value="대학원(석사)">대학원(석사)</option>
                <option value="대학원(박사)">대학원(박사)</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">학교명</Label>
              <Input
                {...register(`education.${index}.school`)}
                placeholder="학교명을 입력해주세요."
                className={formControlClass}
              />
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
                placeholder="평점/4.5"
                className={formControlClass}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">입학년월</Label>
              <Input
                {...register(`education.${index}.enrollmentDate`)}
                placeholder="YYYY.MM"
                className={formControlClass}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">졸업년월</Label>
              <Input
                {...register(`education.${index}.graduationDate`)}
                placeholder="YYYY.MM"
                className={formControlClass}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label className="text-text-secondary">졸업상태</Label>
              <select {...register(`education.${index}.status`)} className={nativeSelectClass}>
                <option value="">졸업상태</option>
                <option value="재학중">재학중</option>
                <option value="휴학중">휴학중</option>
                <option value="졸업">졸업</option>
                <option value="졸업예정">졸업예정</option>
                <option value="중퇴">중퇴</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </RepeatableSection>
  );
}

export { EMPTY_EDUCATION };
