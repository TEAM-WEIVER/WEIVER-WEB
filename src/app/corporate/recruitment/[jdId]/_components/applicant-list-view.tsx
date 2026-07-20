'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useApplicants } from '@/hooks/corporate/use-applicant';
import { cn } from '@/lib/utils';
import type { ApplicantListItem, ApplicantListResponse } from '@/schemas/corporate/applicant';

import {
  addTechStackFilter,
  createDefaultApplicantFilterDraft,
  CULTURE_STYLE_OPTIONS,
  MAX_TECH_STACK_FILTERS,
  removeTechStackFilter,
  toAppliedApplicantFilters,
  type ApplicantFilterDraft,
  type CultureStyleOption,
} from './applicant-list-filter.utils';
import { ApplicantContactButton } from './applicant-contact-button';

const APPLICANTS_PAGE_SIZE = 6;

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

function SearchField({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <label className="border-border-light bg-bg-tertiary text-text-disabled flex h-[42px] w-[332px] items-center gap-3.5 rounded-xl border px-5">
      <Search size={18} />
      <input
        aria-label="지원자 검색"
        placeholder="지원자 검색..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit();
          }
        }}
        className="text-body2 text-text-primary placeholder:text-text-disabled min-w-0 flex-1 bg-transparent outline-none"
      />
    </label>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: CultureStyleOption;
  options: readonly CultureStyleOption[];
  onChange: (value: CultureStyleOption) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  return (
    <label ref={rootRef} className="relative flex w-[240px] min-w-0 flex-col gap-2">
      <span className="text-body2 text-text-primary">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="border-border-light bg-bg-secondary text-body2 text-text-primary flex h-12 w-full items-center justify-between rounded-lg border px-5"
        onClick={() => setIsOpen((next) => !next)}
      >
        {value}
        <ChevronDown className="text-primary-600 size-6" />
      </button>
      {isOpen && (
        <div
          role="listbox"
          className="border-border-light bg-bg-primary absolute top-[78px] right-0 left-0 z-30 overflow-hidden rounded-lg border shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
        >
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'text-body2 text-text-primary hover:bg-bg-tertiary flex h-10 w-full items-center justify-between px-5 text-left',
                  isSelected && 'bg-bg-tertiary',
                )}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
                {isSelected && <Check className="text-primary-600 size-4" />}
              </button>
            );
          })}
        </div>
      )}
    </label>
  );
}

function SkillScoreFilter({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
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
          <div
            className="bg-primary-700 absolute top-[5px] left-0 h-2 rounded-full"
            style={{ width: `${value}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            aria-label="스킬핏 최소 점수"
            className="absolute inset-0 h-[18px] w-full cursor-pointer opacity-0"
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <div
            className="bg-primary-700 border-bg-primary pointer-events-none absolute top-px size-4 rounded-full border-2"
            style={{ left: `calc(${value}% - 8px)` }}
          />
        </div>
        <p className="text-caption text-text-primary w-8">{value}점</p>
      </div>
    </div>
  );
}

function TechStackFilter({
  techStacks,
  onChange,
}: {
  techStacks: string[];
  onChange: (techStacks: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const addDraft = () => {
    const nextTechStacks = addTechStackFilter(techStacks, draft);
    if (nextTechStacks === techStacks) return;

    onChange(nextTechStacks);
    setDraft('');
  };

  return (
    <div className="flex w-[473px] flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-body2 text-text-primary">기술 스택</p>
        <p className="text-caption text-text-disabled">
          공백 클릭 후 Enter하여 추가 (최대 3개 추가 가능)
        </p>
      </div>
      <div className="border-border-light bg-bg-secondary flex h-12 items-center gap-2 rounded-lg border p-3">
        {techStacks.map((techStack) => (
          <button
            key={techStack}
            type="button"
            className="text-body2 border-border-default bg-primary-200 text-text-primary flex h-7 items-center gap-1.5 rounded-md border px-2"
            onClick={() => onChange(removeTechStackFilter(techStacks, techStack))}
          >
            {techStack}
            <X className="text-primary-500 size-3.5" />
          </button>
        ))}
        {techStacks.length < MAX_TECH_STACK_FILTERS && (
          <input
            value={draft}
            aria-label="기술 스택 필터"
            placeholder={techStacks.length > 0 ? '' : '기술 스택 입력'}
            className="text-body2 text-text-primary placeholder:text-text-disabled min-w-[120px] flex-1 bg-transparent outline-none"
            onChange={(event) => setDraft(event.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(event) => {
              if (isComposing || event.nativeEvent.isComposing) return;

              if (event.key === 'Enter') {
                event.preventDefault();
                addDraft();
              }
              if (event.key === 'Escape') {
                setDraft('');
              }
            }}
            onBlur={() => {
              if (!isComposing) addDraft();
            }}
          />
        )}
      </div>
    </div>
  );
}

function ApplicantAvatar({
  profileImageUrl,
  applicantName,
}: {
  profileImageUrl?: string | null;
  applicantName: string;
}) {
  if (profileImageUrl) {
    return (
      <div
        className="size-[54px] shrink-0 rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url(${profileImageUrl})` }}
        aria-label={`${applicantName} 프로필 이미지`}
        role="img"
      />
    );
  }

  return <div className="size-[54px] shrink-0 rounded-full bg-[#d9d9d9]" aria-hidden />;
}

