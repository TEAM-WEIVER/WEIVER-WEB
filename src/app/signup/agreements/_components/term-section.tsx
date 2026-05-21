import type { TermItem } from '@/lib/signup-terms';
import { Checkbox } from '@/components/ui/checkbox';

interface TermSectionProps {
  item: TermItem;
  checked: boolean;
  onToggle: () => void;
}

export function TermSection({ item, checked, onToggle }: TermSectionProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-1.5">
        <h3 className="text-h4 text-text-primary">{item.title}</h3>
        {item.required && <span className="text-body2 text-error">*</span>}
      </div>

      <div className="border-border-default bg-bg-primary rounded-lg border px-5 py-3.5">
        <div className="h-[124px] overflow-y-auto">
          <p className="text-body2 whitespace-pre-line text-black">{item.content}</p>
        </div>
      </div>

      <div className="bg-bg-tertiary flex items-center gap-2.5 rounded-lg px-5 py-3">
        <Checkbox checked={checked} onCheckedChange={onToggle} />
        <span className="text-body2 text-text-secondary">{item.agreeLabel}</span>
      </div>
    </div>
  );
}
