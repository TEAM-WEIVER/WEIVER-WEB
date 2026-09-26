'use client';

import { useState, type FormEvent } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createInquiry } from '@/lib/inquiry-api';

export default function ApplicantInquiryPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) {
      setAlertMessage('문의 제목과 내용을 입력해주세요.');
      return;
    }
    if (trimmedTitle.length > 100 || trimmedContent.length > 2000) {
      setAlertMessage('문의 제목은 100자, 내용은 2,000자 이내로 입력해주세요.');
      return;
    }

    setAlertMessage(null);
    setIsSubmitting(true);

    try {
      await createInquiry({ title: trimmedTitle, content: trimmedContent });
      setTitle('');
      setContent('');
      setAlertMessage('문의가 접수되었습니다.');
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
        <h1 className="text-h1 text-text-secondary">문의</h1>
        <p className="text-body1 text-text-tertiary">
          문의사항을 입력하고 답변을 받을 수 있습니다.
        </p>
      </header>

      <section className="border-border-light bg-bg-primary rounded-lg border px-5 py-[13px]">
        <button
          type="button"
          aria-expanded={isFormOpen}
          aria-controls="inquiry-form"
          onClick={() => setIsFormOpen((current) => !current)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-h3 text-text-secondary">문의사항 작성</span>
          <ChevronDown
            size={24}
            aria-hidden="true"
            className={`text-primary-600 transition-transform ${isFormOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <p className="text-body1 text-text-tertiary mt-2">위버 CS팀으로 문의사항을 전달합니다.</p>

        {isFormOpen ? (
          <form id="inquiry-form" onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="inquiry-title" className="text-body1 text-text-primary">
                문의 제목
              </label>
              <Input
                id="inquiry-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
                aria-label="문의 제목"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="inquiry-content" className="text-body1 text-text-primary">
                문의 내용
              </label>
              <Textarea
                id="inquiry-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={2000}
                rows={8}
                aria-label="문의 내용"
              />
            </div>
            <Button type="submit" size="md" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? '문의 제출 중...' : '문의 제출'}
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
