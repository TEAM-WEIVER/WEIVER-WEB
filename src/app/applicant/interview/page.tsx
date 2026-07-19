'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { getAccessToken } from '@/lib/auth-token';
import { useInterviewWebSocket } from '@/hooks/use-interview-websocket';
import { useInterviewStore, getRoundLabel } from '@/store/interview-store';

import { InterviewStartScreen } from './_components/interview-start-screen';
import { InterviewQuestionScreen } from './_components/interview-question-screen';
import { InterviewErrorBanner } from './_components/interview-error-banner';
import { InterviewReconnectingBanner } from './_components/interview-reconnecting-banner';

export default function InterviewPage() {
  const router = useRouter();

  const {
    status,
    interviewSessionId,
    currentQuestion,
    currentQuestionCode,
    currentSequence,
    errorMessage,
    reset,
  } = useInterviewStore();

  const roundLabel = getRoundLabel(currentQuestionCode);

  const { connect, submitAnswer } = useInterviewWebSocket();

  // ──────────────────────────────────────────────
  // 핸들러
  // ──────────────────────────────────────────────

  const handleStart = useCallback(() => {
    // 메모리에서 토큰 가져오기
    let token: string | null = getAccessToken();

    // e2e 테스트 지원: accessToken이 메모리에 없으면 localStorage 폴백
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('accessToken');
    }

    connect(token ?? '');
  }, [connect]);

  const handleSubmitAnswer = useCallback(
    (answer: string) => {
      submitAnswer(answer);
    },
    [submitAnswer],
  );

  const handleReturnToDashboard = useCallback(() => {
    reset();
    router.push('/applicant/dashboard');
  }, [reset, router]);

  const handleRetryFromError = useCallback(() => {
    reset();
  }, [reset]);

  // ──────────────────────────────────────────────
  // 렌더
  // ──────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-col gap-4">
        {/* 재연결 배너 — AC6, AC8 */}
        {status === 'RECONNECTING' && <InterviewReconnectingBanner />}

        {/* 에러 배너 — AC5, AC5-a */}
        {status === 'ERROR' && errorMessage && (
          <div className="flex flex-col gap-4">
            <InterviewErrorBanner message={errorMessage} />
            <InterviewStartScreen onStart={handleRetryFromError} isConnecting={false} />
          </div>
        )}

        {/* IDLE / CONNECTING — 면접 시작 화면 */}
        {(status === 'IDLE' || status === 'CONNECTING') && (
          <InterviewStartScreen onStart={handleStart} isConnecting={status === 'CONNECTING'} />
        )}

        {/* SUBSCRIBED — 질문 대기 중 */}
        {status === 'SUBSCRIBED' && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex items-center gap-2">
              <svg
                className="text-primary size-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-text-secondary text-base">
                {currentQuestionCode?.startsWith('S_')
                  ? '곧, 2차 면접이 시작됩니다.'
                  : interviewSessionId
                    ? '첫 질문을 생성 중입니다...'
                    : '면접을 준비 중입니다...'}
              </p>
            </div>
            <button type="button" disabled aria-disabled className="sr-only">
              면접 시작
            </button>
          </div>
        )}

        {/* QUESTION / SUBMITTING / RECONNECTING (질문 표시 유지) — 질문 화면 */}
        {(status === 'QUESTION' ||
          status === 'SUBMITTING' ||
          (status === 'RECONNECTING' && currentQuestion !== null)) &&
          currentQuestion !== null &&
          currentSequence !== null && (
            <InterviewQuestionScreen
              key={currentSequence}
              question={currentQuestion}
              sequence={currentSequence}
              roundLabel={roundLabel}
              isSubmitting={status === 'SUBMITTING' || status === 'RECONNECTING'}
              onSubmit={handleSubmitAnswer}
            />
          )}

        {/* FINISHED — 완료 화면 */}
        {status === 'FINISHED' && (
          <InterviewQuestionScreen
            question="면접이 완료되었어요."
            sequence={currentSequence ?? 0}
            roundLabel={roundLabel}
            isSubmitting={false}
            isFinished
            onSubmit={handleReturnToDashboard}
            onFinish={handleReturnToDashboard}
          />
        )}
      </div>
    </div>
  );
}
