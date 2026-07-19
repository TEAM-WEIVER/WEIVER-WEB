'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Bot, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface InterviewQuestionScreenProps {
  question: string;
  sequence: number;
  roundLabel: string;
  isSubmitting: boolean;
  isFinished?: boolean;
  onSubmit: (answer: string) => void;
  onFinish?: () => void;
}

const MIC_BARS = [
  { h: 8, color: 'bg-slate-400' },
  { h: 16, color: 'bg-slate-500' },
  { h: 24, color: 'bg-slate-600' },
  { h: 32, color: 'bg-slate-700' },
  { h: 24, color: 'bg-slate-600' },
  { h: 16, color: 'bg-slate-500' },
  { h: 8, color: 'bg-slate-400' },
];

export function InterviewQuestionScreen({
  question,
  sequence,
  roundLabel,
  isSubmitting,
  isFinished = false,
  onSubmit,
  onFinish,
}: InterviewQuestionScreenProps) {
  const [answer, setAnswer] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  // page.tsx에서 key={currentSequence}로 remount되므로, 마운트 시 초기값으로 TTS 상태를 설정한다.
  const [isTtsPlaying, setIsTtsPlaying] = useState(() => !isFinished && !!question);
  const [isTtsDone, setIsTtsDone] = useState(false);

  const effectiveVideoMode: 'questioning' | 'listening' = isTtsPlaying ? 'questioning' : 'listening';

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const aiVideoSrc =
    effectiveVideoMode === 'questioning' ? '/interview/questioning.mp4' : '/interview/listening.mp4';

  // 마운트 시 TTS 시작 (question/isFinished는 마운트 후 변경되지 않음 — key로 remount됨)
  useEffect(() => {
    if (!question || isFinished) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(question);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;

    utterance.onend = () => {
      setIsTtsPlaying(false);
      setIsTtsDone(true);
    };

    utterance.onerror = () => {
      setIsTtsPlaying(false);
      setIsTtsDone(true);
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFinished) return;

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        cameraStreamRef.current = stream;
        setCameraStatus('granted');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => setCameraStatus('denied'));

    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [isFinished]);

  useEffect(() => {
    if (cameraStatus === 'granted' && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraStatus]);

  const handleSkipTts = () => {
    window.speechSynthesis.cancel();
    setIsTtsPlaying(false);
    setIsTtsDone(true);
  };

  function handleSubmit() {
    if (isFinished) {
      onFinish?.();
      return;
    }

    if (!answer.trim()) {
      setValidationError('답변을 입력해 주세요.');
      return;
    }
    setValidationError(null);
    onSubmit(answer);
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-50 p-6">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold text-slate-700">
            {isFinished ? '면접이 완료되었어요.' : `${roundLabel}을 진행하고 있어요.`}
          </p>
          <p className="text-sm font-medium text-slate-500">
            {isFinished
              ? '오른쪽 버튼을 클릭해 면접을 완료하세요.'
              : '면접 중에 문제가 생기면 오른쪽 오류 버튼을 클릭해 주세요.'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={isFinished ? onFinish : undefined}
          className={
            isFinished
              ? 'h-10 shrink-0 border-slate-700 bg-slate-700 px-8 text-white hover:bg-slate-800 hover:text-white'
              : 'h-10 shrink-0 border-red-200 bg-[#fbfbfb] px-6 text-red-500 hover:bg-red-50 hover:text-red-600'
          }
        >
          {isFinished ? '면접 완료' : '오류가 있어요'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* AI 면접관 영상 영역 */}
        <section className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
          {aiVideoSrc ? (
            <video
              key={aiVideoSrc}
              src={aiVideoSrc}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Bot size={44} className="text-slate-400" />
              <p className="text-sm font-medium">AI 면접관이 지금 준비중이에요.</p>
            </div>
          )}
        </section>

        {/* 사용자 카메라 영역 */}
        <section className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
          {cameraStatus === 'granted' && !isFinished ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
              <UserRound size={48} className="text-slate-400" />
              <p className="text-sm font-medium">
                {isFinished
                  ? '면접이 종료되어 카메라가 꺼졌어요.'
                  : cameraStatus === 'denied'
                    ? '브라우저 설정에서 카메라 권한을 허용해주세요.'
                    : '카메라를 준비 중입니다.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* 질문 및 답변 영역 */}
      <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-[#fbfbfb] p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-900">
            {isFinished ? roundLabel : `${roundLabel} · 질문 ${sequence}`}
          </span>
          <div className="flex items-center gap-1 text-slate-500">
            <AlertCircle size={14} className="text-slate-400" />
            <span className="text-xs font-normal">
              {isFinished ? '분석이 완료되었어요.' : '음성 및 표정을 분석 중이예요.'}
            </span>
          </div>
        </div>

        <p aria-live="polite" className="text-lg font-semibold whitespace-pre-wrap text-slate-900">
          {question}
        </p>

        {/* TTS 재생 중 안내 */}
        {isTtsPlaying && (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <span className="text-sm text-blue-700">면접관이 질문 중입니다...</span>
            <Button type="button" variant="outline" size="sm" onClick={handleSkipTts}>
              바로 답변하기
            </Button>
          </div>
        )}

        {!isFinished && (
          <div className="flex flex-col gap-2">
            <Textarea
              placeholder={isTtsPlaying ? '질문이 끝난 후 답변을 입력해 주세요.' : '답변을 입력하세요.'}
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (validationError) setValidationError(null);
              }}
              disabled={isSubmitting || isTtsPlaying}
              aria-disabled={isSubmitting || isTtsPlaying}
              aria-invalid={validationError !== null}
              aria-label="답변 입력"
              className="min-h-[140px] resize-none"
            />
            {validationError && (
              <p className="text-sm text-red-500" role="alert">
                {validationError}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex size-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-red-500" />
              </div>
              <div className="flex items-end gap-0.5">
                {MIC_BARS.map((bar, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full ${bar.color}`}
                    style={{ height: `${bar.h}px` }}
                  />
                ))}
              </div>
            </div>
            <span className="text-sm font-medium text-slate-900">
              {isFinished
                ? '면접 응답이 저장되었어요.'
                : isTtsPlaying
                  ? '면접관이 질문하고 있어요.'
                  : '지원자님이 답변을 하고 있어요.'}
            </span>
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isFinished ? false : isSubmitting || isTtsPlaying || !isTtsDone || answer.trim() === ''}
            size="sm"
            className="flex shrink-0 items-center gap-1 bg-slate-200 text-slate-500 hover:bg-slate-300 disabled:opacity-50"
          >
            {isFinished ? '면접 완료' : isSubmitting ? '제출 중...' : '다음 질문'}
            <ArrowRight size={14} />
          </Button>
        </div>
      </section>
    </div>
  );
}
