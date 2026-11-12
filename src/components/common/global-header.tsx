import type { ComponentProps, ReactNode } from 'react';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

type GlobalHeaderProps = Omit<ComponentProps<'header'>, 'children'> & {
  /** Pass a link here when the logo destination has been decided. */
  logo?: ReactNode;
  navigation?: ReactNode;
  profile?: ReactNode;
};

export function GlobalHeader({
  logo = <img src="/weiver.svg" alt="위버" width={72} height={18} />,
  navigation,
  profile,
  className,
  ...props
}: GlobalHeaderProps) {
  return (
    <header {...props} className={cn('border-border-light bg-bg-primary border-b', className)}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-5 px-4 sm:flex-nowrap sm:px-6 lg:px-15">
        <div className="flex h-17 shrink-0 items-center">{logo}</div>
        {navigation ? (
          <nav
            aria-label="주 메뉴"
            className="order-3 flex w-full min-w-0 items-center overflow-x-auto sm:order-none sm:w-auto sm:flex-1"
          >
            {navigation}
          </nav>
        ) : null}
        {profile ? <div className="ml-auto flex h-17 shrink-0 items-center">{profile}</div> : null}
      </div>
    </header>
  );
}

type HeaderNavItemProps = ComponentProps<'a'> & {
  active?: boolean;
  /** Compose with a router Link/NavLink without adding a router dependency here. */
  asChild?: boolean;
};

export function HeaderNavItem({
  active = false,
  asChild = false,
  className,
  children,
  ...props
}: HeaderNavItemProps) {
  const Comp = asChild ? Slot.Root : 'a';

  return (
    <Comp
      {...props}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'text-body2 text-text-tertiary hover:text-text-primary focus-visible:ring-ring flex h-12 shrink-0 items-center border-b-2 border-transparent px-3 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-inset sm:h-17',
        active && 'border-primary-700 text-text-primary',
        className,
      )}
    >
      {children}
    </Comp>
  );
}
