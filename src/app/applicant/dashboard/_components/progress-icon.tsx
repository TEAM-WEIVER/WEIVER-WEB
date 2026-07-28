import { Check } from 'lucide-react';

type ProgressIconProps = {
  complete?: boolean;
  variant?: 'profile' | 'process';
};

export function ProgressIcon({ complete = false, variant = 'profile' }: ProgressIconProps) {
  if (variant === 'process') {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full ${
          complete ? 'bg-success/15 size-[50px]' : 'bg-primary-100 size-8'
        }`}
      >
        <span
          className={`flex items-center justify-center rounded-full text-white ${
            complete ? 'bg-success' : 'bg-primary-200'
          } ${complete ? 'size-10' : 'size-6'}`}
        >
          <Check size={complete ? 25 : 15} strokeWidth={3} />
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
