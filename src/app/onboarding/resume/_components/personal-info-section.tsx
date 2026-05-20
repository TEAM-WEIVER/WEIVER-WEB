import { Image as ImageIcon } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';

import { formControlClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ResumeData } from '@/schemas/onboarding';

import { SectionTitle } from './section-title';

export function PersonalInfoSection({ register }: { register: UseFormRegister<ResumeData> }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="개인 정보" required />

      <div className="flex items-center gap-[34px]">
        <label className="border-border-light bg-bg-tertiary hover:bg-primary-200 flex h-[186px] w-[140px] shrink-0 cursor-pointer flex-col items-center justify-center gap-3.5 rounded-[10px] border transition-colors">
          <ImageIcon size={24} className="text-text-tertiary" />
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-body2 text-text-tertiary">증명사진 업로드</span>
            <span className="text-caption text-text-disabled">JPG, PNG 2MB 이하</span>
          </div>
          <input type="file" accept="image/jpeg,image/png" className="hidden" />
        </label>

        <div className="flex flex-1 flex-wrap gap-x-6 gap-y-2.5">
          <div className="flex w-[388px] flex-col gap-2">
            <Label className="text-text-secondary">이름</Label>
            <Input
              {...register('name')}
              placeholder="본명을 입력해주세요."
              className={formControlClass}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label className="text-text-secondary">이메일</Label>
            <Input
              {...register('email')}
              placeholder="personal@gmail.com"
              disabled
              className={formControlClass}
            />
          </div>
          <div className="flex w-[388px] flex-col gap-2">
            <Label className="text-text-secondary">전화번호</Label>
            <Input
              {...register('phone')}
              placeholder="숫자만 입력해주세요."
              className={formControlClass}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label className="text-text-secondary">주소</Label>
            <Input
              {...register('address')}
              placeholder="거주지를 입력해주세요."
              className={formControlClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
