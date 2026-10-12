import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAnswerAudioFile,
  getBaseAudioMimeType,
  getSupportedAudioMimeType,
  isAudioRecordingSupported,
} from '@/lib/audio-recording';

import { MAX_ANSWER_RECORDING_MS, useAudioRecorder } from '../use-audio-recorder';

// ──────────────────────────────────────────────
// 브라우저 미디어 목
// ──────────────────────────────────────────────

class FakeTrack extends EventTarget {
  readyState: 'live' | 'ended' = 'live';
  stop = vi.fn(() => {
    // 실제 브라우저처럼 stop()은 'ended' 이벤트를 보내지 않는다
    this.readyState = 'ended';
  });
  /** 장치 분리·권한 철회처럼 브라우저가 트랙을 끝낸 경우 */
  endExternally() {
    this.readyState = 'ended';
    this.dispatchEvent(new Event('ended'));
  }
}

class FakeStream {
  tracks = [new FakeTrack()];
  getTracks() {
    return this.tracks;
  }
}

let supportedTypes: string[] = [];
let recorders: FakeMediaRecorder[] = [];
let startShouldFail = false;
let blobSize = 8;

class FakeMediaRecorder {
  static isTypeSupported(type: string) {
    return supportedTypes.includes(type);
  }

  state: 'inactive' | 'recording' = 'inactive';
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  stopCalls = 0;

  constructor(
    public stream: FakeStream,
    options?: { mimeType?: string },
  ) {
    this.mimeType = options?.mimeType ?? '';
    recorders.push(this);
  }

  start() {
    if (startShouldFail) throw new DOMException('fail', 'NotSupportedError');
    this.state = 'recording';
  }

  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.stopCalls += 1;
    const data = new Blob([new Uint8Array(blobSize)], { type: this.mimeType });
    queueMicrotask(() => {
      this.ondataavailable?.({ data });
      this.onstop?.();
    });
  }

  /** stop() 호출 없이 브라우저가 녹음을 끝낸 경우 */
  stopExternally() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob([new Uint8Array(blobSize)], { type: this.mimeType }) });
    this.onstop?.();
  }

  failExternally() {
    this.state = 'inactive';
    this.onerror?.(new Event('error'));
  }
}

const getUserMedia = vi.fn();
let streams: FakeStream[] = [];

function installMedia({ mediaDevices = true, mediaRecorder = true } = {}) {
  vi.stubGlobal('MediaRecorder', mediaRecorder ? FakeMediaRecorder : undefined);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: mediaDevices ? { getUserMedia } : undefined,
  });
}

