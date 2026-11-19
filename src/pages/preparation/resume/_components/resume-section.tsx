import { useId, useRef, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';

import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
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

import {
  clearDisabledFields,
  emptyValues,
  isFieldDisabled,
  validateEntry,
  type ResumeRow,
  type ResumeSectionConfig,
  type ResumeValues,
} from '../_model/resume-editor';

const controlClassName = 'h-9.5 border-border-default bg-white px-3 py-1.5 text-body2';

type ResumeEntryFormProps<Name extends string> = {
  config: ResumeSectionConfig<Name>;
  values: ResumeValues<Name>;
  isEditing: boolean;
  onChange: (name: Name, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

function ResumeEntryForm<Name extends string>({
  config,
  values,
  isEditing,
  onChange,
  onSave,
  onCancel,
}: ResumeEntryFormProps<Name>) {
  const formId = useId();
  const headingId = `${formId}-heading`;
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validateEntry(config.fields, values) : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          const disabled = isFieldDisabled(field, values);
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

      <div className="border-border-light flex justify-end gap-2.5 border-t pt-4">
        <Button type="button" variant="outline" className="h-9 bg-white" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" className="h-9">
          저장
        </Button>
      </div>
    </form>
  );
}

type ResumeSectionProps<Name extends string> = {
  config: ResumeSectionConfig<Name>;
  rows: ResumeRow<Name>[];
  setRows: (update: (rows: ResumeRow<Name>[]) => ResumeRow<Name>[]) => void;
};

export function ResumeSection<Name extends string>({
  config,
  rows,
  setRows,
}: ResumeSectionProps<Name>) {
  const nextId = useRef(0);

  function addRow() {
    const row: ResumeRow<Name> = {
      id: `added-${nextId.current++}`,
      state: 'editing',
      input: emptyValues(config.fields),
    };
    setRows((current) => [...current, row]);
  }

  function updateRow(id: string, update: (row: ResumeRow<Name>) => ResumeRow<Name>) {
    setRows((current) => current.map((row) => (row.id === id ? update(row) : row)));
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <section aria-label={config.title} className="space-y-6">
      <div className="border-border-light flex items-start justify-between gap-3 border-b pb-4">
        <SectionHeading as="h2" title={config.title} description={config.description} />
        <Button type="button" variant="outline" className="h-9.5 bg-white" onClick={addRow}>
          <Plus aria-hidden="true" />
          {config.title} 추가
        </Button>
      </div>

      {rows.map((row) => {
        if (row.state === 'editing') {
          return (
            <ResumeEntryForm
              key={row.id}
              config={config}
              values={row.input}
              isEditing={Boolean(row.saved)}
              onChange={(name, value) =>
                updateRow(row.id, (current) => {
                  if (current.state !== 'editing') return current;
                  const input = clearDisabledFields(config.fields, {
                    ...current.input,
                    [name]: value,
                  });
                  return { ...current, input };
                })
              }
              onSave={() =>
                updateRow(row.id, (current) =>
                  current.state === 'editing'
                    ? { id: current.id, state: 'saved', saved: current.input }
                    : current,
                )
              }
              onCancel={() => {
                if (row.saved) {
                  updateRow(row.id, (current) =>
                    current.saved
                      ? { id: current.id, state: 'saved', saved: current.saved }
                      : current,
                  );
                } else {
                  removeRow(row.id);
                }
              }}
            />
          );
        }

        const summary = config.summarize(row.saved);
        return (
          <article
            key={row.id}
            className="border-border-default flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-white p-4 sm:p-6"
          >
            <div className="min-w-0 flex-1 space-y-1 wrap-anywhere">
              <h3 className="text-body1 font-semibold">{summary.title}</h3>
              {summary.details.map((detail, index) => (
                <p key={index} className="text-body3 text-text-secondary">
                  {detail}
                </p>
              ))}
              {summary.description ? (
                <p className="text-body3 text-text-secondary pt-1 whitespace-pre-wrap">
                  {summary.description}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 bg-white"
                aria-label={`${summary.title} 수정`}
                onClick={() =>
                  updateRow(row.id, (current) =>
                    current.state === 'saved'
                      ? { ...current, state: 'editing', input: current.saved }
                      : current,
                  )
                }
              >
                수정
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-text-secondary h-9"
                aria-label={`${summary.title} 삭제`}
                onClick={() => removeRow(row.id)}
              >
                삭제
              </Button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
