import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInterviewDeviceChecks } from '../use-interview-device-checks';

class Track extends EventTarget {
  enabled = true;
  muted = false;
  readyState = 'live';
  constructor(public deviceId: string) {
    super();
  }
  getSettings() {
    return { deviceId: this.deviceId };
  }
  stop = vi.fn(() => {
    this.readyState = 'ended';
  });
  end() {
    this.readyState = 'ended';
    this.dispatchEvent(new Event('ended'));
  }
  mute() {
    this.muted = true;
    this.dispatchEvent(new Event('mute'));
  }
}

function createStream(kind: 'camera' | 'microphone', id: string = kind) {
  const track = new Track(id);
  return {
    track,
    getTracks: () => [track],
    getVideoTracks: () => (kind === 'camera' ? [track] : []),
    getAudioTracks: () => (kind === 'microphone' ? [track] : []),
  };
}

const getUserMedia = vi.fn();
const enumerateDevices = vi.fn();
const media = new EventTarget();
let sample = 128;
let frameId = 0;
const frames = new Map<number, FrameRequestCallback>();
const contexts: FakeAudioContext[] = [];
class FakeAudioContext {
  state = 'running';
  constructor() {
    contexts.push(this);
  }
  createAnalyser() {
    return {
      fftSize: 256,
      getByteTimeDomainData: (values: Uint8Array) => values.fill(sample),
      disconnect: vi.fn(),
    };
  }
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
}

function nextFrame() {
  const callbacks = [...frames.values()];
  frames.clear();
  act(() => callbacks.forEach((fn) => fn(0)));
}

