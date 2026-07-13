import { Download, Edit3, Rocket } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { CardSummary } from '@/schemas/corporate/report';

import { KeywordTag } from './report-card';

type ReportSidePanelProps = {
  cardSummary: CardSummary;
  keywords?: {
    strengths?: string[];
    weaknesses?: string[];
  };
};

function KeywordGroup({
  title,
  keywords,
  tone = 'default',
}: {
  title: string;
  keywords?: string[];
  tone?: 'default' | 'success' | 'error';
}) {
  if (!keywords?.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body2 text-text-tertiary">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((keyword) => (
          <KeywordTag
            key={keyword}
            className={
              tone === 'success'
                ? 'border-success bg-success/10'
                : tone === 'error'
                  ? 'border-error bg-error/10'
                  : undefined
            }
          >
            {keyword}
          </KeywordTag>
        ))}
      </div>
    </div>
  );
}

export function ReportSidePanel({ cardSummary, keywords }: ReportSidePanelProps) {
  const card = cardSummary.card;

  return (
    <aside className="flex w-full flex-col gap-4 xl:w-[387px] xl:shrink-0">
      <section className="border-border-light bg-bg-primary rounded-2xl border p-5">
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-body2 text-text-tertiary">스킬핏 점수</p>
            <div className="border-border-default bg-bg-tertiary flex h-[68px] items-center justify-center rounded-lg border">
              <span className="text-text-secondary text-[32px] leading-10 font-bold">
                {card?.skillScore ?? '-'}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-body2 text-text-tertiary">컬처핏 스타일</p>
            <div className="border-border-default bg-bg-tertiary flex h-[68px] items-center gap-3.5 rounded-lg border px-4">
              <div className="bg-primary-200 flex size-9 shrink-0 items-center justify-center rounded">
                <Rocket className="text-primary-700 size-6" />
              </div>
              <p className="text-body1 text-text-primary truncate">
                {card?.culturefitStyle ?? '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <p className="text-body2 text-text-tertiary">기술스택 키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {(card?.skillTags ?? []).map((tag) => (
              <KeywordTag key={tag}>{tag}</KeywordTag>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <KeywordGroup title="강점 키워드" keywords={keywords?.strengths} tone="success" />
          <KeywordGroup title="약점 키워드" keywords={keywords?.weaknesses} tone="error" />
        </div>
      </section>

      <Button
        type="button"
        className="bg-success text-text-primary hover:bg-success/90 h-12 w-full rounded-[10px]"
      >
        <Download className="size-5" />
        지원자 리포트 저장하기
      </Button>

      <section className="bg-primary-700 flex flex-col gap-3 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <Edit3 className="text-text-inverse size-4" />
          <h2 className="text-body1 text-text-inverse">Note</h2>
        </div>
        <Textarea
          aria-label="지원자 노트"
          placeholder="지원자에 대한 간단한 노트를 작성하세요."
          className="border-primary-400 bg-primary-600 text-text-inverse placeholder:text-primary-400 focus-visible:ring-primary-300 min-h-[114px] resize-none"
        />
        <Button
          type="button"
          className="bg-success text-text-primary hover:bg-success/90 h-[42px] w-full rounded-[10px]"
        >
          노트 저장하기
        </Button>
      </section>
    </aside>
  );
}
