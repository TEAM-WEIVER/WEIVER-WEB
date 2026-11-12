import type { TermItem } from '@/lib/signup-terms';
import { Checkbox } from '@/components/ui/checkbox';

interface TermSectionProps {
  item: TermItem;
  checked: boolean;
  onToggle: () => void;
}

export function TermSection({ item, checked, onToggle }: TermSectionProps) {
  const labelId = `term-label-${item.key}`;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-1.5">
        <h3 className="text-h4 text-text-primary">{item.title}</h3>
        {item.required && <span className="text-body2 text-error">*</span>}
      </div>

      <div className="border-border-default bg-bg-primary rounded-lg border px-5 py-3.5">
        {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- 스크롤 가능한 약관 영역에 키보드 접근을 제공한다. */}
        <div
          role="region"
          aria-label={`${item.title} 내용`}
          tabIndex={0}
          className="focus-visible:ring-ring h-31 overflow-y-auto rounded outline-none focus-visible:ring-2"
        >
          <p className="text-body2 whitespace-pre-line text-black">{item.content}</p>
        </div>
        {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
      </div>

      <div className="bg-bg-tertiary flex items-center gap-2.5 rounded-lg px-5 py-3">
        <Checkbox
          id={`term-${item.key}`}
          checked={checked}
          onCheckedChange={onToggle}
          aria-labelledby={labelId}
          aria-required={item.required}
        />
        <span id={labelId} className="text-body2 text-text-secondary">
          {item.agreeLabel}
        </span>
      </div>
    </div>
  );
}
