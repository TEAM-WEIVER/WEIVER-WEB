import { cn } from '@/lib/utils';

export function ReportCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('border-border-light bg-bg-primary rounded-[20px] border p-8', className)}
    >
      {children}
    </section>
  );
}

export function ReportSectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="bg-primary-700 mt-0.5 h-7 w-1 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-h3 text-text-primary">{title}</h2>
        {description && <p className="text-caption text-text-tertiary">{description}</p>}
      </div>
    </div>
  );
}

export function KeywordTag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        'border-border-default bg-primary-200 text-body2 text-text-primary inline-flex h-7 items-center rounded-md border px-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  barClassName = 'bg-primary-700',
}: {
  value: number;
  barClassName?: string;
}) {
  return (
    <div className="bg-bg-tertiary h-2 w-full overflow-hidden rounded-full">
      <div
        className={cn('h-full rounded-full', barClassName)}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}