function ScoreBar({ score }: { score?: number | null }) {
  const normalizedScore = Math.min(Math.max(score ?? 0, 0), 100);

  return (
    <div className="flex items-center gap-3">
      <p className="text-body1 text-text-secondary w-10">{normalizedScore}점</p>
      <div className="bg-bg-tertiary h-2 w-[120px] rounded-full">
        <div className="bg-primary-700 h-2 rounded-full" style={{ width: `${normalizedScore}%` }} />
      </div>
    </div>
  );
}

function ApplicantTableSkeleton() {
  return (
    <>
      {Array.from({ length: APPLICANTS_PAGE_SIZE }, (_, index) => (
        <div key={index} className="grid animate-pulse grid-cols-[174px_220px_220px_423px_171px]">
          {Array.from({ length: 5 }, (_, cellIndex) => (
            <div
              key={cellIndex}
              className={cn(
                'border-border-light bg-bg-primary flex h-[82px] items-center border-b px-6',
                cellIndex === 0 && 'border-l',
                cellIndex === 4 && 'border-r',
                index === APPLICANTS_PAGE_SIZE - 1 && cellIndex === 0 && 'rounded-bl-[20px]',
                index === APPLICANTS_PAGE_SIZE - 1 && cellIndex === 4 && 'rounded-br-[20px]',
              )}
            >
              <div className="bg-bg-tertiary h-5 w-full rounded" />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function ApplicantTableMessage({ message }: { message: string }) {
  return (
    <div className="border-border-light bg-bg-primary flex h-[246px] items-center justify-center rounded-b-[20px] border-x border-b">
      <p className="text-body1 text-text-tertiary">{message}</p>
    </div>
  );
}

function ApplicantTable({
  jdId,
  applicants,
  isLoading,
  error,
}: {
  jdId: number;
  applicants: ApplicantListItem[];
  isLoading: boolean;
  error: Error | null;
}) {
  const hasApplicants = applicants.length > 0;

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

        {isLoading && <ApplicantTableSkeleton />}
        {!isLoading && error && (
          <ApplicantTableMessage message="지원자 정보를 불러오지 못했습니다." />
        )}
        {!isLoading && !error && !hasApplicants && (
          <ApplicantTableMessage message="아직 지원자가 없습니다." />
        )}

        {!isLoading &&
          !error &&
          applicants.map((applicant, index) => {
            const isLast = index === applicants.length - 1;
            const cultureTags = applicant.cultureTags ?? [];
            const techStacks = applicant.techStacks ?? [];

            return (
              <div
                key={applicant.publicId}
                className="relative grid grid-cols-[174px_220px_220px_423px_171px]"
              >
                <Link
                  href={`/corporate/recruitment/${jdId}/applicants/${applicant.publicId}/report`}
                  aria-label={`${applicant.applicantName} 상세 리포트 보기`}
                  className="absolute inset-0 z-10"
                />
                <div
                  className={cn(
                    'border-border-light bg-bg-primary flex h-[82px] items-center border-b border-l px-6',
                    isLast && 'rounded-bl-[20px]',
                  )}
                >
                  <div className="flex items-center gap-4">
                    <ApplicantAvatar
                      profileImageUrl={applicant.profileImageUrl}
                      applicantName={applicant.applicantName}
                    />
                    <div className="flex flex-col gap-1.5">
                      <p className="text-body1 text-text-secondary">{applicant.applicantName}</p>
                      <Tag variant="info">{applicant.position ?? '경력 정보 없음'}</Tag>
                    </div>
                  </div>
                </div>
                <div className="border-border-light bg-bg-primary flex h-[82px] items-center border-b px-6">
                  <ScoreBar score={applicant.skillScore} />
                </div>
                <div className="border-border-light bg-bg-primary flex h-[82px] items-center border-b px-6">
                  <div className="flex flex-col gap-1">
                    <p className="text-body1 text-text-secondary">
                      {applicant.cultureStyle ?? '-'}
                    </p>
                    <p className="text-caption text-text-tertiary">
                      {cultureTags.length > 0 ? cultureTags.join(' + ') : '-'}
                    </p>
                  </div>
                </div>
                <div className="border-border-light bg-bg-primary flex h-[82px] items-center border-b px-6">
                  <div className="flex flex-wrap gap-1.5">
                    {techStacks.length > 0 ? (
                      techStacks.map((stack) => <Tag key={stack}>{stack}</Tag>)
                    ) : (
                      <p className="text-body2 text-text-tertiary">-</p>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    'border-border-light bg-bg-primary relative z-20 flex h-[82px] items-center justify-center border-r border-b px-6',
                    isLast && 'rounded-br-[20px]',
                  )}
                >
                  <ApplicantContactButton jdId={jdId} applicantPublicId={applicant.publicId} />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function createPageItems(totalPages: number, currentPage: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const lastPage = totalPages - 1;
  const pages = new Set([0, currentPage - 1, currentPage, currentPage + 1, lastPage]);
  const visiblePages = [...pages]
    .filter((page) => page >= 0 && page <= lastPage)
    .sort((a, b) => a - b);

  return visiblePages.flatMap((page, index) => {
    const previousPage = visiblePages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      return [`ellipsis-${previousPage}-${page}`, page] as const;
    }
    return [page] as const;
  });
}

function Pagination({
  applicantList,
  currentPage,
  onPageChange,
}: {
  applicantList: ApplicantListResponse | null;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = applicantList?.totalPages ?? 0;
  const pageItems = useMemo(
    () => createPageItems(totalPages, currentPage),
    [totalPages, currentPage],
  );

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={currentPage === 0}
        className="border-border-light bg-bg-primary text-text-secondary disabled:text-text-disabled flex size-8 items-center justify-center rounded border disabled:cursor-not-allowed"
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft size={20} />
      </button>
      {pageItems.map((page) => {
        if (typeof page === 'string') {
          return (
            <span
              key={page}
              className="text-button1 text-text-secondary flex size-8 items-center justify-center"
            >
              ...
            </span>
          );
        }

        const isActive = page === currentPage;

        return (
          <button
            key={page}
            type="button"
            className={cn(
              'border-border-light text-button1 text-text-secondary flex size-8 items-center justify-center rounded border',
              isActive ? 'bg-bg-tertiary' : 'bg-bg-primary',
            )}
            onClick={() => onPageChange(page)}
          >
            {page + 1}
          </button>
        );
      })}
      <button
        type="button"
        aria-label="다음 페이지"
        disabled={currentPage >= totalPages - 1}
        className="border-border-light bg-bg-primary text-text-secondary disabled:text-text-disabled flex size-8 items-center justify-center rounded border disabled:cursor-not-allowed"
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export function ApplicantListView({ jdId }: { jdId: string }) {
  const numericJdId = Number(jdId);
  const isValidJdId = Number.isFinite(numericJdId) && numericJdId > 0;
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [filterDraft, setFilterDraft] = useState<ApplicantFilterDraft>(
    createDefaultApplicantFilterDraft,
  );
  const [appliedFilters, setAppliedFilters] = useState(() =>
    toAppliedApplicantFilters(createDefaultApplicantFilterDraft()),
  );
  const [page, setPage] = useState(0);
  const {
    data: applicantList,
    isLoading,
    error,
  } = useApplicants(numericJdId, {
    keyword,
    skillScoreMin: appliedFilters.skillScoreMin,
    cultureStyle: appliedFilters.cultureStyle,
    techStacks: appliedFilters.techStacks,
    page,
    size: APPLICANTS_PAGE_SIZE,
  });

  const applicants = applicantList?.content ?? [];

  const submitKeyword = () => {
    setKeyword(keywordInput.trim());
    setPage(0);
  };

  const updateFilterDraft = <TKey extends keyof ApplicantFilterDraft>(
    key: TKey,
    value: ApplicantFilterDraft[TKey],
  ) => {
    setFilterDraft((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setKeyword(keywordInput.trim());
    setAppliedFilters(toAppliedApplicantFilters(filterDraft));
    setPage(0);
  };

  const resetFilters = () => {
    const nextDraft = createDefaultApplicantFilterDraft();
    setKeywordInput('');
    setKeyword('');
    setFilterDraft(nextDraft);
    setAppliedFilters(toAppliedApplicantFilters(nextDraft));
    setPage(0);
  };

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
            <SearchField value={keywordInput} onChange={setKeywordInput} onSubmit={submitKeyword} />
            <Button type="button" size="xs" className="h-[42px] rounded-[10px]">
              공고 수정
            </Button>
          </div>
        </div>

        <div className="border-border-light border-b px-20 py-[34px]">
          <div className="mx-auto flex w-full max-w-[1208px] items-center gap-6">
            <SkillScoreFilter
              value={filterDraft.skillScoreMin}
              onChange={(value) => updateFilterDraft('skillScoreMin', value)}
            />
            <FilterSelect
              label="컬처핏 스타일"
              value={filterDraft.cultureStyle}
              options={CULTURE_STYLE_OPTIONS}
              onChange={(value) => updateFilterDraft('cultureStyle', value)}
            />
            <TechStackFilter
              techStacks={filterDraft.techStacks}
              onChange={(techStacks) => updateFilterDraft('techStacks', techStacks)}
            />
            <div className="ml-auto flex w-[123px] flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="border-border-default bg-bg-primary h-[42px] rounded-[10px] shadow-none"
                onClick={resetFilters}
              >
                필터 초기화
              </Button>
              <Button
                type="button"
                size="xs"
                className="h-[42px] rounded-[10px]"
                onClick={applyFilters}
              >
                필터 적용
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1208px] flex-col items-end gap-6">
        <ApplicantTable
          jdId={numericJdId}
          applicants={isValidJdId ? applicants : []}
          isLoading={isValidJdId && isLoading}
          error={isValidJdId ? error : new Error('Invalid job posting id')}
        />
        <Pagination applicantList={applicantList} currentPage={page} onPageChange={setPage} />
      </main>
    </div>
  );
}
