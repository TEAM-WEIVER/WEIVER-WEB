import { useState } from 'react';
import { Plus, Search } from 'lucide-react';

import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { JobPostingCard } from '../_components/job-posting-card';
import type { JobPostingSummary } from '../_types/job-posting-detail';

export type PostingListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; postings: JobPostingSummary[] };

type PreparationListPageProps = {
  state: PostingListState;
  onSelectPosting: (id: string) => void;
  onRetry?: () => void;
  /** 등록 화면 경로 확정 후 페이지를 연결하는 쪽에서 주입한다. */
  onRegister: () => void;
};

/** 주어진 목록 안에서 검색한다. 서버 검색/페이지네이션은 API 계약 확정 후 연결한다. */
export default function PreparationListPage({
  state,
  onRegister,
  onSelectPosting,
  onRetry,
}: PreparationListPageProps) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const postings = state.status === 'ready' ? state.postings : [];
  const filtered = postings.filter(
    ({ companyName, positionName }) =>
      companyName.toLocaleLowerCase().includes(query) ||
      positionName.toLocaleLowerCase().includes(query),
  );

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-15">
      <div className="border-border-light flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <SectionHeading
          as="h1"
          title="지원 준비"
          description="지원하고 싶은 채용공고를 등록하고 AI 모의면접을 준비해보세요."
        />
        <Button type="button" onClick={onRegister} className="h-9 gap-1.5 px-3">
          <Plus aria-hidden="true" />
          공고 등록
        </Button>
      </div>

      <div className="relative mt-6 w-full max-w-[480px]">
        <Search
          aria-hidden="true"
          className="text-icon-muted pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />
        <Input
          type="search"
          variant="default"
          aria-label="회사명 또는 포지션명으로 공고 검색"
          placeholder="회사명 또는 포지션명으로 검색"
          disabled={state.status !== 'ready'}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="border-border-default bg-white pl-11 shadow-sm"
        />
      </div>

      {state.status === 'loading' ? (
        <div role="status" aria-label="공고 목록 불러오는 중" className="mt-6 space-y-3">
          <span className="sr-only">공고 목록을 불러오고 있어요.</span>
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-23 w-full rounded-xl" />
          ))}
        </div>
      ) : state.status === 'error' ? (
        <div
          role="alert"
          className="flex min-h-[440px] flex-col items-center justify-center gap-4 text-center"
        >
          <p className="text-body2 text-text-secondary">공고 목록을 불러오지 못했어요.</p>
          <Button type="button" onClick={onRetry} disabled={!onRetry} className="text-sm">
            다시 시도
          </Button>
        </div>
      ) : postings.length === 0 ? (
        <div className="text-body2 text-text-tertiary flex min-h-[440px] items-center justify-center px-4 text-center">
          <p>
            아직 등록된 채용 공고가 없어요.
            <br />
            공고 등록 버튼을 눌러 공고를 등록해주세요.
          </p>
        </div>
      ) : (
        <>
          <p role="status" className="sr-only">
            검색 결과 {filtered.length}개
          </p>
          {filtered.length ? (
            <ul aria-label="등록한 공고" className="mt-6 space-y-3">
              {filtered.map((posting) => (
                <li key={posting.id}>
                  <JobPostingCard posting={posting} onSelect={onSelectPosting} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-[440px] flex-col items-center justify-center gap-3 text-center">
              <SectionHeading
                title="검색 결과가 없어요."
                description="다른 회사명이나 포지션명으로 검색해보세요."
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearch('')}
                className="text-sm"
              >
                검색 초기화
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
