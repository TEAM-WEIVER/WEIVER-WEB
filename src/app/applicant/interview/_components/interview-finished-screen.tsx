'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, MessageCircle, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface InterviewFinishedScreenProps {
  onReportError: () => void;
  onReturnToDashboard: () => void;
}

export function InterviewFinishedScreen({
  onReportError,
  onReturnToDashboard,
}: InterviewFinishedScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-slate-50 p-6">
      <header className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-100 px-6 py-5">
        <div className="flex flex-col gap-1">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl leading-8 font-semibold text-slate-700 outline-none"
          >
            면접이 완료되었어요.
          </h1>
          <p className="text-sm leading-5 font-medium text-slate-500">
            대시보드에서 다음 면접을 진행하거나 결과를 제출할 수 있어요.
          </p>
        </div>
        <Button
          type="button"
          size="xs"
          onClick={onReturnToDashboard}
          className="h-[42px] shrink-0 rounded-[10px] bg-slate-700 px-6 text-white hover:bg-slate-800"
        >
          대시보드로 이동
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[20px] border border-slate-300 bg-slate-200">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <MessageCircle size={48} className="text-slate-400" aria-hidden="true" />
            <p className="text-sm font-medium">AI 면접관이 지금 준비중이예요.</p>
          </div>
        </section>
        <section className="relative aspect-video overflow-hidden rounded-[20px] border border-slate-200 bg-slate-200">
          <video
            src="/interview/listening.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
            aria-label="면접 완료 영상"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10">
            <UserRound size={40} className="text-white/80" aria-hidden="true" />
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-5 rounded-[20px] border border-slate-200 bg-[#fcfcfc] p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-900">
            면접 완료
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onReportError}
            className="h-[42px] rounded-[10px] border-red-500 bg-[#fcfcfc] px-6 text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            오류가 있어요
          </Button>
        </div>
        <p className="text-lg font-semibold text-slate-900">면접이 완료되었어요.</p>

        <p className="text-sm text-slate-500">
          가장 잘 본 면접 결과를 제출하면 31일 동안 면접을 다시 볼 수 없습니다.
        </p>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            size="xs"
            onClick={onReturnToDashboard}
            className="h-[42px] rounded-[10px] bg-slate-700 px-6 text-white hover:bg-slate-800"
          >
            대시보드로 이동
            <ArrowRight size={14} />
          </Button>
        </div>
      </section>
    </main>
  );
}
