import { useCallback, useEffect, useRef, useState } from 'react';

import { isAudioRecordingSupported } from '@/lib/audio-recording';

export type InterviewDeviceKind = 'camera' | 'microphone';
export type InterviewDeviceState = {
  status: 'idle' | 'requesting' | 'ready' | 'error';
  stream: MediaStream | null;
  deviceId: string;
  devices: MediaDeviceInfo[];
  error: string | null;
};

const initialDevice: InterviewDeviceState = {
  status: 'idle',
  stream: null,
  deviceId: 'default',
  devices: [],
  error: null,
};

function deviceError(error: unknown, kind: InterviewDeviceKind) {
  const name = kind === 'camera' ? '카메라' : '마이크';
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      return `브라우저의 사이트 설정에서 ${name} 접근을 허용한 뒤 다시 확인해주세요.`;
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError')
      return `선택한 ${name}를 찾을 수 없어요. 장비 연결을 확인하거나 다른 장비를 선택해주세요.`;
    if (error.name === 'NotReadableError')
      return `다른 앱이 ${name}를 사용하고 있을 수 있어요. 해당 앱을 닫고 다시 확인해주세요.`;
  }
  return `${name}를 확인하지 못했어요. 장비와 브라우저 설정을 확인한 뒤 다시 시도해주세요.`;
}

