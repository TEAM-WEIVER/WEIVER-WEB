import { Check } from 'lucide-react';

type ProgressIconProps = {
  complete?: boolean;
  variant?: 'profile' | 'process';
};

export function ProgressIcon({ complete = false, variant = 'profile' }: ProgressIconProps) {
  if (variant === 'process') {
    return (
      <span className="bg-primary-100 flex size-8 shrink-0 items-center justify-center rounded-full">
        <span className="bg-primary-200 flex size-6 items-center justify-center rounded-full text-white">
          <Check size={15} strokeWidth={3} />
        </span>
      </span>
    );
  }

  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
        complete ? 'bg-success text-white' : 'bg-primary-200 text-white'
      }`}
    >
      <Check size={15} strokeWidth={3} />
    </span>
  );
}
