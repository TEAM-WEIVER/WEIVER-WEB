import { useState } from 'react';
import { Plus, Search } from 'lucide-react';

import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PreparationListPageProps = {
  /** 등록 화면 경로 확정 후 페이지를 연결하는 쪽에서 주입한다. */
  onRegister: () => void;
};

/** 공고가 없는 상태의 화면. API 연결 전이며 라우트에는 아직 등록하지 않는다. */
export default function PreparationListPage({ onRegister }: PreparationListPageProps) {
  const [search, setSearch] = useState('');

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
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="border-border-default bg-white pl-11 shadow-sm"
        />
      </div>

      <div className="text-body2 text-text-tertiary flex min-h-[440px] items-center justify-center px-4 text-center">
        <p>
          아직 등록된 채용 공고가 없어요.
          <br />
          공고 등록 버튼을 눌러 공고를 등록해주세요.
        </p>
      </div>
    </main>
  );
}