beforeEach(() => {
  frames.clear();
  contexts.length = 0;
  sample = 128;
  getUserMedia.mockReset();
  enumerateDevices.mockReset().mockResolvedValue([]);
  Object.assign(media, { getUserMedia, enumerateDevices });
  vi.stubGlobal('navigator', { mediaDevices: media });
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    frames.set(++frameId, fn);
    return frameId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => vi.unstubAllGlobals());

describe('useInterviewDeviceChecks', () => {
  it('권한은 자동 요청하지 않고 장비별로 요청하며 종료 시 모두 해제한다', async () => {
    const camera = createStream('camera');
    const microphone = createStream('microphone');
    getUserMedia.mockResolvedValueOnce(camera).mockResolvedValueOnce(microphone);
    const { result, unmount } = renderHook(() => useInterviewDeviceChecks());
    expect(getUserMedia).not.toHaveBeenCalled();
    await act(() => result.current.requestCamera());
    expect(getUserMedia).toHaveBeenNthCalledWith(1, { video: true, audio: false });
    expect(result.current.microphone.status).toBe('idle');
    await act(() => result.current.requestMicrophone());
    expect(getUserMedia).toHaveBeenNthCalledWith(2, { video: false, audio: true });
    expect(result.current.hasSound).toBe(false);
    unmount();
    expect(camera.track.stop).toHaveBeenCalled();
    expect(microphone.track.stop).toHaveBeenCalled();
    expect(contexts[0].close).toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it('권한 허용이나 한 번의 잡음만으로 완료하지 않고 연속 입력을 감지한다', async () => {
    getUserMedia.mockResolvedValue(createStream('microphone'));
    const { result } = renderHook(() => useInterviewDeviceChecks());
    await act(() => result.current.requestMicrophone());
    for (let i = 0; i < 4; i++) nextFrame();
    expect(result.current.hasSound).toBe(false);
    sample = 144;
    nextFrame();
    expect(result.current.hasSound).toBe(false);
    sample = 128;
    nextFrame();
    sample = 144;
    for (let i = 0; i < 3; i++) nextFrame();
    expect(result.current.hasSound).toBe(true);
    expect(result.current.level.current).toBeGreaterThan(0);
  });

  it('마이크가 음소거되면 입력 확인을 무효화하고 다시 소리가 들어오면 복구한다', async () => {
    const microphone = createStream('microphone');
    getUserMedia.mockResolvedValue(microphone);
    const { result } = renderHook(() => useInterviewDeviceChecks());
    await act(() => result.current.requestMicrophone());
    sample = 144;
    for (let i = 0; i < 3; i++) nextFrame();
    expect(result.current.hasSound).toBe(true);
    act(() => microphone.track.mute());
    nextFrame();
    expect(result.current.hasSound).toBe(false);
    expect(result.current.level.current).toBe(0);
    microphone.track.muted = false;
    for (let i = 0; i < 3; i++) nextFrame();
    expect(result.current.hasSound).toBe(true);
  });

  it.each([
    ['NotAllowedError', '접근을 허용'],
    ['NotFoundError', '찾을 수 없어요'],
    ['NotReadableError', '다른 앱이'],
  ])('%s 원인을 안내하고 재시도한다', async (name, text) => {
    getUserMedia
      .mockRejectedValueOnce(new DOMException('failed', name))
      .mockResolvedValueOnce(createStream('camera'));
    const { result } = renderHook(() => useInterviewDeviceChecks());
    await act(() => result.current.requestCamera());
    expect(result.current.camera.status).toBe('error');
    expect(result.current.camera.error).toContain(text);
    await act(() => result.current.requestCamera());
    expect(result.current.camera.status).toBe('ready');
    expect(result.current.camera.error).toBeNull();
  });

  it('권한 응답 대기 중 중복 요청을 막고 이탈 후 늦게 얻은 스트림도 해제한다', async () => {
    let resolve!: (stream: ReturnType<typeof createStream>) => void;
    getUserMedia.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { result, unmount } = renderHook(() => useInterviewDeviceChecks());
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.requestCamera();
    });
    await act(() => result.current.requestCamera());
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    unmount();
    const late = createStream('camera');
    await act(async () => {
      resolve(late);
      await pending;
    });
    expect(late.track.stop).toHaveBeenCalled();
  });

  it('장치 선택은 기존 스트림을 닫고 exact deviceId로 새 장치를 요청한다', async () => {
    const first = createStream('camera');
    const second = createStream('camera', 'external');
    getUserMedia.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { result } = renderHook(() => useInterviewDeviceChecks());
    await act(() => result.current.requestCamera());
    await act(() => result.current.requestCamera('external'));
    expect(first.track.stop).toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenLastCalledWith({
      video: { deviceId: { exact: 'external' } },
      audio: false,
    });
    expect(result.current.camera.deviceId).toBe('external');
  });

  it('장비 종료와 devicechange에서 확인 상태를 무효화한다', async () => {
    const camera = createStream('camera');
    const microphone = createStream('microphone');
    getUserMedia.mockResolvedValueOnce(camera).mockResolvedValueOnce(microphone);
    const { result } = renderHook(() => useInterviewDeviceChecks());
    await act(() => result.current.requestCamera());
    await act(() => result.current.requestMicrophone());
    sample = 144;
    for (let i = 0; i < 3; i++) nextFrame();
    act(() => microphone.track.end());
    expect(result.current.microphone.status).toBe('error');
    expect(result.current.hasSound).toBe(false);
    await act(async () => {
      media.dispatchEvent(new Event('devicechange'));
    });
    expect(result.current.camera.status).toBe('error');
    expect(camera.track.stop).toHaveBeenCalled();
  });

  it.each(['ended event', 'stopped track'])(
    '장비 목록 대기 중 끊긴 스트림을 완료 상태로 표시하지 않는다 (%s)',
    async (scenario) => {
      const camera = createStream('camera');
      getUserMedia.mockResolvedValue(camera);
      let resolve!: (devices: MediaDeviceInfo[]) => void;
      enumerateDevices.mockReturnValue(
        new Promise((done) => {
          resolve = done;
        }),
      );
      const { result } = renderHook(() => useInterviewDeviceChecks());
      let pending!: Promise<void>;
      await act(async () => {
        pending = result.current.requestCamera();
      });
      expect(result.current.camera.status).toBe('requesting');
      act(() => {
        if (scenario === 'ended event') camera.track.end();
        else camera.track.stop();
      });
      await act(async () => {
        resolve([]);
        await pending;
      });
      expect(result.current.camera.status).toBe('error');
      expect(result.current.camera.stream).toBeNull();
      expect(camera.track.stop).toHaveBeenCalled();
    },
  );

  it('분석 초기화가 실패해도 스트림과 AudioContext를 정리한다', async () => {
    const microphone = createStream('microphone');
    getUserMedia.mockResolvedValue(microphone);
    vi.spyOn(FakeAudioContext.prototype, 'createAnalyser').mockImplementationOnce(() => {
      throw new Error('unsupported');
    });
    const { result } = renderHook(() => useInterviewDeviceChecks());
    await act(() => result.current.requestMicrophone());
    expect(result.current.microphone.status).toBe('error');
    expect(microphone.track.stop).toHaveBeenCalled();
    expect(contexts[0].close).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('지원하지 않는 환경은 권한 요청 없이 안내한다', async () => {
    vi.stubGlobal('isSecureContext', false);
    const { result } = renderHook(() => useInterviewDeviceChecks());
    await act(() => result.current.requestCamera());
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(result.current.camera.status).toBe('error');
  });

  it('StrictMode의 초기 정리 후에도 새 장비를 요청할 수 있다', async () => {
    getUserMedia.mockResolvedValue(createStream('camera'));
    const { result } = renderHook(() => useInterviewDeviceChecks(), { wrapper: StrictMode });
    await act(() => result.current.requestCamera());
    expect(result.current.camera.status).toBe('ready');
  });
});
