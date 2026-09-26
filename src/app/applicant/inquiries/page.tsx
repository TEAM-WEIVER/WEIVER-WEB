import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export default function ApplicantInquiriesPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-text-secondary">문의</h1>
        <p className="text-body1 text-text-tertiary">
          문의사항을 입력하고 답변을 받을 수 있습니다.
        </p>
      </header>
      <Link
        href="/applicant/inquiries/new"
        aria-label="문의사항 작성"
        className="border-border-light bg-bg-primary hover:border-border-default flex flex-col gap-2 rounded-lg border px-5 py-[13px] transition-colors"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-text-secondary">문의사항 작성</h2>
          <ChevronDown className="text-primary-600" size={24} aria-hidden="true" />
        </div>
        <p className="text-body1 text-text-tertiary">위버 CS팀으로 문의사항을 전달합니다.</p>
      </Link>
    </div>
  );
}
