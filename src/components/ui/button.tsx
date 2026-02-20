import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center h-12 gap-2 whitespace-nowrap rounded-md text-button1 transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        outline: 'border bg-background shadow-xs hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-body3 hover:underline',
      },
      size: {
        default: 'px-4 py-2 gap-2 has-[>svg]:px-3',
        xs: "h-10.5 w-[123px] gap-1 rounded-md [&_svg:not([class*='size-'])]:size-4.5",
        sm: "h-12 w-[347px] gap-1.5 rounded-md [&_svg:not([class*='size-'])]:size-4.5",
        md: "h-12 w-[500px] gap-2.5 rounded-md [&_svg:not([class*='size-'])]:size-4.5",
        icon: 'size-12',
        'icon-xs': "size-10.5 rounded-md [&_svg:not([class*='size-'])]:size-4.5",
        'icon-sm': "size-12 rounded-md [&_svg:not([class*='size-'])]:size-4.5",
        'icon-md': "size-12 rounded-md [&_svg:not([class*='size-'])]:size-4.5",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
