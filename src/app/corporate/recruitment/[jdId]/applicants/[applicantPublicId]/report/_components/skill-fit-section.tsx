import { Target } from 'lucide-react';

import type { SkillFit } from '@/schemas/corporate/report';

import { KeywordTag, ProgressBar, ReportCard, ReportSectionTitle } from './report-card';

export function SkillFitSection({ skillFit }: { skillFit: SkillFit }) {
  return (
    <div className="flex flex-col gap-6">
      <ReportCard className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-6">
          <ReportSectionTitle
            title="스킬핏 분석"
            description="공고 요구 역량과 지원자 경험의 일치도를 분석합니다."
          />
          <div className="border-border-default bg-bg-tertiary flex h-[92px] w-[126px] shrink-0 flex-col items-center justify-center rounded-xl border">
            <p className="text-caption text-text-tertiary">매칭률</p>
            <p className="text-text-secondary text-[40px] leading-none font-bold">
              {skillFit.matchingRate}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          {(skillFit.aiSkillAnalysis ?? []).map((item) => (
            <div key={item.name} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-body2 text-text-secondary">{item.name}</p>
                <p className="text-caption text-text-tertiary">{item.percentage}%</p>
              </div>
              <ProgressBar value={item.percentage} />
            </div>
          ))}
        </div>
      </ReportCard>

      <ReportCard className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Target className="text-primary-700 size-6" />
          <ReportSectionTitle title="요구 기술 스택 매칭" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(skillFit.skillTags ?? []).map((tag) => (
            <KeywordTag key={tag}>{tag}</KeywordTag>
          ))}
        </div>
        <p className="text-body1 text-text-secondary leading-7">{skillFit.aiAbilitySummary}</p>
      </ReportCard>
    </div>
  );
}
