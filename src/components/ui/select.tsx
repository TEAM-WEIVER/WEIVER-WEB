import type { ComponentProps } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;

function SelectValue(props: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'text-body2 border-border-default text-text-primary flex h-9.5 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left outline-none',
        'focus-visible:border-primary-900 focus-visible:ring-primary-900 data-[state=open]:border-primary-900 data-[state=open]:ring-primary-900 focus-visible:ring-1 data-[state=open]:ring-1',
        'aria-invalid:border-error aria-invalid:ring-error/30 data-[state=open]:aria-invalid:border-error data-[state=open]:aria-invalid:ring-error/30 disabled:cursor-not-allowed disabled:opacity-50',
        '*:data-[slot=select-value]:truncate',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="text-text-secondary pointer-events-none size-4 shrink-0" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'popper',
  align = 'start',
  sideOffset = 8,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'border-border-light bg-card relative z-50 max-h-(--radix-select-content-available-height) overflow-hidden rounded-lg border shadow-md',
          position === 'popper' && 'w-(--radix-select-trigger-width)',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="text-text-secondary flex justify-center py-1">
          <ChevronUp className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="py-1.5">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="text-text-secondary flex justify-center py-1">
          <ChevronDown className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'text-body2 text-text-tertiary relative flex min-h-10 cursor-default items-center py-2 pr-9 pl-3.5 wrap-anywhere outline-none select-none',
        'data-[highlighted]:bg-bg-secondary data-[highlighted]:text-text-primary data-[state=checked]:bg-bg-tertiary data-[state=checked]:text-text-primary data-[state=checked]:data-[highlighted]:bg-bg-tertiary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:font-semibold',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="text-text-secondary absolute right-3.5">
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
