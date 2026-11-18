import type { TermItem } from '@/lib/signup-terms';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TermSectionProps {
  item: TermItem;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}

export function TermSection({ item, checked, onToggle }: TermSectionProps) {
  const checkboxId = `term-${item.key}`;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h4 text-text-primary flex items-center gap-1.5">
        {item.title}
        {item.required ? (
          <span aria-hidden="true" className="text-body2 text-error">
            *
          </span>
        ) : null}
      </h2>

      <div className="border-border-default bg-bg-primary rounded-lg border">
        {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- 스크롤 가능한 약관 영역에 키보드 접근을 제공한다. */}
        <div
          role="region"
          aria-label={`${item.title} 내용`}
          tabIndex={0}
          className="focus-visible:ring-ring h-36 overflow-y-auto rounded px-4 py-3 outline-none focus-visible:ring-2 sm:px-5"
        >
          <p className="text-body2 text-text-primary wrap-anywhere whitespace-pre-line">
            {item.content}
          </p>
        </div>
        {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
      </div>

      <div className="bg-bg-tertiary flex items-center gap-2.5 rounded-lg px-4 py-3 sm:px-5">
        <Checkbox
          id={checkboxId}
          checked={checked}
          onCheckedChange={(next) => onToggle(next === true)}
          aria-required={item.required}
        />
        <Label
          htmlFor={checkboxId}
          className="text-text-secondary cursor-pointer text-sm leading-5"
        >
          {item.agreeLabel}
        </Label>
      </div>
    </section>
  );
}
