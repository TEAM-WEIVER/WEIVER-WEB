'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Mic, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface InterviewQuestionScreenProps {
  question: string;
  sequence: number;
  roundLabel: string;
  isSubmitting: boolean;
  isFinished?: boolean;
  onSubmit: (answer: string) => void;
  onFinish?: () => void;
}

const AI_INTERVIEWER_VIDEOS = {
  questioning: '/interview/questioning.mp4',
  listening: '/interview/listening.mp4',
} as const;

type AiVideoMode = keyof typeof AI_INTERVIEWER_VIDEOS;

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: {
    readonly transcript: string;
  };
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

function AiInterviewerVideo({ mode }: { mode: AiVideoMode }) {
  return (
    <>
      {(Object.entries(AI_INTERVIEWER_VIDEOS) as Array<[AiVideoMode, string]>).map(
        ([videoMode, src]) => (
          <video
            key={videoMode}
            src={src}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden={mode !== videoMode}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${
              mode === videoMode ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ),
      )}
    </>
  );
}

export function InterviewQuestionScreen({
  question,
  sequence,
  roundLabel,
  isSubmitting,
  isFinished = false,
  onSubmit,
  onFinish,
}: InterviewQuestionScreenProps) {
  const questionKey = `${sequence}:${question}`;
  const [answerState, setAnswerState] = useState({ questionKey, value: '' });
  const [interimAnswerState, setInterimAnswerState] = useState({ questionKey, value: '' });
  const [validationErrorState, setValidationErrorState] = useState<{
    questionKey: string;
    message: string | null;
  }>({ questionKey, message: null });
  const [cameraStatus, setCameraStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [ttsState, setTtsState] = useState(() => ({
    questionKey,
    isPlaying: !isFinished && !!question,
    isDone: isFinished || !question,
  }));
  const [listeningState, setListeningState] = useState({
    questionKey,
    isListening: false,
    hasStarted: false,
  });

  const finalAnswer = answerState.questionKey === questionKey ? answerState.value : '';
  const interimAnswer =
    interimAnswerState.questionKey === questionKey ? interimAnswerState.value : '';
  const answer = `${finalAnswer}${interimAnswer ? ` ${interimAnswer}` : ''}`.trim();
  const validationError =
    validationErrorState.questionKey === questionKey ? validationErrorState.message : null;
  const isTtsPlaying =
    ttsState.questionKey === questionKey ? ttsState.isPlaying : !isFinished && !!question;
  const isTtsDone =
    ttsState.questionKey === questionKey ? ttsState.isDone : isFinished || !question;
  const isListening =
    listeningState.questionKey === questionKey ? listeningState.isListening : false;
  const hasStartedAnswering =
    listeningState.questionKey === questionKey ? listeningState.hasStarted : false;
  const isActionButtonDisabled =
    isSubmitting || (!isFinished && !hasStartedAnswering && !isTtsDone);

  const effectiveVideoMode: AiVideoMode = isTtsPlaying ? 'questioning' : 'listening';

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recognitionQuestionKeyRef = useRef(questionKey);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // STT 초기화
  useEffect(() => {
    const speechWindow = window as WindowWithSpeechRecognition;
    const SpeechRecognitionAPI =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      const currentQuestionKey = recognitionQuestionKeyRef.current;
      if (finalText) {
        setAnswerState((prev) => ({
          questionKey: currentQuestionKey,
          value: prev.questionKey === currentQuestionKey ? prev.value + finalText : finalText,
        }));
      }
      setInterimAnswerState({ questionKey: currentQuestionKey, value: interimText });
    };

    recognition.onend = () => {
      const currentQuestionKey = recognitionQuestionKeyRef.current;
      setListeningState({ questionKey: currentQuestionKey, isListening: false, hasStarted: true });
    };

    recognition.onerror = () => {
      const currentQuestionKey = recognitionQuestionKeyRef.current;
      setListeningState({ questionKey: currentQuestionKey, isListening: false, hasStarted: true });
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  // 질문이 교체될 때 답변 영역만 초기화하고, 카메라/레이아웃은 유지한다.
  useEffect(() => {
    let isCurrentQuestion = true;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    recognitionRef.current?.abort();

    window.speechSynthesis.cancel();

    if (!question || isFinished) {
      return () => {
        isCurrentQuestion = false;
        window.speechSynthesis.cancel();
      };
    }

    const utterance = new SpeechSynthesisUtterance(question);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;

    const finishTts = () => {
      if (!isCurrentQuestion) return;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      setTtsState({ questionKey, isPlaying: false, isDone: true });
    };

    utterance.onend = finishTts;
    utterance.onerror = finishTts;

    try {
      window.speechSynthesis.speak(utterance);
      fallbackTimer = setTimeout(finishTts, Math.min(Math.max(question.length * 160, 4000), 30000));
    } catch {
      finishTts();
    }

    return () => {
      isCurrentQuestion = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      window.speechSynthesis.cancel();
    };
  }, [isFinished, question, questionKey]);

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

  function startListening() {
    if (isListening) return;

    if (!recognitionRef.current) {
      setValidationErrorState({
        questionKey,
        message: '이 브라우저에서는 음성 인식을 지원하지 않아요.',
      });
      return;
    }

    try {
      recognitionQuestionKeyRef.current = questionKey;
      recognitionRef.current.start();
      setValidationErrorState({ questionKey, message: null });
      setListeningState({ questionKey, isListening: true, hasStarted: true });
    } catch {
      setValidationErrorState({
        questionKey,
        message: '음성 인식을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.',
      });
    }
  }

  function stopListening() {
    if (!recognitionRef.current || !isListening) return;
    recognitionRef.current.stop();
    setListeningState({ questionKey, isListening: false, hasStarted: true });
  }

  function handleActionButton() {
    if (isFinished) {
      onFinish?.();
      return;
    }
    if (hasStartedAnswering) {
      if (isListening) {
        stopListening();
      }
      onSubmit(answer);
      return;
    }
    if (isTtsPlaying || isTtsDone) {
      window.speechSynthesis.cancel();
      setTtsState({ questionKey, isPlaying: false, isDone: true });
      startListening();
    }
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
          <AiInterviewerVideo mode={effectiveVideoMode} />
        </section>

        {/* 사용자 카메라 영역 */}
        <section className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
          {isListening && !isFinished && (
            <div
              role="status"
              aria-live="polite"
              className="border-border-light bg-bg-primary text-body2 text-text-primary absolute top-4 left-4 z-10 flex max-w-[calc(100%-32px)] items-center gap-2 rounded-full border px-3.5 py-1.5 shadow-sm"
            >
              <span className="text-error flex items-center gap-1" aria-hidden="true">
                <span className="bg-error size-2 rounded-full" />
                <Mic size={12} strokeWidth={2.2} />
              </span>
              <span className="truncate">지원자님이 답변을 하고 있어요.</span>
            </div>
          )}
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

        {validationError && (
          <p className="text-sm text-red-500" role="alert">
            {validationError}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleActionButton}
            disabled={isActionButtonDisabled}
            size="sm"
            className="bg-primary-700 text-text-inverse hover:bg-primary-800 disabled:bg-primary-200 disabled:text-text-disabled disabled:hover:bg-primary-200 flex shrink-0 items-center gap-1"
          >
            {isFinished
              ? '면접 완료'
              : isSubmitting
                ? '제출 중...'
                : hasStartedAnswering
                  ? '제출하기'
                  : '답변하기'}
            <ArrowRight size={14} />
          </Button>
        </div>
      </section>
    </div>
  );
}
