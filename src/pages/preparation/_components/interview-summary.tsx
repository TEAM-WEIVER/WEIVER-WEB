import { useId } from 'react';
import { Lightbulb, PlayCircle } from 'lucide-react';

import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';

import type { InterviewRecord } from '../_types/job-posting-detail';

type InterviewSummaryProps = {
  interviews: InterviewRecord[];
  canStart: boolean;
  unavailableReason?: string;
  onStart?: () => void;
  onOpenReport?: (id: string) => void;
};

export function InterviewSummary({
  interviews,
  canStart,
  unavailableReason,
  onStart,
  onOpenReport,
}: InterviewSummaryProps) {
  const reasonId = useId();
  const disabled = !canStart || !onStart;
  const reason = disabled ? unavailableReason || '면접 시작 기능을 준비 중이에요.' : undefined;

  return (
    <section aria-label="AI 모의면접">
      <div className="border-border-light mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <SectionHeading
          as="h2"
          size="sm"
          title="AI 모의면접"
          description="등록한 채용공고와 지원서류를 바탕으로 맞춤형 모의면접을 진행해보세요."
        />
        {/* TODO: AI 면접 시작 버튼의 디자인을 확정·반영하고 전용 Storybook 스토리를 추가한다. */}
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-describedby={reason ? reasonId : undefined}
          onClick={onStart}
          className="h-9 gap-1 px-3 text-xs font-normal"
        >
          <PlayCircle aria-hidden="true" />
          AI 면접 시작
        </Button>
      </div>
      {reason ? (
        <p id={reasonId} className="text-body3 text-text-tertiary mb-3">
          {reason}
        </p>
      ) : null}
      <p className="text-caption text-text-tertiary border-border-light bg-bg-secondary mb-4 flex items-start gap-2 rounded-lg border p-3">
        <Lightbulb aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        지원서류를 추가하면 더욱 구체적인 직무 맞춤 꼬리물기 질문을 준비할 수 있어요.
      </p>
      <div className="border-border-light rounded-xl border bg-white px-4 py-4">
        <h3 className="text-body3 text-text-secondary mb-2">최근 모의면접</h3>
        {interviews.length ? (
          <ul className="divide-border-light divide-y">
            {interviews.map((interview) => (
              <li key={interview.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-body1 text-text-primary">
                    {interview.score === null ? '분석 중' : `총합 ${interview.score}점`}
                  </p>
                  <time dateTime={interview.date} className="text-caption text-text-tertiary">
                    {interview.date.replaceAll('-', '.')}
                  </time>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!interview.reportAvailable || !onOpenReport}
                  onClick={() => onOpenReport?.(interview.id)}
                  aria-label={`${interview.date} 면접 리포트 보기`}
                  className="h-8 px-3 text-xs font-normal"
                >
                  리포트 보기
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body3 text-text-tertiary py-4">아직 진행한 모의면접이 없어요.</p>
        )}
      </div>
    </section>
  );
}
