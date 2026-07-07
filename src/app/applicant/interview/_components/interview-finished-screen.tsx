'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

interface InterviewFinishedScreenProps {
  onReturnToDashboard: () => void;
}

export function InterviewFinishedScreen({ onReturnToDashboard }: InterviewFinishedScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // AC4: 완료 화면 전환 시 포커스를 결과 영역 헤딩으로 이동
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-h2 text-text-primary outline-none">
          면접 완료
        </h1>
        <p className="text-body2 text-text-secondary max-w-md">
          AI 면접이 완료되었습니다.
          <br />
          수고하셨습니다!
        </p>
      </div>

      <Button type="button" onClick={onReturnToDashboard} className="h-[48px] w-full max-w-[347px]">
        대시보드로 돌아가기
      </Button>
    </div>
  );
}
