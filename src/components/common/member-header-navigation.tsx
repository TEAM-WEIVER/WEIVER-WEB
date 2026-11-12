import { Link } from 'react-router';

import { HeaderNavItem } from './global-header';

export function MemberHeaderNavigation() {
  return (
    <>
      <HeaderNavItem asChild active>
        <Link to="/home">홈</Link>
      </HeaderNavItem>
      {['지원 준비', 'AI 면접', '역량 리포트'].map((label) => (
        <HeaderNavItem key={label} asChild className="hover:text-text-tertiary cursor-not-allowed">
          <button type="button" disabled title="준비 중">
            {label}
          </button>
        </HeaderNavItem>
      ))}
    </>
  );
}
