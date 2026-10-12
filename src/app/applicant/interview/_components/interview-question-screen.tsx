'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AlertCircle, ArrowRight, Loader2, Mic, UserRound, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAudioRecorder, type AudioRecordingResult } from '@/hooks/use-audio-recorder';
import type { AnswerUploadPhase, UploadResult } from '@/hooks/use-answer-audio-upload';

interface InterviewQuestionScreenProps {
  question: string;
  sequence: number;
  roundLabel: string;
  /** 화면 표시 우선순위 2: (store SUBSCRIBED && answerAcceptedKey === 현재 질문 키) || uploadPhase === 'waiting' */
  isWaitingNextQuestion: boolean;
  uploadPhase: AnswerUploadPhase;
  /** 업로드 관련 안내 (AC6~AC11, role="alert") */
  uploadMessage: string | null;
  isFinished?: boolean;
  audioUrl?: string | null;
  audioStatus?: 'READY' | 'UNAVAILABLE' | null;
  /** 녹음 업로드. 'rerecord-required'(AC6)이면 화면이 recorder.cancel() — 수동 제출·120초 자동 종료 공통 */
  onSubmitAudio: (blob: Blob, mimeType: string) => Promise<UploadResult>;
  /** "다시 제출" — 같은 Blob 재업로드. 결과 처리는 onSubmitAudio와 동일 */
  onResubmit: () => Promise<UploadResult>;
  /** "다시 녹음" — 업로드 훅 discardAndRerecord(). 이후 화면이 녹음을 시작한다(cancel() 호출 안 함) */
  onRerecord: () => void;
  /** "답변하기"/"다시 시도" 클릭 시 업로드 안내 지우기 */
  onClearMessage: () => void;
  onFinish?: () => void;
  onReportError?: () => void;
}

/** 녹음 최소 길이 (AC5 (a)) */
const MIN_ANSWER_RECORDING_MS = 1000;

const ANSWER_SCREEN_MESSAGES = {
  recording: '지원자님이 답변을 하고 있어요.',
  processing: '답변을 처리하고 있어요...',
  waiting: '다음 질문을 준비하고 있어요.',
  autoSubmitted: '답변 시간(2분)이 끝나 자동으로 제출했어요.',
  tooShort: '답변이 너무 짧아요. 다시 녹음해 주세요.',
  micUnavailable:
    '마이크를 사용할 수 없어요. 마이크 연결과 브라우저 권한을 확인한 뒤 다시 시도해 주세요.',
} as const;

/** 화면 표시 우선순위 (계획서 공통 규칙). 위에 있을수록 우선한다. */
type AnswerView = 'finished' | 'waiting' | 'uploading' | 'retryable' | 'recording' | 'idle';

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function subscribeNothing() {
  return () => {};
}

function hasMediaDevices() {
  return typeof navigator.mediaDevices?.getUserMedia === 'function';
}

const AI_INTERVIEWER_VIDEOS = {
  questioning: '/interview/questioning.mp4',
  listening: '/interview/listening.mp4',
} as const;

