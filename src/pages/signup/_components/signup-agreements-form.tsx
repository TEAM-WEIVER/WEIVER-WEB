import { useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { INDIVIDUAL_TERMS } from '@/lib/signup-terms';
import { individualTermsSchema, type IndividualTermsData } from '@/schemas/signup';

import { TermSection } from '../agreements/_components/term-section';

const termKeys = INDIVIDUAL_TERMS.map((item) => item.key);

interface SignupAgreementsFormProps {
  defaultTerms?: Record<string, boolean>;
  description: string;
  onComplete: (terms: IndividualTermsData) => Promise<void>;
  onBack: () => void;
  backLabel?: string;
  error?: string | null;
}

export function SignupAgreementsForm({
  defaultTerms = {},
  description,
  onComplete,
  onBack,
  backLabel = '이전 단계',
  error,
}: SignupAgreementsFormProps) {
  const submitting = useRef(false);

  const {
    setValue,
    trigger,
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<IndividualTermsData>({
    resolver: zodResolver(individualTermsSchema),
    defaultValues: Object.fromEntries(termKeys.map((key) => [key, defaultTerms[key] ?? false])),
    mode: 'onChange',
  });

  const watchedValues = useWatch({ control, name: termKeys });

  const allChecked = watchedValues.every(Boolean);
  const someChecked = watchedValues.some(Boolean);

  const handleToggleAll = (next: boolean | 'indeterminate') => {
    termKeys.forEach((key) => setValue(key, next === true));
    void trigger();
  };

  const submit = handleSubmit(onComplete);

  return (
    <form
      aria-labelledby="signup-agreements-title"
      aria-busy={isSubmitting}
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current) return;

        submitting.current = true;
        void submit(event).finally(() => {
          submitting.current = false;
        });
      }}
      className="bg-bg-primary mx-auto flex w-full max-w-[1062px] flex-col gap-9 rounded-[20px] p-5 sm:p-11"
    >
      <header className="flex flex-col gap-1.5">
        <h1 id="signup-agreements-title" className="text-h2 text-text-secondary">
          약관에 동의해주세요
        </h1>
        <p className="text-body2 text-text-tertiary">{description}</p>
      </header>

      <fieldset disabled={isSubmitting} className="flex min-w-0 flex-col gap-8">
        <legend className="sr-only">가입 약관</legend>
        <div className="bg-bg-tertiary flex flex-col gap-2 rounded-lg px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="all-agreements"
              checked={allChecked || (someChecked ? 'indeterminate' : false)}
              onCheckedChange={handleToggleAll}
              aria-describedby="all-agreements-description"
            />
            <Label
              htmlFor="all-agreements"
              className="text-text-secondary cursor-pointer text-sm leading-5"
            >
              모두 동의합니다.
            </Label>
          </div>
          <p id="all-agreements-description" className="text-body3 text-primary-600">
            필수 약관과 선택 약관에 모두 동의합니다.
            <br />각 약관은 개별로 선택할 수 있으며, 선택 약관에 동의하지 않아도 서비스를 이용할 수
            있습니다.
          </p>
        </div>

        {INDIVIDUAL_TERMS.map((item, index) => (
          <TermSection
            key={item.key}
            item={item}
            checked={Boolean(watchedValues[index])}
            onToggle={(checked) => setValue(item.key, checked, { shouldValidate: true })}
          />
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={isSubmitting}
          onClick={onBack}
          className="border-border-default text-sm font-medium shadow-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {backLabel}
        </Button>
        <Button
          type="submit"
          size="xs"
          disabled={!isValid || isSubmitting}
          className="text-sm font-medium"
        >
          {isSubmitting ? '처리 중' : '회원가입 완료'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
