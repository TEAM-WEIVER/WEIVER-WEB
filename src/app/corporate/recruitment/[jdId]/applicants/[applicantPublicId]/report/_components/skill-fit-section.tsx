'use client';

import { useState } from 'react';
import {
  Brain,
  ChartColumn,
  CircleCheck,
  Lightbulb,
  NotebookText,
  RefreshCw,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { CompetencyDetail, SkillFit } from '@/schemas/corporate/report';

import { KeywordTag, ProgressBar } from './report-card';
import { SkillScriptModal, type SkillScriptItem } from './skill-script-modal';
import { SkillFitScoreDonut, SkillRadarChart } from './skill-fit-charts';

const COMPETENCY_META = [
  {
    name: '성장가능성',
    color: 'text-success',
    barClassName: 'bg-success',
    iconBgClassName: 'bg-success/10',
    icon: TrendingUp,
  },
  {
    name: '일관성',
    color: 'text-info',
    barClassName: 'bg-info',
    iconBgClassName: 'bg-info/10',
    icon: RefreshCw,
  },
  {
    name: '문제해결력',
    color: 'text-warning',
    barClassName: 'bg-warning',
    iconBgClassName: 'bg-warning/10',
    icon: Lightbulb,
  },
  {
    name: '논리성',
    color: 'text-success',
    barClassName: 'bg-success',
    iconBgClassName: 'bg-success/10',
    icon: Scale,
  },
  {
    name: '협업 및 팀워크',
    color: 'text-text-tertiary',
    barClassName: 'bg-text-tertiary',
    iconBgClassName: 'bg-bg-tertiary',
    icon: Users,
  },
  {
    name: '대처능력',
    color: 'text-text-tertiary',
    barClassName: 'bg-text-tertiary',
    iconBgClassName: 'bg-bg-tertiary',
    icon: ShieldCheck,
  },
] as const;

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="text-primary-700 size-6" />
      <h2 className="text-h4 text-text-primary">{title}</h2>
    </div>
  );
}

function SkillFitSummaryCard({ skillFit }: { skillFit: SkillFit }) {
  return (
    <section className="border-border-light bg-bg-primary flex items-center gap-6 rounded-[20px] border p-6">
      <SkillFitScoreDonut value={skillFit.matchingRate ?? 0} />

      <div className="border-border-light bg-bg-secondary flex h-[108px] flex-1 flex-col justify-center gap-3 rounded-xl border p-6">
        <div className="flex items-center gap-2">
          <CircleCheck className="text-primary-600 size-5" />
          <h3 className="text-body1 text-text-primary">AI 역량 평가</h3>
        </div>
        <p className="text-caption text-text-tertiary leading-4">{skillFit.aiAbilitySummary}</p>
      </div>

      <div className="border-border-light bg-bg-secondary flex h-[108px] flex-1 flex-col justify-center gap-3 rounded-xl border p-6">
        <div className="flex items-center gap-2">
          <CircleCheck className="text-primary-600 size-5" />
          <h3 className="text-body1 text-text-primary">보유 스킬 키워드</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(skillFit.skillTags ?? []).map((tag) => (
            <KeywordTag key={tag} className="h-6 px-1.5 text-[12px] leading-4">
              {tag}
            </KeywordTag>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompetencyCard({
  competency,
  onOpenScript,
}: {
  competency: CompetencyDetail;
  onOpenScript: (competencyName: string) => void;
}) {
  const meta = COMPETENCY_META.find((item) => item.name === competency.name) ?? COMPETENCY_META[0];
  const Icon = meta.icon;

  return (
    <article className="border-border-light bg-bg-primary rounded-[20px] border p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-body1 text-text-secondary">{competency.name}</h3>
            <p className={`${meta.color} text-h3`}>{competency.percentage}%</p>
          </div>
          <div
            className={`${meta.iconBgClassName} flex size-[38px] items-center justify-center rounded-lg`}
          >
            <Icon className={`${meta.color} size-6`} />
          </div>
        </div>

        <ProgressBar value={competency.percentage} barClassName={meta.barClassName} />

        <Button
          type="button"
          variant="outline"
          className="border-border-light bg-bg-tertiary text-text-secondary hover:bg-primary-200 h-[42px] w-full rounded-lg shadow-none"
          onClick={() => onOpenScript(competency.name)}
        >
          <NotebookText className="text-text-disabled size-[18px]" />
          AI 스크립트 확인하기
        </Button>
      </div>
    </article>
  );
}

export function SkillFitSection({
  skillFit,
  scriptsByCompetency,
}: {
  skillFit: SkillFit;
  scriptsByCompetency: Record<string, SkillScriptItem[]>;
}) {
  const competencies = skillFit.aiSkillAnalysis ?? [];
  const [selectedCompetencyName, setSelectedCompetencyName] = useState<string | null>(null);
  const selectedScripts = selectedCompetencyName
    ? (scriptsByCompetency[selectedCompetencyName] ?? [])
    : [];

  return (
    <>
      <div className="flex flex-col gap-[34px]">
        <section className="flex flex-col gap-4">
          <SectionHeading icon={ChartColumn} title="스킬핏 분석 결과" />
          <SkillFitSummaryCard skillFit={skillFit} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading icon={Brain} title="AI 역량 분석" />
          <div className="flex flex-col gap-6">
            <SkillRadarChart items={competencies} />
            <div className="grid grid-cols-1 gap-[23px] md:grid-cols-2">
              {competencies.map((competency) => (
                <CompetencyCard
                  key={competency.name}
                  competency={competency}
                  onOpenScript={setSelectedCompetencyName}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <SkillScriptModal
        open={selectedCompetencyName !== null}
        competencyName={selectedCompetencyName ?? ''}
        scripts={selectedScripts}
        onClose={() => setSelectedCompetencyName(null)}
      />
    </>
  );
}
