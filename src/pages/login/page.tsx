'use client';

import { Header } from '@/components/common/header';

import { LoginFooter } from './_components/login-footer';
import { LoginForm } from './_components/login-form';
import { useLoginForm } from './_hooks/use-login-form';

export default function LoginPage() {
  const loginForm = useLoginForm();

  return (
    <div className="bg-bg-secondary min-h-screen">
      <Header />

      <main className="flex justify-center px-4 pt-[113px] pb-20">
        <div className="border-border-light bg-bg-primary w-full max-w-[628px] rounded-[20px] border px-6 py-11 sm:px-16">
          <div className="flex flex-col gap-6">
            <LoginForm {...loginForm} />
            <LoginFooter />
          </div>
        </div>
      </main>
    </div>
  );
}
