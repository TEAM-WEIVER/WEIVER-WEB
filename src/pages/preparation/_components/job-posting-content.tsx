import { ExternalLink, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';

type JobPostingContentProps = { content: string; sourceUrl?: string | null };

function getSafeSourceUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

export function JobPostingContent({ content, sourceUrl }: JobPostingContentProps) {
  const source = getSafeSourceUrl(sourceUrl);
  return (
    <div className="space-y-4">
      {source ? (
        <div className="border-border-light flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
          <span className="bg-bg-tertiary text-text-secondary rounded-lg p-2">
            <Globe aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1 basis-40">
            <p className="text-body2 text-text-secondary flex items-center gap-1">
              원본 채용공고 바로가기 <ExternalLink aria-hidden="true" className="size-3.5" />
            </p>
            <p className="text-caption text-text-tertiary mt-1 wrap-anywhere">
              {source.host}
              {source.pathname}
              {source.search}
            </p>
          </div>
          <Button asChild variant="outline" className="h-8 px-3 text-xs font-normal">
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="원본 채용공고 새 창 열기"
            >
              새 창 열기
            </a>
          </Button>
        </div>
      ) : null}
      <section
        aria-label="채용 공고 내용"
        className="border-border-light rounded-xl border bg-white p-4 sm:p-5"
      >
        <h2 className="text-body2 text-text-primary mb-4">채용 공고 내용</h2>
        <div className="text-body3 text-text-secondary bg-bg-secondary border-border-light rounded-lg border p-4 wrap-anywhere whitespace-pre-wrap">
          {content.trim() || '등록된 공고 내용이 없어요.'}
        </div>
      </section>
    </div>
  );
}
