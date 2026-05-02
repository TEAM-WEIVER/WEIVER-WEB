import { Header } from '@/components/common/header';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg-secondary min-h-screen">
      <Header />

      <main className="mx-auto max-w-[1062px] px-4 pt-[34px] pb-20">{children}</main>
    </div>
  );
}
