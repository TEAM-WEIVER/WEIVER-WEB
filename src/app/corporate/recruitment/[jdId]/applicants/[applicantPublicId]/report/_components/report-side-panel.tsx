import { Download, Edit3, Rocket } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { CardSummary } from '@/schemas/corporate/report';

import { KeywordTag } from './report-card';

type ReportSidePanelProps = {
  cardSummary: CardSummary;
};

export function ReportSidePanel({ cardSummary }: ReportSidePanelProps) {
  const card = cardSummary.card;

  return (
    <aside className="flex w-full flex-col gap-6 xl:w-[387px] xl:shrink-0">
      <section className="border-border-light bg-bg-primary rounded-[20px] border p-6">
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-body1 text-text-tertiary">스킬핏 점수</p>
            <div className="border-border-default bg-bg-tertiary flex h-[82px] items-center justify-center rounded-lg border">
              <span className="text-text-secondary text-[40px] leading-none font-bold">
                {card?.skillScore ?? '-'}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <p className="text-body1 text-text-tertiary">컬처핏 스타일</p>
            <div className="border-border-default bg-bg-tertiary flex h-[82px] items-center gap-4 rounded-lg border px-5">
              <div className="bg-primary-200 flex size-11 shrink-0 items-center justify-center rounded-md">
                <Rocket className="text-primary-700 size-7" />
              </div>
              <p className="text-h4 text-text-primary truncate">{card?.culturefitStyle ?? '-'}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <p className="text-body1 text-text-tertiary">기술스택 키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {(card?.skillTags ?? []).map((tag) => (
              <KeywordTag key={tag}>{tag}</KeywordTag>
            ))}
          </div>
        </div>
      </section>

      <Button
        type="button"
        className="bg-success text-text-primary hover:bg-success/90 h-[58px] w-full rounded-xl"
      >
        <Download className="size-5" />
        지원자 리포트 저장하기
      </Button>

      <section className="bg-primary-700 flex flex-col gap-5 rounded-[20px] p-6">
        <div className="flex items-center gap-3">
          <Edit3 className="text-text-inverse size-6" />
          <h2 className="text-h3 text-text-inverse">Note</h2>
        </div>
        <Textarea
          aria-label="지원자 노트"
          placeholder="지원자에 대한 간단한 노트를 작성하세요."
          className="border-primary-400 bg-primary-600 text-text-inverse placeholder:text-primary-400 focus-visible:ring-primary-300 min-h-[139px] resize-none"
        />
        <Button
          type="button"
          className="bg-success text-text-primary hover:bg-success/90 h-[52px] w-full rounded-xl"
        >
          노트 저장하기
        </Button>
      </section>
    </aside>
  );
}
