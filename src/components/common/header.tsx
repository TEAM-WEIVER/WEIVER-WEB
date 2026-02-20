import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-end border-b border-[var(--border-light)] bg-[var(--bg-primary)] px-20">
      <Button variant="default" size="xs">
        서비스 알아보기
      </Button>
    </header>
  );
}
