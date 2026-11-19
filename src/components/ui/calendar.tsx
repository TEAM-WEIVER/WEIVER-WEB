import type { ComponentProps } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Calendar({
  className,
  classNames,
  components,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('text-body2 w-full [--cell-size:2.25rem]', className)}
      classNames={{
        root: defaults.root,
        months: 'relative flex flex-col gap-4',
        month: 'flex w-full flex-col gap-3',
        nav: 'absolute inset-x-0 top-0 flex justify-between',
        button_previous: cn(buttonVariants({ variant: 'ghost' }), 'size-9 p-0'),
        button_next: cn(buttonVariants({ variant: 'ghost' }), 'size-9 p-0'),
        month_caption: 'flex h-9 items-center justify-center font-semibold',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-caption text-text-tertiary flex h-7 flex-1 items-center justify-center',
        week: 'mt-1 flex w-full',
        day: 'group/day relative flex-1 p-0 text-center',
        day_button:
          'text-body2 hover:bg-bg-tertiary focus-visible:ring-ring flex h-9 w-full items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset',
        today: 'text-primary-700 font-semibold [&_button]:ring-1 [&_button]:ring-border-default',
        selected: '[&_button]:bg-primary-700 [&_button]:text-text-inverse',
        outside: 'text-text-disabled',
        disabled: 'text-text-disabled [&_button]:pointer-events-none [&_button]:opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName }) =>
          orientation === 'left' ? (
            <ChevronLeft aria-hidden="true" className={cn('size-4', iconClassName)} />
          ) : (
            <ChevronRight aria-hidden="true" className={cn('size-4', iconClassName)} />
          ),
        DayButton,
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
