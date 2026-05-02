import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  'text-body2 h-12 w-full min-w-0 rounded-lg border px-5 py-3 shadow-none transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        filled:
          'border-border-light bg-bg-secondary text-text-primary placeholder:text-text-disabled focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px] aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        default:
          'border-input bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px] aria-invalid:border-destructive aria-invalid:ring-destructive/20',
      },
    },
    defaultVariants: {
      variant: 'filled',
    },
  },
);

function Input({
  className,
  type,
  variant,
  ...props
}: React.ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