beforeEach(() => {
  supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  recorders = [];
  streams = [];
  startShouldFail = false;
  blobSize = 8;
  getUserMedia.mockReset();
  getUserMedia.mockImplementation(async () => {
    const stream = new FakeStream();
    streams.push(stream);
    return stream;
  });
  installMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ──────────────────────────────────────────────
// 순수 유틸
// ──────────────────────────────────────────────

describe('getSupportedAudioMimeType (AC1 우선순위)', () => {
  it.each([
    [['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'], 'audio/webm;codecs=opus'],
    [['audio/webm', 'audio/mp4'], 'audio/webm'],
    [['audio/ogg;codecs=opus', 'audio/mp4'], 'audio/ogg;codecs=opus'],
    [['audio/mp4'], 'audio/mp4'],
    [[], null],
  ])('%j → %s', (types, expected) => {
    supportedTypes = types;
    expect(getSupportedAudioMimeType()).toBe(expected);
  });

  it('MediaRecorder가 없으면 null', () => {
    installMedia({ mediaRecorder: false });
    expect(getSupportedAudioMimeType()).toBeNull();
  });
});

describe('isAudioRecordingSupported (AC13 (A))', () => {
  it('getUserMedia와 지원 MIME이 있으면 true', () => {
    expect(isAudioRecordingSupported()).toBe(true);
  });

  it('navigator.mediaDevices가 없으면 false', () => {
    installMedia({ mediaDevices: false });
    expect(isAudioRecordingSupported()).toBe(false);
  });

  it('지원 MIME이 없으면 false', () => {
    supportedTypes = [];
    expect(isAudioRecordingSupported()).toBe(false);
  });
});

describe('createAnswerAudioFile (AC2)', () => {
  it.each([
    ['audio/webm;codecs=opus', 'audio/webm', 'answer.webm'],
    ['audio/ogg;codecs=opus', 'audio/ogg', 'answer.ogg'],
    ['audio/mp4', 'audio/mp4', 'answer.mp4'],
  ])('%s → %s / %s', (mimeType, type, name) => {
    const file = createAnswerAudioFile(new Blob(['a']), mimeType);
    expect(file.type).toBe(type);
    expect(file.name).toBe(name);
  });

  it('알 수 없는 MIME은 audio/webm으로 맞춘다', () => {
    expect(getBaseAudioMimeType('audio/wav')).toBe('audio/webm');
  });
});

// ──────────────────────────────────────────────
// useAudioRecorder
// ──────────────────────────────────────────────

describe('useAudioRecorder', () => {
  it('start 시 audio 스트림을 얻고 우선순위 MIME으로 녹음을 시작한다', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    let startResult: string | undefined;
    await act(async () => {
      startResult = await result.current.start();
    });

    expect(startResult).toBe('started');
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(recorders[0].mimeType).toBe('audio/webm;codecs=opus');
    expect(result.current.status).toBe('recording');
    expect(result.current.isRecording).toBe(true);
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('getUserMedia가 실패하면 failed를 반환한다 (AC13 (B))', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
    const { result } = renderHook(() => useAudioRecorder());

    let startResult: string | undefined;
    await act(async () => {
      startResult = await result.current.start();
    });

    expect(startResult).toBe('failed');
    expect(result.current.status).toBe('idle');
  });

  it('MediaRecorder 시작이 실패하면 얻은 트랙을 정리하고 failed를 반환한다', async () => {
    startShouldFail = true;
    const { result } = renderHook(() => useAudioRecorder());

    let startResult: string | undefined;
    await act(async () => {
      startResult = await result.current.start();
    });

    expect(startResult).toBe('failed');
    expect(streams[0].tracks[0].stop).toHaveBeenCalled();

    // 다시 시도하면 새로 시작한다
    startShouldFail = false;
    await act(async () => {
      startResult = await result.current.start();
    });
    expect(startResult).toBe('started');
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('stop은 Blob·MIME·duration을 반환하고 트랙을 해제한다 (AC2)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false, toFake: ['setTimeout', 'setInterval', 'Date'] });
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(12_400);
    });
    expect(result.current.elapsedSeconds).toBe(12);
    expect(result.current.getElapsedMs()).toBe(12_400);

    let recording: Awaited<ReturnType<typeof result.current.stop>> = null;
    await act(async () => {
      recording = await result.current.stop();
    });

    expect(recording).not.toBeNull();
    expect(recording!.blob.size).toBe(blobSize);
    expect(recording!.mimeType).toBe('audio/webm;codecs=opus');
    expect(recording!.durationMs).toBe(12_400);
    expect(streams[0].tracks.every((track) => track.readyState === 'ended')).toBe(true);
    expect(result.current.status).toBe('idle');
    // stop 후 경과 시간은 유지된다 (cancel 시에만 0)
    expect(result.current.elapsedSeconds).toBe(12);
  });

  it('녹음 중이 아닐 때 stop은 무시하고 null을 반환한다', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    let recording: unknown = 'unset';
    await act(async () => {
      recording = await result.current.stop();
    });

    expect(recording).toBeNull();
  });

  it('stop 두 번 호출 시 두 번째는 무시된다 (AC3 중복 방지)', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });

    let first: unknown;
    let second: unknown;
    await act(async () => {
      [first, second] = await Promise.all([result.current.stop(), result.current.stop()]);
    });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(recorders[0].stopCalls).toBe(1);
  });

  it('120초가 되면 자동 종료하고 onAutoStop을 한 번 호출한다 (AC3)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'Date'] });
    const onAutoStop = vi.fn();
    const { result } = renderHook(() => useAudioRecorder({ onAutoStop }));
    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      vi.advanceTimersByTime(MAX_ANSWER_RECORDING_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onAutoStop).toHaveBeenCalledTimes(1);
    expect(onAutoStop.mock.calls[0][0].blob.size).toBe(blobSize);
    expect(result.current.elapsedSeconds).toBe(120);
    expect(result.current.status).toBe('idle');
    expect(streams[0].tracks[0].readyState).toBe('ended');

    // 자동 종료 후 수동 stop은 무시된다
    let manual: unknown;
    await act(async () => {
      manual = await result.current.stop();
    });
    expect(manual).toBeNull();
  });

  it('cancel은 정지 + 트랙 해제 + 경과 시간 0, 여러 번 호출해도 안전하다 (AC5/AC6)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'Date'] });
    const onAutoStop = vi.fn();
    const { result } = renderHook(() => useAudioRecorder({ onAutoStop }));
    await act(async () => {
      await result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    act(() => {
      result.current.cancel();
      result.current.cancel();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.getElapsedMs()).toBe(0);
    expect(streams[0].tracks[0].readyState).toBe('ended');

    // 취소 후에는 자동 종료가 일어나지 않는다
    await act(async () => {
      vi.advanceTimersByTime(MAX_ANSWER_RECORDING_MS);
      await Promise.resolve();
    });
    expect(onAutoStop).not.toHaveBeenCalled();
  });

  it('stop 대기 중 cancel하면 stop은 null로 끝난다', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });

    let recording: unknown = 'unset';
    await act(async () => {
      const promise = result.current.stop();
      result.current.cancel();
      recording = await promise;
    });

    expect(recording).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('getUserMedia 대기 중 cancel하면 cancelled를 반환하고 스트림을 해제한다', async () => {
    let resolveStream!: (stream: FakeStream) => void;
    getUserMedia.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStream = resolve;
        }),
    );
    const { result } = renderHook(() => useAudioRecorder());

    let promise!: Promise<string>;
    act(() => {
      promise = result.current.start();
    });
    expect(result.current.status).toBe('starting');

    act(() => {
      result.current.cancel();
    });
    const stream = new FakeStream();
    let startResult: string | undefined;
    await act(async () => {
      resolveStream(stream);
      startResult = await promise;
    });

    expect(startResult).toBe('cancelled');
    expect(stream.tracks[0].readyState).toBe('ended');
    expect(recorders).toHaveLength(0);
  });

  it('녹음 후 다시 start하면 새 스트림으로 0:00부터 시작한다', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.stop();
    });
    await act(async () => {
      await result.current.start();
    });

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(recorders).toHaveLength(2);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.status).toBe('recording');
  });

  it('언마운트 시 트랙을 해제한다', async () => {
    const { result, unmount } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });

    unmount();

    expect(streams[0].tracks[0].readyState).toBe('ended');
  });

  describe('녹음 중 예상하지 못한 정지 (AC13 (B))', () => {
    async function startRecording(onInterrupted = vi.fn()) {
      vi.useFakeTimers({ shouldAdvanceTime: false, toFake: ['setTimeout', 'setInterval', 'Date'] });
      const hook = renderHook(() => useAudioRecorder({ onInterrupted }));
      await act(async () => {
        await hook.result.current.start();
      });
      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      expect(hook.result.current.elapsedSeconds).toBe(3);
      return { ...hook, onInterrupted };
    }

    it.each([
      ['트랙 ended', () => streams[0].tracks[0].endExternally()],
      ['MediaRecorder error', () => recorders[0].failExternally()],
      ['MediaRecorder가 스스로 stop', () => recorders[0].stopExternally()],
    ])('%s → idle + 경과 시간 0 + 트랙 해제 + onInterrupted 1회', async (_label, interrupt) => {
      const { result, onInterrupted } = await startRecording();

      act(() => {
        interrupt();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.getElapsedMs()).toBe(0);
      expect(onInterrupted).toHaveBeenCalledTimes(1);
      expect(streams[0].tracks[0].stop).toHaveBeenCalled();

      // 타이머가 정리되어 경과 시간·자동 종료가 더 진행되지 않는다
      act(() => {
        vi.advanceTimersByTime(MAX_ANSWER_RECORDING_MS);
      });
      expect(result.current.elapsedSeconds).toBe(0);

      let recording: unknown = 'unset';
      await act(async () => {
        recording = await result.current.stop();
      });
      expect(recording).toBeNull();
    });

    it('정상 stop()에서는 onInterrupted를 호출하지 않는다', async () => {
      const { result, onInterrupted } = await startRecording();

      await act(async () => {
        await result.current.stop();
      });

      expect(onInterrupted).not.toHaveBeenCalled();
    });

    it('cancel() 이후 늦게 온 ended/error는 무시한다', async () => {
      const { result, onInterrupted } = await startRecording();
      const recorder = recorders[0];
      const track = streams[0].tracks[0];

      act(() => {
        result.current.cancel();
      });
      act(() => {
        track.endExternally();
        recorder.failExternally();
      });

      expect(onInterrupted).not.toHaveBeenCalled();
    });

    it('정지 후 다시 start하면 새 녹음을 시작할 수 있다', async () => {
      const { result } = await startRecording();

      act(() => {
        streams[0].tracks[0].endExternally();
      });
      let startResult: string | undefined;
      await act(async () => {
        startResult = await result.current.start();
      });

      expect(startResult).toBe('started');
      expect(result.current.status).toBe('recording');
    });
  });
});
