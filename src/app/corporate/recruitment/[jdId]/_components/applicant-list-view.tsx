import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ApplicantContactButton } from './applicant-contact-button';

const APPLICANTS = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  name: '홍길동',
  experience: '신입',
  skillScore: 88,
  cultureStyle: '추진형 실행가',
  cultureDescription: '자율 · 혁신 + 성과 · 공동체',
  techStacks: ['Jira', 'Excel', 'Figma', 'Photoshop'],
}));

function Tag({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'info';
}) {
  return (
    <span
      className={cn(
        'text-body2 text-text-primary inline-flex h-6 items-center rounded-md border px-1.5',
        variant === 'info' ? 'border-info bg-bg-tertiary' : 'border-border-default bg-primary-200',
      )}
    >
      {children}
    </span>
  );
}

function SearchField() {
  return (
    <label className="border-border-light bg-bg-tertiary text-text-disabled flex h-[42px] w-[332px] items-center gap-3.5 rounded-xl border px-5">
      <Search size={18} />
      <input
        aria-label="지원자 검색"
        placeholder="지원자 검색..."
        className="text-body2 text-text-primary placeholder:text-text-disabled min-w-0 flex-1 bg-transparent outline-none"
      />
    </label>
  );
}

function FilterSelect({ label, value }: { label: string; value: string }) {
  return (
    <label className="flex w-[240px] min-w-0 flex-col gap-2">
      <span className="text-body2 text-text-primary">{label}</span>
      <button
        type="button"
        className="border-border-light bg-bg-secondary text-body2 text-text-primary flex h-12 w-full items-center justify-between rounded-lg border px-5"
      >
        {value}
        <ChevronDown className="text-primary-600 size-6" />
      </button>
    </label>
  );
}

function SkillScoreFilter() {
  return (
    <div className="flex w-[300px] flex-col gap-[18px]">
      <div className="flex flex-col gap-1">
        <p className="text-body2 text-text-primary">스킬핏 점수</p>
        <p className="text-caption text-text-disabled">
          원을 움직여 원하는 정도의 역량점수를 설정하세요.
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="relative h-[18px] w-[264px]">
          <div className="bg-primary-200 absolute top-[5px] left-0 h-2 w-full rounded-full" />
          <div className="bg-primary-700 absolute top-[5px] left-0 h-2 w-[240px] rounded-full" />
          <div className="bg-primary-700 border-bg-primary absolute top-px left-[240px] size-4 rounded-full border-2" />
        </div>
        <p className="text-caption text-text-primary">80점</p>
      </div>
    </div>
  );
}

function TechStackFilter() {
  return (
    <div className="flex w-[473px] flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-body2 text-text-primary">기술 스택</p>
        <p className="text-caption text-text-disabled">
          공백 클릭 후 Enter하여 추가 (최대 3개 추가 가능)
        </p>
      </div>
      <div className="border-border-light bg-bg-secondary flex h-12 items-center rounded-lg border p-3">
        <Tag>React</Tag>
      </div>
    </div>
  );
}

