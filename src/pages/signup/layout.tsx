import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router';

export default function SignupLayout() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <main className="bg-bg-secondary min-h-screen px-4 py-8 sm:py-[74px]">
      <Outlet />
    </main>
  );
}
