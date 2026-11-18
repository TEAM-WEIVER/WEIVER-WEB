import { Link } from 'react-router';

import { getFirstStep } from '@/lib/signup-flow';

export function LoginFooter() {
  return (
    <p className="text-caption text-text-secondary mt-10 text-center sm:mt-14">
      아직 계정이 없으신가요?{' '}
      <Link
        to={`/signup/${getFirstStep()}`}
        className="hover:text-text-primary focus-visible:outline-primary-600 rounded-sm underline underline-offset-2 focus-visible:outline-2"
      >
        이메일로 회원가입
      </Link>
    </p>
  );
}
