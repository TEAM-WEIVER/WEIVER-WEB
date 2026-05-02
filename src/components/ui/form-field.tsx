import * as React from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const formControlClass = 'text-body2 h-12 rounded-lg border-border-light bg-bg-secondary px-5 py-3';

const formTextareaClass = 'text-body2 rounded-lg border-border-light bg-bg-secondary px-5 py-3.5';

const nativeSelectClass =
  'text-body2 h-12 w-full appearance-none rounded-lg border border-border-default bg-bg-primary px-5 py-3 text-text-primary outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px] disabled:cursor-not-allowed disabled:opacity-50';

function FormField({
  label,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label className="text-text-primary">{label}</Label>
      {children}
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}

function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;

  return <p className="text-caption text-error">{children}</p>;
}

export { FieldError, FormField, formControlClass, formTextareaClass, nativeSelectClass };
