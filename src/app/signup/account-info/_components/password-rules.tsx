import { CircleCheck } from 'lucide-react';

function PasswordRuleItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <CircleCheck size={18} className={passed ? 'text-error' : 'text-text-disabled'} />
      <span className="text-caption text-text-primary">{label}</span>
    </div>
  );
}

export function PasswordRules({ password }: { password: string }) {
  const hasCharTypes =
    /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password);
  const hasValidLength = password.length >= 6 && password.length <= 14;

  return (
    <div className="flex flex-col gap-1.5">
      <PasswordRuleItem
        passed={hasCharTypes}
        label="최소 1자 이상 영문, 숫자, 특수문자가 들어가야 합니다."
      />
      <PasswordRuleItem passed={hasValidLength} label="6자 이상 14자 이하여야 합니다." />
    </div>
  );
}
