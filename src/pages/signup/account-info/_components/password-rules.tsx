import { CircleCheck } from 'lucide-react';

export function isPasswordRuleSatisfied(password: string) {
  return (
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password) &&
    password.length >= 8 &&
    password.length <= 64
  );
}

function PasswordRuleItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <CircleCheck size={18} className={passed ? 'text-success' : 'text-text-disabled'} />
      <span className="text-caption text-text-primary">{label}</span>
    </div>
  );
}

export function PasswordRules({ password }: { password: string }) {
  const hasCharTypes =
    /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password);
  const hasValidLength = password.length >= 8 && password.length <= 64;

  return (
    <div className="flex flex-col gap-1.5">
      <PasswordRuleItem
        passed={hasCharTypes}
        label="최소 1자 이상 영문, 숫자, 특수문자가 들어가야 합니다."
      />
      <PasswordRuleItem passed={hasValidLength} label="8자 이상 64자 이하여야 합니다." />
    </div>
  );
}
