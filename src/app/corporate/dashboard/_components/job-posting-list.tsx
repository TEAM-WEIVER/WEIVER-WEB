import { MessageSquareText, MoreVertical, Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { JobPostingsDetails } from '@/schemas/corporate/dashboard';

import { getStatusLabel, StatusTag } from './status-tag';

const FILTERS = ['전체', '진행중', '종료', '임시저장'] as const;

type JobPostingListProps = {
  postings: JobPostingsDetails[];
};

export function JobPostingList({ postings }: JobPostingListProps) {
  return (
    <section className="border-border-light bg-bg-primary flex flex-col rounded-[20px] border">
      <div className="flex min-h-[98px] flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-[34px]">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-h3 text-text-secondary">공고 리스트</h2>
          <p className="text-caption text-text-tertiary">
            지금까지 생성한 공고의 목록을 보여줍니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          <div className="bg-bg-tertiary flex rounded-lg p-1">
            {FILTERS.map((filter, index) => (
              <button
                key={filter}
                type="button"
                className={`text-button1 flex h-[42px] w-[84px] items-center justify-center rounded-md ${
                  index === 0 ? 'bg-primary-700 text-white' : 'text-text-tertiary'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <Button asChild size="xs" className="h-[42px] rounded-[10px]">
            <Link href="/corporate/recruitment/new">새 공고 작성</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col">
        {postings.length === 0 ? (
          <div className="border-border-light text-body2 text-text-tertiary flex min-h-[108px] items-center justify-center border-t px-6 py-6 lg:px-[34px]">
            등록된 공고가 없습니다.
          </div>
        ) : (
          postings.map((posting) => (
            <article
              key={posting.jdId}
              className="border-border-light hover:bg-bg-secondary flex min-h-[108px] items-center justify-between border-t px-6 py-6 transition-colors lg:px-[34px]"
            >
              <Link
                href={`/corporate/recruitment/${posting.jdId}`}
                className="flex min-w-0 flex-1 flex-col gap-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <h3 className="text-h4 text-text-primary truncate">{posting.title}</h3>
                  <StatusTag status={posting.status} />
                </div>
                <div className="text-body2 text-text-tertiary flex items-center gap-1.5">
                  <MessageSquareText className="size-[18px] shrink-0 fill-current" />
                  <span className="truncate">
                    {posting.jobCategory} / {posting.detailedJob}
                  </span>
                </div>
              </Link>

              <div className="flex shrink-0 items-center gap-6 sm:gap-[34px]">
                <div className="border-border-default bg-bg-tertiary flex flex-col items-center rounded-lg border p-2 text-center text-black">
                  <p className="text-h4">{posting.newApplicantCount ?? 0}</p>
                  <p className="text-caption">새로운 지원자</p>
                </div>
                <button
                  type="button"
                  aria-label={`${posting.title} ${getStatusLabel(posting.status)} 메뉴`}
                  className="text-primary-700 flex size-6 items-center justify-center"
                >
                  <MoreVertical size={24} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <button
        type="button"
        className="border-border-light bg-bg-tertiary text-body2 text-text-primary flex h-12 items-center justify-between rounded-b-[20px] border-t px-6 lg:px-[34px]"
      >
        공고 리스트 더보기
        <Plus className="size-6" />
      </button>
    </section>
  );
}
