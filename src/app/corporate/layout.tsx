import { CorporateShell } from './_components/corporate-shell';

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return (
    <CorporateShell bypassGuard={process.env.NODE_ENV === 'development'}>{children}</CorporateShell>
  );
}
