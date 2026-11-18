import { type ComponentProps, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Input } from './input';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'> & {
  id: string;
  defaultVisible?: boolean;
  visibilityLabel?: string;
};

export function PasswordInput({
  id,
  className,
  disabled,
  defaultVisible = false,
  visibilityLabel = '비밀번호',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(defaultVisible);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={cn(className, 'pr-12')}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        className="text-text-tertiary hover:text-text-secondary focus-visible:outline-primary-600 absolute inset-y-1 right-1 grid w-10 cursor-pointer place-items-center rounded-md focus-visible:outline-2 disabled:cursor-default"
        aria-label={`${visibilityLabel} ${visible ? '숨기기' : '보기'}`}
        aria-controls={id}
      >
        <Icon aria-hidden="true" size={22} />
      </button>
    </div>
  );
}
