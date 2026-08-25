import { Image as ImageIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form';

import { DatePicker } from '@/components/ui/date-picker';
import { FieldError, formControlClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ResumeData } from '@/schemas/onboarding';

import { SectionTitle } from './section-title';

interface PersonalInfoSectionProps {
  control: Control<ResumeData>;
  errors: FieldErrors<ResumeData>;
  photoUrl?: string | null;
  setValue: UseFormSetValue<ResumeData>;
  showErrors: boolean;
}

export function PersonalInfoSection({
  control,
  errors,
  photoUrl,
  setValue,
  showErrors,
}: PersonalInfoSectionProps) {
  const profileImage = useWatch({ control, name: 'profileImage' });
  const objectPreviewUrl = useMemo(
    () => (profileImage ? URL.createObjectURL(profileImage) : null),
    [profileImage],
  );
  const previewUrl = objectPreviewUrl ?? photoUrl ?? null;

  useEffect(() => {
    return () => {
      if (objectPreviewUrl) URL.revokeObjectURL(objectPreviewUrl);
    };
  }, [objectPreviewUrl]);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="개인 정보" required />

      <div className="flex items-center gap-[34px]">
        <label className="border-border-light bg-bg-tertiary hover:bg-primary-200 relative flex h-[186px] w-[140px] shrink-0 cursor-pointer overflow-hidden rounded-[10px] border transition-colors">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="증명사진 미리보기" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3.5">
              <ImageIcon size={24} className="text-text-tertiary" />
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-body2 text-text-tertiary">증명사진 업로드</span>
                <span className="text-caption text-text-disabled">JPG, PNG 1MB 이하</span>
              </div>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setValue('profileImage', file, { shouldDirty: true });
            }}
          />
        </label>

        <div className="grid flex-1 grid-cols-3 gap-x-6 gap-y-2.5">
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="resume-name" className="text-text-secondary">
              이름
            </Label>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  {...field}
                  id="resume-name"
                  value={field.value ?? ''}
                  placeholder="본명을 입력해주세요."
                  aria-invalid={showErrors && !!errors.name}
                  className={`${formControlClass} ${
                    showErrors && errors.name
                      ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                      : ''
                  }`}
                />
              )}
            />
            {showErrors ? <FieldError>{errors.name?.message}</FieldError> : null}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label className="text-text-secondary">생년월일</Label>
            <Controller
              control={control}
              name="birthday"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  maxYear={new Date().getFullYear()}
                  aria-label="생년월일 선택"
                />
              )}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="resume-email" className="text-text-secondary">
              이메일
            </Label>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  {...field}
                  id="resume-email"
                  value={field.value ?? ''}
                  type="email"
                  placeholder="weiver@example.com"
                  aria-invalid={showErrors && !!errors.email}
                  className={`${formControlClass} ${
                    showErrors && errors.email
                      ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                      : ''
                  }`}
                />
              )}
            />
            {showErrors ? <FieldError>{errors.email?.message}</FieldError> : null}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="resume-phone" className="text-text-secondary">
              전화번호
            </Label>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Input
                  {...field}
                  id="resume-phone"
                  value={field.value ?? ''}
                  type="tel"
                  placeholder="010-1234-5678"
                  aria-invalid={showErrors && !!errors.phone}
                  className={`${formControlClass} ${
                    showErrors && errors.phone
                      ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                      : ''
                  }`}
                />
              )}
            />
            {showErrors ? <FieldError>{errors.phone?.message}</FieldError> : null}
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-2">
            <Label htmlFor="resume-address" className="text-text-secondary">
              주소
            </Label>
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <Input
                  {...field}
                  id="resume-address"
                  value={field.value ?? ''}
                  placeholder="실 거주지를 입력해주세요."
                  aria-invalid={showErrors && !!errors.address}
                  className={`${formControlClass} ${
                    showErrors && errors.address
                      ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                      : ''
                  }`}
                />
              )}
            />
            {showErrors ? <FieldError>{errors.address?.message}</FieldError> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
