import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const textareaVariants = cva(
  'text-body2 flex min-h-16 w-full rounded-lg border px-5 py-3.5 shadow-none transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        filled:
          'border-border-light bg-bg-secondary text-text-primary placeholder:text-text-disabled focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px] aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        default:
          'border-input bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20',
      },
    },
    defaultVariants: {
      variant: 'filled',
    },
  },
);

function Textarea({
  className,
  variant,
  ...props
}: React.ComponentProps<'textarea'> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
