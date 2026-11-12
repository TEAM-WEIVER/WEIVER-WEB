import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type SectionHeadingProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  title: string;
  description?: string;
  /** 문서 구조에 맞는 제목 레벨. 시각적 크기와는 별개다. */
  as?: 'h1' | 'h2' | 'h3';
};

export function SectionHeading({
  title,
  description,
  as: Heading = 'h3',
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div {...props} className={cn('min-w-0 space-y-1 wrap-anywhere', className)}>
      <Heading className="text-h3 text-text-primary">{title}</Heading>
      {description ? <p className="text-body3 text-text-tertiary">{description}</p> : null}
    </div>
  );
}
