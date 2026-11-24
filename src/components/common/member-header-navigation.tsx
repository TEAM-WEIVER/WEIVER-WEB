import { Link, useLocation } from 'react-router';

import { MASTER_RESUME_PATH, PREPARATION_PATH } from '@/lib/preparation-paths';

import { HeaderNavItem } from './global-header';

export function MemberHeaderNavigation() {
  const { pathname, search } = useLocation();
  const isPreparation =
    pathname === PREPARATION_PATH ||
    pathname.startsWith(`${PREPARATION_PATH}/`) ||
    (pathname === MASTER_RESUME_PATH && Boolean(new URLSearchParams(search).get('postingId')));
  return (
    <>
      <HeaderNavItem
        asChild
        active={pathname === '/home' || (pathname === MASTER_RESUME_PATH && !isPreparation)}
      >
        <Link to="/home">홈</Link>
      </HeaderNavItem>
      <HeaderNavItem asChild active={isPreparation}>
        <Link to={PREPARATION_PATH}>지원 준비</Link>
      </HeaderNavItem>
      {['AI 면접', '역량 리포트'].map((label) => (
        <HeaderNavItem key={label} asChild className="hover:text-text-tertiary cursor-not-allowed">
          <button type="button" disabled title="준비 중">
            {label}
          </button>
        </HeaderNavItem>
      ))}
    </>
  );
}
