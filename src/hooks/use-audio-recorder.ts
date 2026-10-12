'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getSupportedAudioMimeType } from '@/lib/audio-recording';

export { getSupportedAudioMimeType, isAudioRecordingSupported } from '@/lib/audio-recording';

/** 답변 최대 녹음 시간 (AC3) */
export const MAX_ANSWER_RECORDING_MS = 120_000;

const ELAPSED_TICK_MS = 200;

/**
 * - `idle`: 녹음하지 않음
 * - `starting`: 마이크 스트림을 얻는 중
 * - `recording`: 녹음 중
 * - `stopping`: `stop()` 호출 후 마지막 청크(`onstop`)를 기다리는 중
 */
export type AudioRecorderStatus = 'idle' | 'starting' | 'recording' | 'stopping';

/**
 * - `started`: 녹음 시작
 * - `failed`: getUserMedia / MediaRecorder 시작 실패 (AC13 (B))
 * - `cancelled`: 시작 도중 `cancel()`·언마운트로 취소됨 (안내 표시 대상 아님)
 */
export type AudioRecorderStartResult = 'started' | 'failed' | 'cancelled';

export interface AudioRecordingResult {
  blob: Blob;
  /** MediaRecorder가 실제로 쓴 MIME (codecs 포함 가능) */
  mimeType: string;
  durationMs: number;
}

export interface UseAudioRecorderOptions {
  /** 최대 녹음 시간. 기본 120초 */
  maxDurationMs?: number;
  /** 최대 녹음 시간 도달로 자동 종료되었을 때 결과와 함께 호출된다 (AC3) */
  onAutoStop?: (result: AudioRecordingResult) => void;
  /**
   * 녹음 중 `stop()`/`cancel()` 없이 녹음이 끊겼을 때 호출된다
   * (마이크 분리·권한 철회로 트랙 `ended`, `MediaRecorder` `error`/`stop`).
   * 호출 시점에 녹음기는 이미 `idle`이고 청크는 폐기되었다. 화면은 AC13 (B) 안내를 띄운다.
   */
  onInterrupted?: () => void;
}

export interface UseAudioRecorderReturn {
  status: AudioRecorderStatus;
  /** `status === 'recording'` */
  isRecording: boolean;
  /** 경과 시간(초, 내림). `start()` 시 0부터, `cancel()` 시 0으로 돌아간다. `stop()` 후에는 유지된다. */
  elapsedSeconds: number;
  maxDurationMs: number;
  /** 현재 녹음 경과 시간(ms). 녹음 중이 아니면 0. AC5 (a) 클릭 시점 판정용 */
  getElapsedMs: () => number;
  start: () => Promise<AudioRecorderStartResult>;
  /** `MediaRecorder.state === 'recording'`일 때만 동작한다. 그 밖에는 `null`로 resolve한다. */
  stop: () => Promise<AudioRecordingResult | null>;
  /** 정지 + 트랙 해제 + 청크 폐기 + 경과 시간 0. 여러 번 호출해도 안전하다. */
  cancel: () => void;
}

function releaseStream(stream: MediaStream | null, onTrackEnded?: (() => void) | null) {
  stream?.getTracks().forEach((track) => {
    if (onTrackEnded) track.removeEventListener('ended', onTrackEnded);
    try {
      track.stop();
    } catch {
      // 이미 종료된 트랙
    }
  });
}

