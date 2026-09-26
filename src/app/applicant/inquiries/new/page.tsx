'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createInquiry } from '@/lib/inquiry-api';

export default function ApplicantInquiryPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent)
      return setAlertMessage('문의 제목과 내용을 입력해주세요.');
    if (trimmedTitle.length > 100 || trimmedContent.length > 2000)
      return setAlertMessage('문의 제목은 100자, 내용은 2,000자 이내로 입력해주세요.');
    setAlertMessage(null);
    setIsSubmitting(true);
    try {
      await createInquiry({ title: trimmedTitle, content: trimmedContent });
      setIsCompleteModalOpen(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error && error.message !== 'API request failed'
          ? error.message
          : '문의 전송에 실패했습니다. 다시 시도해주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {alertMessage ? (
        <div
          role="alert"
          aria-label="문의 알림"
          className="bg-primary-900 text-body2 fixed top-6 right-6 z-50 max-w-sm rounded-lg px-5 py-4 text-white shadow-lg"
        >
          {alertMessage}
        </div>
      ) : null}
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-text-secondary">문의사항 작성</h1>
        <p className="text-body1 text-text-tertiary">위버 CS팀으로 문의사항을 전달합니다.</p>
      </header>
      <form
        onSubmit={handleSubmit}
        className="border-border-light bg-bg-primary mx-auto flex w-full max-w-[1062px] flex-col gap-6 rounded-b-[20px] border p-6 sm:p-11"
      >
        <p className="bg-bg-tertiary text-body2 text-text-tertiary rounded-lg px-5 py-3">
          문의사항을 작성해주세요. 작성해주신 문의사항에 대한 답변은 영업일 기준 1~2일 내에 이메일로
          전달드립니다.
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor="inquiry-title" className="text-body1 text-text-primary">
            문의 제목
          </label>
          <Input
            id="inquiry-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            aria-label="문의 제목"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="inquiry-content" className="sr-only">
            문의 내용
          </label>
          <Textarea
            id="inquiry-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={12}
            aria-label="문의 내용"
            placeholder="궁금한 점, 서비스 내 오류, 피드백 등 서비스 이용 중 발생한 문의사항을 무엇이든 작성해주세요."
            className="min-h-[288px]"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="xs" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? '작성 중...' : '작성 완료'}
          </Button>
        </div>
      </form>
      {isCompleteModalOpen ? (
        <div className="bg-primary-900/30 fixed inset-0 z-50 flex items-center justify-center p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-complete-title"
            className="border-border-light bg-bg-primary w-full max-w-[386px] rounded-[20px] border p-6 shadow-[0px_8px_24px_0px_rgba(149,157,165,0.2)]"
          >
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex flex-col gap-2">
                <h2 id="inquiry-complete-title" className="text-h3 text-text-secondary">
                  문의사항이 제출되었습니다.
                </h2>
                <p className="text-body2 text-text-tertiary">
                  영업일 기준 1~2일 내에 이메일로 답변드릴 예정입니다.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => router.replace('/applicant/inquiries')}
              >
                확인
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
