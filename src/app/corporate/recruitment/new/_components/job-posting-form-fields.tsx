'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type SelectFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('bg-primary-700 w-1 shrink-0', description ? 'h-12' : 'h-7')} />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-h3 text-text-primary">{title}</h2>
        {description && <p className="text-caption text-text-tertiary">{description}</p>}
      </div>
    </div>
  );
}

function FieldLabel({ label, caption }: { label: string; caption?: string }) {
  return (
    <div className="flex w-full items-end justify-between">
      <p className="text-h4 text-text-secondary">{label}</p>
      {caption && <p className="text-caption text-text-tertiary">{caption}</p>}
    </div>
  );
}

export function FormCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'border-border-light bg-bg-primary flex w-full flex-col rounded-[20px] border p-6 lg:p-11',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function TextInputField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <FieldLabel label={label} />
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function TextareaField({
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn('flex w-full flex-col gap-2', className)}>
      <FieldLabel label={label} caption="글자수 제한 없음" />
      <Textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-32 resize-none"
      />
    </label>
  );
}

export function SelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-col gap-2">
      <FieldLabel label={label} />
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((next) => !next)}
        className={cn(
          'text-body2 border-border-default bg-bg-primary text-text-primary flex h-12 w-full items-center justify-between rounded-lg border px-5 py-3 text-left transition-colors',
          disabled && 'bg-bg-secondary text-text-disabled cursor-not-allowed',
        )}
      >
        <span className={cn(!value && 'text-text-disabled')}>{value || placeholder}</span>
        <ChevronDown className="text-primary-600 size-6 shrink-0" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="border-border-light bg-bg-primary absolute top-[82px] right-0 left-0 z-20 overflow-hidden rounded-lg border shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
        >
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'text-body2 text-text-primary hover:bg-bg-tertiary flex h-10 w-full items-center justify-between px-5 text-left',
                  isSelected && 'bg-bg-tertiary',
                )}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
                {isSelected && <Check className="text-primary-600 size-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
