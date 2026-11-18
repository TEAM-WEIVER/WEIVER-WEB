import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

function hasRequiredCharacters(password: string) {
  return /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password);
}

function hasValidLength(password: string) {
  return password.length >= 8 && password.length <= 64;
}

export function isPasswordRuleSatisfied(password: string) {
  return hasRequiredCharacters(password) && hasValidLength(password);
}

function PasswordRuleItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <li className="text-caption text-text-primary flex items-start gap-2">
      <Check
        aria-hidden="true"
        size={16}
        className={cn('shrink-0', passed ? 'text-success' : 'text-error')}
      />
      <span>
        <span className="sr-only">{passed ? '충족: ' : '미충족: '}</span>
        {label}
      </span>
    </li>
  );
}

export function PasswordRules({ password, id }: { password: string; id?: string }) {
  return (
    <ul id={id} className="flex flex-col gap-1">
      <PasswordRuleItem
        passed={hasRequiredCharacters(password)}
        label="영문, 숫자, 특수문자가 각각 1자 이상 들어가야 합니다."
      />
      <PasswordRuleItem passed={hasValidLength(password)} label="8자 이상 64자 이하여야 합니다." />
    </ul>
  );
}