function ApplicantAvatar() {
  return <div className="size-[54px] shrink-0 rounded-full bg-[#d9d9d9]" aria-hidden />;
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-body1 text-text-secondary w-10">{score}점</p>
      <div className="bg-bg-tertiary h-2 w-[120px] rounded-full">
        <div className="bg-primary-700 h-2 rounded-full" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function ApplicantTable({ jdId }: { jdId: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1208px]">
        <div className="grid grid-cols-[174px_220px_220px_423px_171px]">
          {['지원자', '스킬핏 점수', '컬처핏 스타일', '기술 스택', ''].map((header, index) => (
            <div
              key={header || 'action'}
              className={cn(
                'border-border-light bg-bg-tertiary text-button1 text-text-secondary flex h-12 items-center border-y px-6',
                index === 0 && 'rounded-tl-[20px] border-l',
                index === 4 && 'rounded-tr-[20px] border-r',
              )}
            >
              {header}
            </div>
          ))}
        </div>

        {APPLICANTS.map((applicant, index) => {
          const isLast = index === APPLICANTS.length - 1;

          return (
            <div
              key={applicant.id}
              className="relative grid grid-cols-[174px_220px_220px_423px_171px]"
            >
              <Link
                href={`/corporate/recruitment/${jdId}/applicants/${applicant.id}/report`}
                aria-label={`${applicant.name} 상세 리포트 보기`}
                className="absolute inset-0 z-10"
              />
              <div
                className={cn(
                  'border-border-light bg-bg-primary flex h-[82px] items-center border-b border-l px-6',
                  isLast && 'rounded-bl-[20px]',
                )}
              >
                <div className="flex items-center gap-4">
                  <ApplicantAvatar />
                  <div className="flex flex-col gap-1.5">
                    <p className="text-body1 text-text-secondary">{applicant.name}</p>
                    <Tag variant="info">{applicant.experience}</Tag>
                  </div>
                </div>
              </div>
              <div className="border-border-light bg-bg-primary flex h-[82px] items-center border-b px-6">
                <ScoreBar score={applicant.skillScore} />
              </div>
              <div className="border-border-light bg-bg-primary flex h-[82px] items-center border-b px-6">
                <div className="flex flex-col gap-1">
                  <p className="text-body1 text-text-secondary">{applicant.cultureStyle}</p>
                  <p className="text-caption text-text-tertiary">{applicant.cultureDescription}</p>
                </div>
              </div>
              <div className="border-border-light bg-bg-primary flex h-[82px] items-center border-b px-6">
                <div className="flex flex-wrap gap-1.5">
                  {applicant.techStacks.map((stack) => (
                    <Tag key={stack}>{stack}</Tag>
                  ))}
                </div>
              </div>
              <div
                className={cn(
                  'border-border-light bg-bg-primary relative z-20 flex h-[82px] items-center justify-center border-r border-b px-6',
                  isLast && 'rounded-br-[20px]',
                )}
              >
                <ApplicantContactButton />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Pagination() {
  const pages = ['1', '2', '3', '...', '12'];

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="이전 페이지"
        className="border-border-light bg-bg-primary text-text-secondary flex size-8 items-center justify-center rounded border"
      >
        <ChevronLeft size={20} />
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={cn(
            'border-border-light text-button1 text-text-secondary flex size-8 items-center justify-center rounded border',
            page === '1' ? 'bg-bg-tertiary' : 'bg-bg-primary',
            page === '...' && 'border-transparent bg-transparent',
          )}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        aria-label="다음 페이지"
        className="border-border-light bg-bg-primary text-text-secondary flex size-8 items-center justify-center rounded border"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export function ApplicantListView({ jdId }: { jdId: string }) {
  return (
    <div className="-mx-6 flex min-h-[calc(100vh-68px)] flex-col gap-6 lg:-mx-20">
      <header className="bg-bg-primary flex flex-col">
        <div className="border-border-light mx-auto flex w-full max-w-[1208px] items-end justify-between border-b py-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-1.5">
              <Link href="/corporate/dashboard" className="text-caption text-text-disabled">
                공고목록
              </Link>
              <ChevronRight className="text-text-disabled size-4" />
              <p className="text-caption text-text-primary">공고상세</p>
            </div>
            <h1 className="text-h2 text-text-secondary">지원자 리스트</h1>
          </div>
          <div className="flex items-center gap-6">
            <SearchField />
            <Button type="button" size="xs" className="h-[42px] rounded-[10px]">
              공고 수정
            </Button>
          </div>
        </div>

        <div className="border-border-light border-b px-20 py-[34px]">
          <div className="mx-auto flex w-full max-w-[1208px] items-center gap-6">
            <SkillScoreFilter />
            <FilterSelect label="컬처핏 스타일" value="전체 스타일" />
            <TechStackFilter />
            <div className="ml-auto flex w-[123px] flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="border-border-default bg-bg-primary h-[42px] rounded-[10px] shadow-none"
              >
                필터 초기화
              </Button>
              <Button type="button" size="xs" className="h-[42px] rounded-[10px]">
                필터 적용
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1208px] flex-col items-end gap-6">
        <ApplicantTable jdId={jdId} />
        <Pagination />
      </main>
    </div>
  );
}
