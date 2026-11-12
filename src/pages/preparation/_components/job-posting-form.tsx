import { useId, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BriefcaseBusiness, Building2, Info, Link } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { jobPostingSchema, type JobPostingValues } from '@/schemas/job-posting';

export type JobPostingFormProps = {
  initialValues?: Partial<JobPostingValues>;
  onSubmit: (values: JobPostingValues) => Promise<void>;
};

export function JobPostingForm({ initialValues, onSubmit }: JobPostingFormProps) {
  const id = useId();
  const submitting = useRef(false);
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<JobPostingValues>({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: {
      companyName: '',
      positionName: '',
      sourceUrl: '',
      content: '',
      ...initialValues,
    },
  });

  const submit = handleSubmit(async (values) => {
    if (submitting.current) return;
    submitting.current = true;
    clearErrors('root');
    try {
      await onSubmit(values);
    } catch {
      setError('root', {
        message: '공고를 등록하지 못했어요. 입력한 내용을 확인하고 다시 시도해주세요.',
      });
    } finally {
      submitting.current = false;
    }
  });

  return (
    <form noValidate onSubmit={submit} aria-busy={isSubmitting} className="space-y-6">
      <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
        <legend className="sr-only">지원 공고 정보</legend>
        <section
          aria-labelledby={`${id}-basic`}
          className="border-border-default rounded-xl border bg-white p-4 sm:p-6"
        >
          <div className="border-border-light mb-6 flex items-center justify-between gap-4 border-b pb-4">
            <h2 id={`${id}-basic`} className="text-body2 text-text-primary">
              기본 정보 입력
            </h2>
            <p className="text-caption text-text-tertiary">* 필수 입력 사항</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              label={<span className="text-body3">회사명 *</span>}
              error={errors.companyName?.message}
            >
              {(field) => (
                <div className="relative">
                  <Input
                    {...register('companyName')}
                    {...field}
                    aria-required="true"
                    placeholder="회사명을 입력해주세요."
                    variant="default"
                    className="h-10 pr-10 text-[13px] leading-[18px]"
                  />
                  <Building2
                    aria-hidden="true"
                    className="text-text-tertiary pointer-events-none absolute top-3 right-4 size-4"
                  />
                </div>
              )}
            </FormField>
            <FormField
              label={<span className="text-body3">포지션명 *</span>}
              error={errors.positionName?.message}
            >
              {(field) => (
                <div className="relative">
                  <Input
                    {...register('positionName')}
                    {...field}
                    aria-required="true"
                    placeholder="포지션명을 입력해주세요."
                    variant="default"
                    className="h-10 pr-10 text-[13px] leading-[18px]"
                  />
                  <BriefcaseBusiness
                    aria-hidden="true"
                    className="text-text-tertiary pointer-events-none absolute top-3 right-4 size-4"
                  />
                </div>
              )}
            </FormField>
            <FormField
              className="sm:col-span-2"
              label={<span className="text-body3">채용공고 URL (선택)</span>}
              error={errors.sourceUrl?.message}
            >
              {(field) => (
                <div className="relative">
                  <Link
                    aria-hidden="true"
                    className="text-icon-muted pointer-events-none absolute top-3 left-4 size-4"
                  />
                  <Input
                    {...register('sourceUrl')}
                    {...field}
                    type="url"
                    placeholder="링크를 입력해주세요."
                    variant="default"
                    className="h-10 pl-10 text-[13px] leading-[18px]"
                  />
                </div>
              )}
            </FormField>
          </div>
        </section>

        <section
          aria-labelledby={`${id}-content-heading`}
          className="border-border-default rounded-xl border bg-white p-4 sm:p-6"
        >
          <h2
            id={`${id}-content-heading`}
            className="text-body2 text-text-primary border-border-light mb-5 border-b pb-4"
          >
            <label htmlFor={`${id}-content`}>채용 공고 내용</label>
          </h2>
          <Textarea
            {...register('content')}
            id={`${id}-content`}
            variant="default"
            placeholder="채용 공고 내용 전체를 붙여넣어주세요."
            className="min-h-[300px] resize-y px-3 py-3 text-[13px] leading-[18px]"
          />
        </section>
      </fieldset>

      {errors.root ? (
        <p role="alert" className="text-body2 text-error">
          {errors.root.message}
        </p>
      ) : null}
      <div className="border-border-light flex flex-wrap items-center justify-between gap-4 border-t pt-5">
        <p className="text-caption text-text-tertiary flex items-center gap-2">
          <Info aria-hidden="true" className="size-3.5 shrink-0" />
          입력한 내용을 확인한 후 공고를 등록해주세요.
        </p>
        <Button type="submit" isLoading={isSubmitting} className="h-9 px-3 text-sm font-medium">
          공고 등록하기
        </Button>
      </div>
    </form>
  );
}
