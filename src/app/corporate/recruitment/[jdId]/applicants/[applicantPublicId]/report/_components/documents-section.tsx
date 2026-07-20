import {
  BookOpen,
  Download,
  FilePenLine,
  FileText,
  Github,
  Link as LinkIcon,
  MessageCircle,
  NotepadText,
  UserRound,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { DocumentSummary, InterviewTurn } from '@/schemas/corporate/report';

type DocumentItem = {
  title: string;
  description: string;
  action: 'download' | 'detail' | 'open';
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
};

function SectionHeading({
  icon: Icon,
  title,
  tag,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tag?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="text-primary-700 size-6 shrink-0" />
      <div className="flex flex-col gap-1">
        <h2 className="text-h4 text-text-primary">{title}</h2>
        {tag && (
          <span className="border-border-default bg-primary-200 text-body2 text-text-primary inline-flex h-7 w-fit items-center rounded-md border px-2">
            {tag}
          </span>
        )}
      </div>
    </div>
  );
}

function DocumentAction({ item }: { item: DocumentItem }) {
  if (item.action === 'download') {
    return (
      <Button
        type="button"
        variant="ghost"
        className="text-primary-600 hover:bg-primary-200 size-10 rounded-lg p-0"
        aria-label={`${item.title} 다운로드`}
      >
        <Download className="size-5" />
      </Button>
    );
  }

  const label = item.action === 'detail' ? '상세보기' : '바로가기';

  if (item.href) {
    return (
      <Button asChild size="xs" className="h-[42px] rounded-[10px]">
        <a href={item.href} target="_blank" rel="noreferrer">
          {label}
        </a>
      </Button>
    );
  }

  return (
    <Button type="button" size="xs" className="h-[42px] rounded-[10px]">
      {label}
    </Button>
  );
}

function DocumentRow({ item }: { item: DocumentItem }) {
  const Icon = item.icon;

  return (
    <article className="bg-bg-tertiary flex h-[66px] items-center justify-between rounded-xl py-2 pr-3 pl-2">
      <div className="flex min-w-0 items-center gap-4">
        <div className="bg-primary-200 flex size-[50px] shrink-0 items-center justify-center rounded-lg">
          <Icon className="text-primary-700 size-6" />
        </div>
        <div className="flex min-w-0 flex-col">
          <h3 className="text-body1 text-text-primary truncate">{item.title}</h3>
          <p className="text-body3 text-text-tertiary truncate">{item.description}</p>
        </div>
      </div>
      <DocumentAction item={item} />
    </article>
  );
}

function DocumentList({ documents }: { documents: DocumentSummary }) {
  const portfolio = documents.portfolio;

  const fileItems: DocumentItem[] = [
    {
      title: '이력서',
      description: 'PDF · 1.2MB',
      action: 'download',
      icon: FileText,
    },
    {
      title: '자기소개서',
      description: 'PDF · 1.2MB',
      action: 'detail',
      icon: UserRound,
    },
    {
      title: '포트폴리오',
      description: `${portfolio?.portfolioFileUrl ?? 'portfolio.pdf'} · PDF · 1.2MB`,
      action: 'detail',
      icon: FilePenLine,
    },
  ];

  const linkItems: DocumentItem[] = [
    {
      title: '포트폴리오 링크',
      description: 'Github',
      action: 'open',
      href: portfolio?.urlGithub ?? undefined,
      icon: Github,
    },
    {
      title: '포트폴리오 링크',
      description: 'Notion',
      action: 'open',
      href: portfolio?.urlTech ?? undefined,
      icon: NotepadText,
    },
    {
      title: '포트폴리오 링크',
      description: '기타 개인사이트',
      action: 'open',
      href: portfolio?.urlEtc ?? undefined,
      icon: LinkIcon,
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading icon={BookOpen} title="제출서류 리스트" />
      <div className="flex flex-col gap-2">
        <div className="border-border-light bg-bg-primary rounded-[20px] border p-5">
          <div className="flex flex-col gap-3">
            {fileItems.map((item) => (
              <DocumentRow key={item.title} item={item} />
            ))}
          </div>
        </div>
        <div className="border-border-light bg-bg-primary rounded-[20px] border p-5">
          <div className="flex flex-col gap-3">
            {linkItems.map((item) => (
              <DocumentRow key={`${item.description}-${item.href}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScriptItem({ script }: { script: InterviewTurn }) {
  return (
    <article className="flex flex-col gap-3">
      <div className="border-border-light bg-bg-tertiary rounded-tl-sm rounded-tr-xl rounded-br-xl rounded-bl-xl border px-5 py-3.5">
        <p className="text-body2 text-text-primary">
          Q{script.sequence}. {script.question}
        </p>
      </div>
      <div className="border-primary-700 bg-bg-secondary border-l-4 px-5 py-3.5">
        <p className="text-body2 text-text-primary leading-5">{script.answer}</p>
      </div>
    </article>
  );
}

function ScriptSection({ tag, scripts }: { tag: string; scripts?: InterviewTurn[] }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading icon={MessageCircle} title="AI 면접 스크립트" tag={tag} />
      <div className="border-border-light bg-bg-primary flex flex-col gap-2.5 rounded-[20px] border p-5">
        {(scripts ?? []).map((script) => (
          <ScriptItem key={`${tag}-${script.question_code}-${script.sequence}`} script={script} />
        ))}
      </div>
    </section>
  );
}

export function DocumentsSection({ documents }: { documents: DocumentSummary }) {
  return (
    <div className="flex flex-col gap-8">
      <DocumentList documents={documents} />
      <ScriptSection tag="기술면접" scripts={documents.techInterviewScripts} />
      <ScriptSection tag="인성면접" scripts={documents.cultureInterviewScripts} />
    </div>
  );
}
