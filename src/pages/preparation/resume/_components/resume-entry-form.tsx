import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import type { ResumeSectionConfig, ResumeValues } from '../_model/resume-types';
import { isFieldDisabled, validateEntry } from '../_model/resume-validation';

const controlClassName = 'h-9.5 border-border-default bg-white px-3 py-1.5 text-body2';

type ResumeEntryFormProps<Name extends string> = {
  config: ResumeSectionConfig<Name>;
  values: ResumeValues<Name>;
  isEditing: boolean;
  onChange: (name: Name, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  noHistory?: boolean;
  onSaveNoHistory?: () => void;
  onNoHistoryChange?: (noHistory: boolean) => void;
};

export function ResumeEntryForm<Name extends string>({
  config,
  values,
  isEditing,
  onChange,
  onSave,
  onCancel,
  noHistory = false,
  onSaveNoHistory,
  onNoHistoryChange,
}: ResumeEntryFormProps<Name>) {
  const formId = useId();
  const headingId = `${formId}-heading`;
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted && !noHistory ? validateEntry(config.fields, values) : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (noHistory && onSaveNoHistory) {
      onSaveNoHistory();
      return;
    }
    const nextErrors = validateEntry(config.fields, values);
    const firstInvalid = config.fields.find(({ name }) => nextErrors[name]);
    if (firstInvalid) {
      setSubmitted(true);
      event.currentTarget.ownerDocument.getElementById(`${formId}-${firstInvalid.name}`)?.focus();
      return;
    }

    onSave();
  }

  return (
    <form
      aria-labelledby={headingId}
      noValidate
      onSubmit={handleSubmit}
      className="border-border-default space-y-5 rounded-xl border bg-white p-4 sm:p-6"
    >
      <div className="border-border-light flex flex-wrap items-baseline justify-between gap-2 border-b pb-3">
        <h3 id={headingId} className="text-body2 font-semibold">
          {config.title} 정보 {isEditing ? '수정' : '입력'}
        </h3>
        <p className="text-caption text-text-tertiary">* 필수 입력 사항</p>
      </div>

      <div className="grid items-start gap-x-3.5 gap-y-4 sm:grid-cols-2 xl:grid-cols-[repeat(24,minmax(0,1fr))]">
        {config.fields.map((field) => {
          const disabled = noHistory || isFieldDisabled(field, values);
          const required = Boolean(field.required) && !disabled;
          const fieldProps = {
            name: field.name,
            value: values[field.name],
            disabled,
            required,
          };

          return (
            <FormField
              key={field.name}
              id={`${formId}-${field.name}`}
              label={
                <>
                  {field.label}
                  {required ? <span aria-hidden="true"> *</span> : null}
                </>
              }
              error={errors?.[field.name]}
              className={cn('min-w-0', field.width, disabled && '[&>label]:text-text-tertiary')}
            >
              {(accessibleProps) => {
                if (field.options) {
                  return (
                    <Select {...fieldProps} onValueChange={(value) => onChange(field.name, value)}>
                      <SelectTrigger {...accessibleProps}>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent aria-label={field.label}>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }

                if (field.format === 'month' || field.format === 'date') {
                  return (
                    <DatePicker
                      {...accessibleProps}
                      {...fieldProps}
                      aria-label={field.label}
                      mode={field.format}
                      separator="."
                      value={values[field.name].replaceAll('.', '-')}
                      onChange={(value) => onChange(field.name, value.replaceAll('-', '.'))}
                      triggerClassName={controlClassName}
                    />
                  );
                }

                return field.multiline ? (
                  <Textarea
                    {...accessibleProps}
                    {...fieldProps}
                    rows={1}
                    placeholder={field.placeholder}
                    onChange={(event) => onChange(field.name, event.currentTarget.value)}
                    className="border-border-default min-h-9.5 bg-white px-3 py-2"
                  />
                ) : (
                  <Input
                    {...accessibleProps}
                    {...fieldProps}
                    placeholder={field.placeholder}
                    inputMode={field.format === 'decimal' ? 'decimal' : undefined}
                    onChange={(event) => onChange(field.name, event.currentTarget.value)}
                    className={cn(controlClassName, 'disabled:bg-bg-tertiary')}
                  />
                );
              }}
            </FormField>
          );
        })}
      </div>

      <div className="border-border-light flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        {config.noHistoryLabel && onSaveNoHistory ? (
          <label
            htmlFor={`${formId}-no-history`}
            className="text-body2 text-text-secondary flex cursor-pointer items-center gap-2"
          >
            <Checkbox
              id={`${formId}-no-history`}
              checked={noHistory}
              onCheckedChange={(checked) => onNoHistoryChange?.(checked === true)}
            />
            {config.noHistoryLabel}
          </label>
        ) : null}
        <div className="ml-auto flex gap-2.5">
          <Button type="button" variant="outline" className="h-9 bg-white" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" className="h-9">
            저장
          </Button>
        </div>
      </div>
    </form>
  );
}
