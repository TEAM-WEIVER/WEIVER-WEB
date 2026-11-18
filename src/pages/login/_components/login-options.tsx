import { useId } from 'react';
import { Link } from 'react-router';

import { Checkbox } from '@/components/ui/checkbox';
import { PASSWORD_RESET_PATH } from '@/lib/auth-paths';

interface LoginOptionsProps {
  rememberEmail: boolean;
  onRememberEmailChange: (checked: boolean) => void;
  disabled: boolean;
}

export function LoginOptions({
  rememberEmail,
  onRememberEmailChange,
  disabled,
}: LoginOptionsProps) {
  const checkboxId = useId();
  const descriptionId = `${checkboxId}-description`;

  return (
    <div className="text-caption text-text-secondary flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <label htmlFor={checkboxId} className="flex min-h-6 items-center gap-2">
        <Checkbox
          id={checkboxId}
          className="size-5"
          checked={rememberEmail}
          onCheckedChange={(checked) => onRememberEmailChange(checked === true)}
          aria-describedby={descriptionId}
          disabled={disabled}
        />
        로그인 정보 저장
      </label>
      <span id={descriptionId} className="sr-only">
        다음 로그인에 사용할 이메일을 이 브라우저에 저장합니다.
      </span>
      <Link
        to={PASSWORD_RESET_PATH}
        className="hover:text-text-primary focus-visible:outline-primary-600 rounded-sm py-1 underline underline-offset-2 focus-visible:outline-2"
      >
        비밀번호를 잊으셨나요?
      </Link>
    </div>
  );
}