export function useAudioRecorder({
  maxDurationMs = MAX_ANSWER_RECORDING_MS,
  onAutoStop,
  onInterrupted,
}: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const [status, setStatusState] = useState<AudioRecorderStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const statusRef = useRef<AudioRecorderStatus>('idle');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /** 마이크 트랙 `ended` 리스너. 정리 시 removeEventListener로 해제한다. */
  const trackEndedHandlerRef = useRef<(() => void) | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** start/cancel마다 증가. 오래된 비동기 콜백(getUserMedia, onstop)을 무시하는 데 쓴다. */
  const generationRef = useRef(0);
  const startPromiseRef = useRef<Promise<AudioRecorderStartResult> | null>(null);
  const pendingStopResolveRef = useRef<((result: AudioRecordingResult | null) => void) | null>(
    null,
  );
  const onAutoStopRef = useRef(onAutoStop);
  const onInterruptedRef = useRef(onInterrupted);

  useEffect(() => {
    onAutoStopRef.current = onAutoStop;
    onInterruptedRef.current = onInterrupted;
  }, [onAutoStop, onInterrupted]);

  const setStatus = useCallback((next: AudioRecorderStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, []);

  const getElapsedMs = useCallback(() => {
    if (startedAtRef.current === null) return 0;
    return Math.max(0, Date.now() - startedAtRef.current);
  }, []);

  /** 진행 중인 녹음·스트림을 모두 버린다(상태 갱신 없음). */
  const teardown = useCallback(() => {
    generationRef.current += 1;
    clearTimers();

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // 이미 정지됨
        }
      }
    }

    releaseStream(streamRef.current, trackEndedHandlerRef.current);
    streamRef.current = null;
    trackEndedHandlerRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = null;
    startPromiseRef.current = null;

    const resolvePendingStop = pendingStopResolveRef.current;
    pendingStopResolveRef.current = null;
    resolvePendingStop?.(null);
  }, [clearTimers]);

  const stopInternal = useCallback((): Promise<AudioRecordingResult | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return Promise.resolve(null);

    const generation = generationRef.current;
    const durationMs = getElapsedMs();
    clearTimers();
    setStatus('stopping');

    return new Promise<AudioRecordingResult | null>((resolve) => {
      pendingStopResolveRef.current = resolve;

      recorder.onstop = () => {
        if (generation !== generationRef.current) return;
        pendingStopResolveRef.current = null;

        const mimeType = recorder.mimeType || chunksRef.current[0]?.type || '';
        const blob = new Blob(chunksRef.current, mimeType ? { type: mimeType } : undefined);

        chunksRef.current = [];
        recorderRef.current = null;
        releaseStream(streamRef.current, trackEndedHandlerRef.current);
        streamRef.current = null;
        trackEndedHandlerRef.current = null;
        startedAtRef.current = null;
        setStatus('idle');

        resolve({ blob, mimeType, durationMs });
      };

      try {
        recorder.stop();
      } catch {
        pendingStopResolveRef.current = null;
        teardown();
        setStatus('idle');
        resolve(null);
      }
    });
  }, [clearTimers, getElapsedMs, setStatus, teardown]);

  const start = useCallback((): Promise<AudioRecorderStartResult> => {
    if (statusRef.current === 'recording') return Promise.resolve('started');
    if (startPromiseRef.current) return startPromiseRef.current;

    // 이전 녹음 잔여물(stopping 등)을 정리하고 새로 시작한다.
    teardown();
    const generation = generationRef.current;
    setStatus('starting');
    setElapsedSeconds(0);

    const run = async (): Promise<AudioRecorderStartResult> => {
      let stream: MediaStream | null = null;
      let trackEndedHandler: (() => void) | null = null;

      const fail = (): AudioRecorderStartResult => {
        releaseStream(stream, trackEndedHandler);
        if (generation !== generationRef.current) return 'cancelled';
        setStatus('idle');
        return 'failed';
      };

      try {
        const mimeType = getSupportedAudioMimeType();
        if (!mimeType || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
          return fail();
        }

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (generation !== generationRef.current) {
          releaseStream(stream);
          return 'cancelled';
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        chunksRef.current = [];
        recorder.ondataavailable = (event: BlobEvent) => {
          if (generation !== generationRef.current) return;
          if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
        };
        // 예상하지 못한 정지(트랙 ended, recorder error/stop). stop()은 onstop을 덮어쓰므로
        // 여기 걸린 onstop은 stop()/cancel() 없이 브라우저가 녹음을 끝낸 경우에만 실행된다.
        const handleInterrupted = () => {
          if (generation !== generationRef.current) return;
          if (statusRef.current !== 'recording') return;
          teardown();
          setStatus('idle');
          setElapsedSeconds(0);
          onInterruptedRef.current?.();
        };
        recorder.onstop = handleInterrupted;
        recorder.onerror = handleInterrupted;
        trackEndedHandler = handleInterrupted;
        stream.getTracks().forEach((track) => {
          track.addEventListener('ended', handleInterrupted, { once: true });
        });
        recorder.start();

        streamRef.current = stream;
        trackEndedHandlerRef.current = handleInterrupted;
        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setStatus('recording');

        tickTimerRef.current = setInterval(() => {
          setElapsedSeconds(Math.min(Math.floor(getElapsedMs() / 1000), maxDurationMs / 1000));
        }, ELAPSED_TICK_MS);

        autoStopTimerRef.current = setTimeout(() => {
          autoStopTimerRef.current = null;
          setElapsedSeconds(Math.floor(maxDurationMs / 1000));
          void stopInternal().then((result) => {
            if (result) onAutoStopRef.current?.(result);
          });
        }, maxDurationMs);

        return 'started';
      } catch {
        return fail();
      }
    };

    const promise: Promise<AudioRecorderStartResult> = run().finally(() => {
      if (startPromiseRef.current === promise) startPromiseRef.current = null;
    });
    startPromiseRef.current = promise;
    return promise;
  }, [getElapsedMs, maxDurationMs, setStatus, stopInternal, teardown]);

  const stop = useCallback(() => {
    if (recorderRef.current) {
      setElapsedSeconds(Math.min(Math.floor(getElapsedMs() / 1000), maxDurationMs / 1000));
    }
    return stopInternal();
  }, [getElapsedMs, maxDurationMs, stopInternal]);

  const cancel = useCallback(() => {
    teardown();
    setStatus('idle');
    setElapsedSeconds(0);
  }, [setStatus, teardown]);

  // 언마운트 시 마이크 트랙 해제
  useEffect(() => teardown, [teardown]);

  return {
    status,
    isRecording: status === 'recording',
    elapsedSeconds,
    maxDurationMs,
    getElapsedMs,
    start,
    stop,
    cancel,
  };
}
