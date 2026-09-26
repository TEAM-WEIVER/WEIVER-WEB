'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getAccessToken } from '@/lib/auth-token';
import { ApiError } from '@/lib/api-client';
import { reportInterviewError, requestInterviewAnalysis } from '@/lib/interview-api';
import { useInterviewWebSocket } from '@/hooks/use-interview-websocket';
import { useInterviewStore, getRoundLabel } from '@/store/interview-store';
import { toast } from '@/store/toast-store';

import { InterviewStartScreen } from './_components/interview-start-screen';
import { InterviewQuestionScreen } from './_components/interview-question-screen';
import { InterviewErrorBanner } from './_components/interview-error-banner';
import { InterviewReconnectingBanner } from './_components/interview-reconnecting-banner';
import { InterviewFinishedScreen } from './_components/interview-finished-screen';
import { InterviewErrorReportModal } from './_components/interview-error-report-modal';

type AnalysisState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; nextAvailableAt: string | null }
  | { status: 'error'; message: string };

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
  const hasCurrentQuestion = currentQuestion !== null && currentSequence !== null;

  const { connect, submitAnswer } = useInterviewWebSocket();
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: 'idle' });
  const [isErrorReportOpen, setIsErrorReportOpen] = useState(false);
  const [isReportingError, setIsReportingError] = useState(false);
  const [errorReportMessage, setErrorReportMessage] = useState<string | null>(null);
  const analysisRequestedSessionIdsRef = useRef(new Set<string>());

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

  const handleRequestAnalysis = useCallback(async () => {
    if (
      !interviewSessionId ||
      analysisState.status === 'submitting' ||
      analysisState.status === 'success'
    ) {
      return;
    }
    if (analysisRequestedSessionIdsRef.current.has(interviewSessionId)) return;

    analysisRequestedSessionIdsRef.current.add(interviewSessionId);
    setAnalysisState({ status: 'submitting' });

    try {
      const response = await requestInterviewAnalysis(interviewSessionId);
      setAnalysisState({
        status: 'success',
        nextAvailableAt: response.data.next_available_interview_at ?? null,
      });
    } catch (error) {
      if (error instanceof ApiError && error.apiStatus === 'INTERVIEW_ANALYSIS_ALREADY_REQUESTED') {
        setAnalysisState({ status: 'success', nextAvailableAt: null });
        return;
      }

      analysisRequestedSessionIdsRef.current.delete(interviewSessionId);
      setAnalysisState({
        status: 'error',
        message:
          error instanceof ApiError && error.apiStatus === 'INTERVIEW_NOT_FINISHED'
            ? '면접 종료 상태를 확인할 수 없어요. 대시보드로 돌아가 다시 확인해 주세요.'
            : '분석 요청에 실패했어요. 잠시 후 다시 시도해 주세요.',
      });
    }
  }, [analysisState.status, interviewSessionId]);

  const handleRetryAnalysis = useCallback(() => {
    setAnalysisState({ status: 'idle' });
    void handleRequestAnalysis();
  }, [handleRequestAnalysis]);

  const handleReportError = useCallback(
    async (content: string) => {
      if (!interviewSessionId) {
        setErrorReportMessage('면접 세션을 확인할 수 없어 오류 리포트를 보낼 수 없어요.');
        return false;
      }
      if (isReportingError) return false;

      setIsReportingError(true);
      setErrorReportMessage(null);
      try {
        await reportInterviewError(interviewSessionId, content);
        toast.add({ type: 'success', title: '오류 리포트가 접수되었어요.' });
        return true;
      } catch {
        setErrorReportMessage('오류 리포트를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
        return false;
      } finally {
        setIsReportingError(false);
      }
    },
    [interviewSessionId, isReportingError],
  );

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

        {/* SUBSCRIBED — 첫 질문 대기 중 */}
        {status === 'SUBSCRIBED' && !hasCurrentQuestion && (
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

        {/* QUESTION / SUBMITTING / SUBSCRIBED / RECONNECTING — 질문 화면 유지 */}
        {(status === 'QUESTION' ||
          status === 'SUBMITTING' ||
          (status === 'SUBSCRIBED' && hasCurrentQuestion) ||
          (status === 'RECONNECTING' && hasCurrentQuestion)) &&
          hasCurrentQuestion && (
            <InterviewQuestionScreen
              question={currentQuestion}
              sequence={currentSequence}
              roundLabel={roundLabel}
              isSubmitting={status === 'SUBMITTING' || status === 'RECONNECTING'}
              onSubmit={handleSubmitAnswer}
              onReportError={() => {
                setErrorReportMessage(null);
                setIsErrorReportOpen(true);
              }}
            />
          )}

        {/* FINISHED — 완료 화면 */}
        {status === 'FINISHED' && (
          <InterviewFinishedScreen
            isSubmitting={analysisState.status === 'submitting'}
            isSubmitted={analysisState.status === 'success'}
            nextAvailableAt={
              analysisState.status === 'success' ? analysisState.nextAvailableAt : null
            }
            errorMessage={analysisState.status === 'error' ? analysisState.message : null}
            onSubmitAnalysis={() => void handleRequestAnalysis()}
            onRetryAnalysis={handleRetryAnalysis}
            onReportError={() => {
              setErrorReportMessage(null);
              setIsErrorReportOpen(true);
            }}
            onReturnToDashboard={handleReturnToDashboard}
          />
        )}
      </div>
      <InterviewErrorReportModal
        open={isErrorReportOpen}
        isSubmitting={isReportingError}
        submitError={errorReportMessage}
        onClose={() => setIsErrorReportOpen(false)}
        onSubmit={handleReportError}
      />
    </div>
  );
}
