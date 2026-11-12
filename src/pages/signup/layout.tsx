import { Outlet } from 'react-router';

import { Header } from '@/components/common/header';

export default function SignupLayout() {
  return (
    <div className="bg-bg-secondary min-h-screen">
      <Header />

      <main className="flex justify-center px-4 pt-[34px] pb-20">
        <div className="border-border-light bg-bg-primary w-full max-w-[1062px] rounded-[20px] border p-6 md:p-11">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
