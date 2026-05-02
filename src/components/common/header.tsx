import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="border-border-light bg-bg-primary flex h-16 items-center justify-end border-b px-20">
      <Button variant="default" size="xs">
        서비스 알아보기
      </Button>
    </header>
  );
}
