import * as React from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const formControlClass = 'text-body2 h-12 rounded-lg border-border-light bg-bg-secondary px-5 py-3';

const formTextareaClass = 'text-body2 rounded-lg border-border-light bg-bg-secondary px-5 py-3.5';

const nativeSelectClass =
  'text-body2 h-12 w-full appearance-none rounded-lg border border-border-default bg-bg-primary px-5 py-3 text-text-primary outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px] disabled:cursor-not-allowed disabled:opacity-50';

function FormField({
  id,
  label,
  error,
  className,
  children,
}: {
  id?: string;
  label: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => React.ReactNode;
}) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={inputId} className="text-text-primary">
        {label}
      </Label>
      {children({
        id: inputId,
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })}
      {error && (
        <p id={errorId} className="text-caption text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function FieldError({ children, id }: { children?: React.ReactNode; id?: string }) {
  if (!children) return null;

  return (
    <p id={id} className="text-caption text-error">
      {children}
    </p>
  );
}

export { FieldError, FormField, formControlClass, formTextareaClass, nativeSelectClass };