/** 준비 중에는 로컬 영상과 음량만 확인한다. 녹화·저장·서버 전송은 하지 않는다. */
export function useInterviewDeviceChecks() {
  const [camera, setCamera] = useState<InterviewDeviceState>(initialDevice);
  const [microphone, setMicrophone] = useState<InterviewDeviceState>(initialDevice);
  const [hasSound, setHasSound] = useState(false);
  const level = useRef(0);
  const generation = useRef({ camera: 0, microphone: 0 });
  const pending = useRef({ camera: false, microphone: false });
  const cleanups = useRef<Partial<Record<InterviewDeviceKind, () => void>>>({});
  const streams = useRef<Partial<Record<InterviewDeviceKind, MediaStream>>>({});
  const mounted = useRef(true);

  const release = useCallback((kind: InterviewDeviceKind) => {
    generation.current[kind] += 1;
    pending.current[kind] = false;
    cleanups.current[kind]?.();
    delete cleanups.current[kind];
    delete streams.current[kind];
    if (kind === 'microphone') level.current = 0;
  }, []);

  const request = useCallback(
    async (kind: InterviewDeviceKind, selectedId = 'default') => {
      if (pending.current[kind] || !mounted.current) return;
      release(kind);
      const id = generation.current[kind];
      const setDevice = kind === 'camera' ? setCamera : setMicrophone;
      if (kind === 'microphone') setHasSound(false);
      if (
        window.isSecureContext === false ||
        typeof navigator.mediaDevices?.getUserMedia !== 'function' ||
        (kind === 'microphone' &&
          (!isAudioRecordingSupported() || typeof AudioContext === 'undefined'))
      ) {
        setDevice((previous) => ({
          ...previous,
          status: 'error',
          stream: null,
          error:
            '장비 확인을 지원하지 않는 환경이에요. 최신 브라우저의 보안 연결에서 다시 접속해주세요.',
        }));
        return;
      }

      pending.current[kind] = true;
      setDevice((previous) => ({
        ...previous,
        status: 'requesting',
        stream: null,
        deviceId: selectedId,
        error: null,
      }));
      let stream: MediaStream | null = null;
      let context: AudioContext | null = null;
      let analyser: AnalyserNode | null = null;
      let source: MediaStreamAudioSourceNode | null = null;
      let frame: number | null = null;
      let ended: (() => void) | null = null;
      let muted: (() => void) | null = null;
      let detected = false;
      let consecutiveSamples = 0;
      const current = () => mounted.current && generation.current[kind] === id;
      const dispose = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        source?.disconnect();
        analyser?.disconnect();
        if (context && context.state !== 'closed') void context.close().catch(() => {});
        stream?.getTracks().forEach((track) => {
          if (ended) track.removeEventListener('ended', ended);
          if (muted) track.removeEventListener('mute', muted);
          track.stop();
        });
      };
      cleanups.current[kind] = dispose;

      try {
        // 권한 응답을 기다리기 전에 사용자 동작 안에서 AudioContext를 재개한다.
        if (kind === 'microphone') {
          context = new AudioContext();
          if (context.state === 'suspended') void context.resume().catch(() => {});
        }
        const constraint = selectedId === 'default' ? true : { deviceId: { exact: selectedId } };
        stream = await navigator.mediaDevices.getUserMedia(
          kind === 'camera'
            ? { video: constraint, audio: false }
            : { video: false, audio: constraint },
        );
        if (!current()) {
          dispose();
          return;
        }
        const tracks = kind === 'camera' ? stream.getVideoTracks() : stream.getAudioTracks();
        const track = tracks.find((item) => item.readyState === 'live' && item.enabled);
        if (!track) throw new DOMException('No live input track', 'NotReadableError');
        ended = () => {
          if (!current()) return;
          release(kind);
          if (kind === 'microphone') setHasSound(false);
          setDevice((previous) => ({
            ...previous,
            status: 'error',
            stream: null,
            error: `${kind === 'camera' ? '카메라' : '마이크'} 연결이 끊겼어요. 다시 연결하고 확인해주세요.`,
          }));
        };
        muted = () => {
          if (!current()) return;
          if (kind === 'camera') {
            ended?.();
            return;
          }
          detected = false;
          consecutiveSamples = 0;
          level.current = 0;
          setHasSound(false);
        };
        tracks.forEach((item) => {
          item.addEventListener('ended', ended!, { once: true });
          item.addEventListener('mute', muted!);
        });

        // 장비 목록 응답을 기다리는 동안에도 연결 종료를 놓치지 않는다.
        streams.current[kind] = stream;
        const devices =
          typeof navigator.mediaDevices.enumerateDevices === 'function'
            ? await navigator.mediaDevices.enumerateDevices().catch(() => [])
            : [];
        if (!current()) {
          dispose();
          return;
        }

        if (track.readyState !== 'live' || !track.enabled) {
          ended();
          return;
        }

        if (context) {
          analyser = context.createAnalyser();
          analyser.fftSize = 256;
          source = context.createMediaStreamSource(stream);
          source.connect(analyser);
          const audioContext = context;
          const audioAnalyser = analyser;
          const samples = new Uint8Array(analyser.fftSize);
          const measure = () => {
            if (!current()) return;
            audioAnalyser.getByteTimeDomainData(samples);
            let sum = 0;
            for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
            const rms = Math.sqrt(sum / samples.length);
            level.current =
              audioContext.state === 'running' && !track.muted && track.enabled
                ? Math.min(rms * 5, 1)
                : 0;
            consecutiveSamples = level.current > 0.08 ? consecutiveSamples + 1 : 0;
            if (!detected && consecutiveSamples >= 3) {
              detected = true;
              setHasSound(true);
            }
            frame = requestAnimationFrame(measure);
          };
          frame = requestAnimationFrame(measure);
        }
        setDevice({
          status: 'ready',
          stream,
          deviceId: track.getSettings().deviceId || selectedId,
          devices: devices.filter(
            (item) => item.kind === (kind === 'camera' ? 'videoinput' : 'audioinput'),
          ),
          error: null,
        });
      } catch (error) {
        dispose();
        if (!current()) return;
        delete cleanups.current[kind];
        delete streams.current[kind];
        setDevice((previous) => ({
          ...previous,
          status: 'error',
          stream: null,
          error: deviceError(error, kind),
        }));
      } finally {
        if (current()) pending.current[kind] = false;
      }
    },
    [release],
  );

  useEffect(() => {
    mounted.current = true;
    const media = navigator.mediaDevices;
    const onDevicesChanged = async () => {
      if (typeof media?.enumerateDevices !== 'function') return;
      const ids = { ...generation.current };
      const devices = await media.enumerateDevices().catch(() => null);
      if (!devices || !mounted.current) return;
      for (const kind of ['camera', 'microphone'] as const) {
        const stream = streams.current[kind];
        if (!stream || generation.current[kind] !== ids[kind]) continue;
        const setDevice = kind === 'camera' ? setCamera : setMicrophone;
        const inputs = devices.filter(
          (device) => device.kind === (kind === 'camera' ? 'videoinput' : 'audioinput'),
        );
        const deviceId = stream.getTracks()[0]?.getSettings().deviceId;
        if (deviceId && !inputs.some((device) => device.deviceId === deviceId)) {
          release(kind);
          if (kind === 'microphone') setHasSound(false);
          setDevice((previous) => ({
            ...previous,
            status: 'error',
            stream: null,
            devices: inputs,
            deviceId: 'default',
            error: '선택한 장비의 연결이 변경됐어요. 사용할 장비를 다시 확인해주세요.',
          }));
        } else {
          setDevice((previous) => ({ ...previous, devices: inputs }));
        }
      }
    };
    media?.addEventListener?.('devicechange', onDevicesChanged);
    return () => {
      mounted.current = false;
      media?.removeEventListener?.('devicechange', onDevicesChanged);
      release('camera');
      release('microphone');
    };
  }, [release]);

  return {
    camera,
    microphone,
    hasSound,
    level,
    requestCamera: useCallback((deviceId?: string) => request('camera', deviceId), [request]),
    requestMicrophone: useCallback(
      (deviceId?: string) => request('microphone', deviceId),
      [request],
    ),
  };
}

export type InterviewDeviceChecks = ReturnType<typeof useInterviewDeviceChecks>;
