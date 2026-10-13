import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: '404 | WEIVER',
};

export default function NotFound() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-primary text-7xl font-bold">404</p>
      <h1 className="text-foreground text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="text-muted-foreground text-base">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Button asChild>
        {/* The landing is a separate HTML app, so this boundary needs a document navigation. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">홈으로 돌아가기</a>
      </Button>
    </main>
  );
}