type AiVideoMode = keyof typeof AI_INTERVIEWER_VIDEOS;

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
  isWaitingNextQuestion,
  uploadPhase,
  uploadMessage,
  isFinished = false,
  audioUrl,
  audioStatus,
  onSubmitAudio,
  onResubmit,
  onRerecord,
  onClearMessage,
  onFinish,
  onReportError,
}: InterviewQuestionScreenProps) {
  const questionKey = `${sequence}:${question}`;
  const [cameraStatus, setCameraStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [ttsState, setTtsState] = useState(() => ({
    questionKey,
    isPlaying: !isFinished && !!question,
    isDone: isFinished || !question,
  }));
  const [playBlockedState, setPlayBlockedState] = useState<{
    questionKey: string;
    blocked: boolean;
  }>({ questionKey, blocked: false });
  /** AC5 너무 짧은 녹음 안내 (화면 로컬, role="alert") */
  const [localMessageState, setLocalMessageState] = useState<{
    questionKey: string;
    message: string | null;
  }>({ questionKey, message: null });
  /** AC13 (B) 녹음 시작 실패 여부 */
  const [startErrorState, setStartErrorState] = useState({ questionKey, value: false });
  /** AC3 자동 제출 안내 여부 */
  const [autoSubmittedState, setAutoSubmittedState] = useState({ questionKey, value: false });

  const isTtsPlaying =
    ttsState.questionKey === questionKey ? ttsState.isPlaying : !isFinished && !!question;
  const isTtsDone =
    ttsState.questionKey === questionKey ? ttsState.isDone : isFinished || !question;
  const isPlayBlocked =
    playBlockedState.questionKey === questionKey ? playBlockedState.blocked : false;
  const localMessage =
    localMessageState.questionKey === questionKey ? localMessageState.message : null;
  const hasRecorderStartError =
    startErrorState.questionKey === questionKey ? startErrorState.value : false;
  const isAutoSubmitted =
    autoSubmittedState.questionKey === questionKey ? autoSubmittedState.value : false;

  const isCameraSupported = useSyncExternalStore(subscribeNothing, hasMediaDevices, () => true);
  const effectiveCameraStatus = isCameraSupported ? cameraStatus : 'denied';

  const effectiveVideoMode: AiVideoMode = isTtsPlaying ? 'questioning' : 'listening';

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedViaRef = useRef<'server' | 'fallback' | null>(null);
  const currentQuestionRef = useRef<string>(question);
  const resubmitButtonRef = useRef<HTMLButtonElement>(null);
  const retryMicButtonRef = useRef<HTMLButtonElement>(null);
  const previousQuestionKeyRef = useRef(questionKey);

  const recorder = useAudioRecorder({
    onAutoStop: handleAutoStop,
    onInterrupted: handleRecorderInterrupted,
  });
  const { cancel: cancelRecorder, status: recorderStatus } = recorder;
  const isRecorderActive = recorderStatus === 'recording' || recorderStatus === 'stopping';

  const answerView: AnswerView = isFinished
    ? 'finished'
    : isWaitingNextQuestion
      ? 'waiting'
      : uploadPhase === 'uploading'
        ? 'uploading'
        : uploadPhase === 'retryable'
          ? 'retryable'
          : isRecorderActive
            ? 'recording'
            : 'idle';

  /** 질문 TTS 재생 중(#118)에는 녹음 시작 계열 버튼을 막는다. RECONNECTING과는 무관하다. */
  const isTtsBlockingAnswer = !isFinished && !isTtsDone;
  const isReplayVisible = isTtsDone && (answerView === 'idle' || answerView === 'retryable');
  const showAutoSubmitted = isAutoSubmitted && answerView === 'uploading';
  const alertMessages =
    answerView === 'waiting' || answerView === 'finished'
      ? []
      : [
          uploadMessage,
          localMessage,
          hasRecorderStartError && answerView === 'idle'
            ? ANSWER_SCREEN_MESSAGES.micUnavailable
            : null,
        ].filter((message): message is string => !!message);

  // 최신 question 값 추적 (fallback TTS 재사용 시 필요)
  useEffect(() => {
    currentQuestionRef.current = question;
  }, [question]);

  // "녹음기 cancel() 호출 시점" 3: 답변 수락 동기화로 대기 화면이 되었을 때 녹음 중이면 업로드 없이 취소한다.
  // (phase 감시 effect 금지 규칙의 명시적 예외 — 녹음기가 recording일 때만 동작)
  useEffect(() => {
    if (isWaitingNextQuestion && recorderStatus === 'recording') {
      cancelRecorder();
    }
  }, [isWaitingNextQuestion, recorderStatus, cancelRecorder]);

  // 질문 키가 바뀌면 이전 질문의 녹음을 버린다 (AC4 QUESTION_READY — 경과 시간 초기화)
  useEffect(() => {
    if (previousQuestionKeyRef.current === questionKey) return;
    previousQuestionKeyRef.current = questionKey;
    if (recorderStatus !== 'idle') cancelRecorder();
  }, [questionKey, recorderStatus, cancelRecorder]);

  // 접근성: retryable 진입 시 "다시 제출", AC13 (B) 안내 시 "다시 시도"로 포커스 이동
  useEffect(() => {
    if (answerView === 'retryable') resubmitButtonRef.current?.focus();
  }, [answerView]);

  useEffect(() => {
    if (answerView === 'idle' && hasRecorderStartError) retryMicButtonRef.current?.focus();
  }, [answerView, hasRecorderStartError]);

  // Audio 객체 unmount 정리
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.src = '';
    };
  }, []);

  // 질문이 교체될 때 TTS 로직 실행 (서버 TTS 또는 speechSynthesis 폴백)
  useEffect(() => {
    let isCurrentQuestion = true;

    // 이전 오디오 중단
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = '';
    audioRef.current = null;
    playedViaRef.current = null;

    window.speechSynthesis.cancel();

    if (!question || isFinished) {
      return () => {
        isCurrentQuestion = false;
        window.speechSynthesis.cancel();
      };
    }

    const fallbackToSpeechSynthesis = () => {
      if (!isCurrentQuestion) return;

      audioRef.current?.pause();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(currentQuestionRef.current);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;

      let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

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
        fallbackTimer = setTimeout(
          finishTts,
          Math.min(Math.max(currentQuestionRef.current.length * 160, 4000), 30000),
        );
      } catch {
        finishTts();
      }

      playedViaRef.current = 'fallback';
    };

    // 서버 TTS 재생 (READY 상태이고 audio_url이 있을 때)
    if (audioStatus === 'READY' && audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      playedViaRef.current = 'server';

      let canplayTimer: ReturnType<typeof setTimeout> | null = null;
      let fallbackCalled = false;

      const triggerFallback = () => {
        if (fallbackCalled || !isCurrentQuestion) return;
        fallbackCalled = true;
        if (canplayTimer) {
          clearTimeout(canplayTimer);
          canplayTimer = null;
        }
        audio.pause();
        fallbackToSpeechSynthesis();
      };

      audio.onerror = () => {
        triggerFallback();
      };

      audio.onended = () => {
        if (!isCurrentQuestion) return;
        setTtsState({ questionKey, isPlaying: false, isDone: true });
      };

      // 5초 canplay 타임아웃
      canplayTimer = setTimeout(() => {
        triggerFallback();
      }, 5000);

      audio.addEventListener(
        'canplay',
        () => {
          if (canplayTimer) {
            clearTimeout(canplayTimer);
            canplayTimer = null;
          }
        },
        { once: true },
      );

      audio.play().catch((e: Error) => {
        if (e.name === 'NotAllowedError') {
          // Safari 자동재생 차단
          setTtsState((prev) =>
            prev.questionKey === questionKey ? { ...prev, isPlaying: false } : prev,
          );
          setPlayBlockedState({ questionKey, blocked: true });
        } else {
          triggerFallback();
        }
      });
    } else {
      // UNAVAILABLE / null → 브라우저 TTS 폴백
      fallbackToSpeechSynthesis();
    }

    return () => {
      isCurrentQuestion = false;
      window.speechSynthesis.cancel();
    };
  }, [isFinished, question, questionKey, audioUrl, audioStatus]);

  useEffect(() => {
    if (isFinished) return;
    // navigator.mediaDevices가 없으면 호출하지 않는다(표시는 effectiveCameraStatus = denied)
    if (!hasMediaDevices()) return;

    // 언마운트·종료 이후 늦게 resolve된 스트림은 즉시 정지한다 (카메라 표시등 누수 방지)
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        setCameraStatus('granted');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        if (!cancelled) setCameraStatus('denied');
      });

    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [isFinished]);

  useEffect(() => {
    if (cameraStatus === 'granted' && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraStatus]);

  function handleReplay() {
    if (playedViaRef.current === 'server' && audioRef.current) {
      // 재생 중이면 먼저 중단 후 처음부터 재시작
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      setTtsState({ questionKey, isPlaying: true, isDone: false });

      audioRef.current.play().catch((e: Error) => {
        if (e.name === 'NotAllowedError') {
          setTtsState({ questionKey, isPlaying: false, isDone: false });
          setPlayBlockedState({ questionKey, blocked: true });
        } else {
          // 만료된 URL 등 오류 시 폴백
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(currentQuestionRef.current);
          utterance.lang = 'ko-KR';
          utterance.rate = 0.9;
          utterance.onend = () => setTtsState({ questionKey, isPlaying: false, isDone: true });
          utterance.onerror = () => setTtsState({ questionKey, isPlaying: false, isDone: true });
          window.speechSynthesis.speak(utterance);
          playedViaRef.current = 'fallback';
        }
      });

      audioRef.current.onended = () => {
        setTtsState({ questionKey, isPlaying: false, isDone: true });
      };
    } else {
      // 폴백 경로: speechSynthesis 재실행
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestionRef.current);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      utterance.onend = () => setTtsState({ questionKey, isPlaying: false, isDone: true });
      utterance.onerror = () => setTtsState({ questionKey, isPlaying: false, isDone: true });

      setTtsState({ questionKey, isPlaying: true, isDone: false });

      window.speechSynthesis.speak(utterance);
    }
  }

  function handleManualPlay() {
    if (!audioRef.current) return;

    audioRef.current.play().catch(() => {
      // 수동 재생도 실패 시 speechSynthesis 폴백
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestionRef.current);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      utterance.onend = () => setTtsState({ questionKey, isPlaying: false, isDone: true });
      utterance.onerror = () => setTtsState({ questionKey, isPlaying: false, isDone: true });
      setTtsState({ questionKey, isPlaying: true, isDone: false });
      window.speechSynthesis.speak(utterance);
      playedViaRef.current = 'fallback';
    });

    setPlayBlockedState({ questionKey, blocked: false });
    setTtsState({ questionKey, isPlaying: true, isDone: false });

    if (audioRef.current) {
      audioRef.current.onended = () => {
        setTtsState({ questionKey, isPlaying: false, isDone: true });
      };
    }
  }

  /** AC5: 너무 짧은 녹음 — 녹음기 취소(cancel() 호출 시점 1) + 안내. 업로드 훅은 호출하지 않는다. */
  function rejectTooShortRecording(targetQuestionKey: string) {
    cancelRecorder();
    setLocalMessageState({
      questionKey: targetQuestionKey,
      message: ANSWER_SCREEN_MESSAGES.tooShort,
    });
  }

  /** 업로드 결과가 AC6(재녹음 필요)이면 녹음기를 취소해 경과 시간을 0:00으로 되돌린다 (cancel() 호출 시점 2) */
  function applyUploadResult(result: UploadResult) {
    if (result === 'rerecord-required') cancelRecorder();
  }

  async function uploadRecording(
    recording: AudioRecordingResult,
    targetQuestionKey: string,
    isAutoStop: boolean,
  ) {
    if (recording.blob.size === 0) {
      rejectTooShortRecording(targetQuestionKey);
      return;
    }
    setAutoSubmittedState({ questionKey: targetQuestionKey, value: isAutoStop });
    const result = await onSubmitAudio(recording.blob, recording.mimeType);
    applyUploadResult(result);
  }

  /** AC3: 120초 자동 종료 → 사용자 조작 없이 업로드 */
  function handleAutoStop(recording: AudioRecordingResult) {
    void uploadRecording(recording, questionKey, true);
  }

  /**
   * AC13 (B): 녹음 중 마이크 분리·권한 철회 등으로 녹음이 끊김.
   * 녹음기는 이미 idle이다. 안내와 "다시 시도"를 보여준다.
   */
  function handleRecorderInterrupted() {
    setStartErrorState({ questionKey, value: true });
  }

  /** AC1 녹음 시작 흐름 ("답변하기", "다시 시도", "다시 녹음" 공통) */
  async function startRecording() {
    const targetQuestionKey = questionKey;

    onClearMessage();
    setLocalMessageState({ questionKey: targetQuestionKey, message: null });
    setStartErrorState({ questionKey: targetQuestionKey, value: false });
    setAutoSubmittedState({ questionKey: targetQuestionKey, value: false });

    // 방어적 정리: 질문 오디오 정지
    audioRef.current?.pause();
    window.speechSynthesis.cancel();
    setTtsState({ questionKey: targetQuestionKey, isPlaying: false, isDone: true });

    const result = await recorder.start();
    if (result === 'failed') {
      setStartErrorState({ questionKey: targetQuestionKey, value: true });
    }
  }

  /** AC2 "제출하기" */
  async function handleSubmitRecording() {
    if (recorderStatus !== 'recording') return;
    const targetQuestionKey = questionKey;

    // AC5 (a): 클릭 시점에 1초 미만이면 업로드하지 않는다
    if (recorder.getElapsedMs() < MIN_ANSWER_RECORDING_MS) {
      rejectTooShortRecording(targetQuestionKey);
      return;
    }

    const recording = await recorder.stop();
    if (!recording) {
      // 녹음이 이미 끊긴 경우(stop()이 null): 녹음기를 정리하고 AC13 (B) 안내를 띄운다
      cancelRecorder();
      setStartErrorState({ questionKey: targetQuestionKey, value: true });
      return;
    }
    await uploadRecording(recording, targetQuestionKey, false);
  }

  /** "다시 제출" — 같은 Blob 재업로드 */
  async function handleResubmit() {
    // "안내 메시지 지우는 시점": "다시 제출"을 누르면 안내를 지운다
    onClearMessage();
    setLocalMessageState({ questionKey, message: null });
    setStartErrorState({ questionKey, value: false });
    setAutoSubmittedState({ questionKey, value: false });
    const result = await onResubmit();
    applyUploadResult(result);
  }

  /** "다시 녹음" — Blob 폐기 후 같은 질문에서 새로 녹음 (cancel() 호출 안 함) */
  function handleRerecord() {
    onRerecord();
    void startRecording();
  }

  const primaryButtonClassName =
    'bg-primary-700 text-text-inverse hover:bg-primary-800 disabled:bg-primary-200 disabled:text-text-disabled disabled:hover:bg-primary-200 flex shrink-0 items-center gap-1';
  const secondaryButtonClassName =
    'flex items-center gap-1 border-slate-300 text-slate-600 hover:bg-slate-50';

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
          onClick={isFinished ? onFinish : onReportError}
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
          {answerView === 'recording' && (
            <div
              role="status"
              aria-live="polite"
              className="border-border-light bg-bg-primary text-body2 text-text-primary absolute top-4 left-4 z-10 flex max-w-[calc(100%-32px)] items-center gap-2 rounded-full border px-3.5 py-1.5 shadow-sm"
            >
              <span className="text-error flex items-center gap-1" aria-hidden="true">
                <span className="bg-error size-2 rounded-full" />
                <Mic size={12} strokeWidth={2.2} />
              </span>
              <span className="truncate">{ANSWER_SCREEN_MESSAGES.recording}</span>
            </div>
          )}
          {effectiveCameraStatus === 'granted' && !isFinished ? (
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
                  : effectiveCameraStatus === 'denied'
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

        {alertMessages.map((message) => (
          <p key={message} className="text-sm text-red-500" role="alert">
            {message}
          </p>
        ))}

        {/* 처리 중 / 다음 질문 준비 중 / 자동 제출 안내 */}
        {showAutoSubmitted && (
          <p role="status" className="text-sm text-slate-600">
            {ANSWER_SCREEN_MESSAGES.autoSubmitted}
          </p>
        )}
        {answerView === 'uploading' && (
          <div role="status" className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin text-slate-500" aria-hidden="true" />
            <span>{ANSWER_SCREEN_MESSAGES.processing}</span>
          </div>
        )}
        {answerView === 'waiting' && (
          <div role="status" className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin text-slate-500" aria-hidden="true" />
            <span>{ANSWER_SCREEN_MESSAGES.waiting}</span>
          </div>
        )}

        {/* Safari 자동재생 차단 시 수동 재생 버튼 */}
        {isPlayBlocked && !isFinished && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="질문 음성 재생"
              onClick={handleManualPlay}
              className={secondaryButtonClassName}
            >
              <Volume2 size={14} />
              질문 음성 재생
            </Button>
          </div>
        )}

        {answerView !== 'waiting' && (
          <div className="flex items-center justify-end gap-2">
            {/* 녹음 경과 시간 — 매초 읽히지 않도록 aria-live 영역 밖에 둔다 */}
            {answerView === 'recording' && (
              <span className="mr-auto text-sm font-medium text-slate-600 tabular-nums">
                {`${formatDuration(recorder.elapsedSeconds)} / ${formatDuration(recorder.maxDurationMs / 1000)}`}
              </span>
            )}

            {/* 다시 듣기 버튼 — idle / retryable에서만 (#118 조건) */}
            {isReplayVisible && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="질문 다시 듣기"
                onClick={handleReplay}
                className={secondaryButtonClassName}
              >
                <Volume2 size={14} />
                다시 듣기
              </Button>
            )}

            {answerView === 'finished' && (
              <Button type="button" onClick={onFinish} size="sm" className={primaryButtonClassName}>
                면접 완료
                <ArrowRight size={14} />
              </Button>
            )}

            {answerView === 'idle' &&
              (hasRecorderStartError ? (
                <Button
                  ref={retryMicButtonRef}
                  type="button"
                  onClick={() => void startRecording()}
                  disabled={isTtsBlockingAnswer || recorderStatus === 'starting'}
                  size="sm"
                  className={primaryButtonClassName}
                >
                  다시 시도
                  <ArrowRight size={14} />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void startRecording()}
                  disabled={isTtsBlockingAnswer || recorderStatus === 'starting'}
                  size="sm"
                  className={primaryButtonClassName}
                >
                  답변하기
                  <ArrowRight size={14} />
                </Button>
              ))}

            {answerView === 'recording' && (
              <Button
                type="button"
                onClick={() => void handleSubmitRecording()}
                disabled={recorderStatus !== 'recording'}
                size="sm"
                className={primaryButtonClassName}
              >
                제출하기
                <ArrowRight size={14} />
              </Button>
            )}

            {answerView === 'uploading' && (
              <Button
                type="button"
                disabled
                aria-busy="true"
                size="sm"
                className={primaryButtonClassName}
              >
                제출 중...
                <ArrowRight size={14} />
              </Button>
            )}

            {answerView === 'retryable' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRerecord}
                  disabled={isTtsBlockingAnswer}
                  className={secondaryButtonClassName}
                >
                  다시 녹음
                </Button>
                <Button
                  ref={resubmitButtonRef}
                  type="button"
                  onClick={() => void handleResubmit()}
                  size="sm"
                  className={primaryButtonClassName}
                >
                  다시 제출
                  <ArrowRight size={14} />
                </Button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
