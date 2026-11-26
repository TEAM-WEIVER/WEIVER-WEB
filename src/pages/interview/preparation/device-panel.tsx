import { useEffect, useRef, type RefObject } from 'react';
import { Check, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  InterviewDeviceChecks,
  InterviewDeviceState,
} from '@/hooks/use-interview-device-checks';

import styles from './preparation-guide.module.css';

function CameraPreview({ stream }: { stream: MediaStream | null }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = stream;
    return () => {
      element.srcObject = null;
    };
  }, [stream]);
  return (
    <div className={styles.cameraPreview}>
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        aria-label="내 카메라 미리보기"
        className={styles.video}
        hidden={!stream}
      />
      {!stream ? (
        <>
          <UserRound aria-hidden="true" className="size-9" strokeWidth={1.3} />
          <span className="text-body3">내 화면 미리보기</span>
        </>
      ) : null}
    </div>
  );
}

function DeviceSelect({
  kind,
  state,
  onChange,
}: {
  kind: 'camera' | 'microphone';
  state: InterviewDeviceState;
  onChange: (deviceId: string) => void;
}) {
  const label = kind === 'camera' ? '카메라' : '마이크';
  const options = state.devices.filter(
    (device) => device.deviceId !== 'default' && device.deviceId !== 'communications',
  );
  return (
    <div className="mt-4">
      <label htmlFor={`guide-${kind}`} className="text-body3 text-text-tertiary mb-2 block">
        사용할 {label}
      </label>
      <Select
        value={state.deviceId}
        onValueChange={onChange}
        disabled={state.status === 'requesting'}
      >
        <SelectTrigger id={`guide-${kind}`} className="h-12">
          <SelectValue placeholder={`기본 ${label}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">기본 {label}</SelectItem>
          {options.map((device, index) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label || `${label} ${index + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InputMeter({ level }: { level: RefObject<number> }) {
  const bars = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    let previous = -1;
    const update = () => {
      const filled = Math.round(level.current * 12);
      if (filled !== previous) {
        bars.current?.querySelectorAll('span').forEach((bar, index) => {
          bar.style.opacity = index < filled ? '1' : '0.15';
        });
        previous = filled;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [level]);
  return (
    <div ref={bars} aria-hidden="true" className={styles.meter}>
      {Array.from({ length: 12 }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export function DevicePanel({
  kind,
  devices,
}: {
  kind: 'camera' | 'microphone';
  devices: InterviewDeviceChecks;
}) {
  const state = devices[kind];
  const microphone = kind === 'microphone';
  const request = microphone ? devices.requestMicrophone : devices.requestCamera;
  const ready = state.status === 'ready';
  const requesting = state.status === 'requesting';
  const status = requesting
    ? '권한 확인 중'
    : !ready
      ? '연결 전'
      : !microphone
        ? '연결됨'
        : devices.hasSound
          ? '입력 확인됨'
          : '소리를 확인해주세요';
  const successful = ready && (!microphone || devices.hasSound);
  return (
    <div className={styles.panel}>
      {microphone ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h4">마이크 입력</h2>
          <span
            role="status"
            className={successful ? 'text-caption text-success' : 'text-caption text-text-tertiary'}
          >
            {status}
          </span>
        </div>
      ) : (
        <div className="relative">
          <CameraPreview stream={state.stream} />
          <span
            role="status"
            className={`text-caption absolute top-3 right-3 flex items-center gap-1 ${successful ? 'text-success' : 'text-text-secondary'}`}
          >
            {successful ? <Check aria-hidden="true" className="size-3.5" /> : null}
            {status}
          </span>
        </div>
      )}
      <DeviceSelect kind={kind} state={state} onChange={(id) => void request(id)} />
      {microphone ? (
        <div className={styles.meterRow}>
          <InputMeter level={devices.level} />
          <Button
            type="button"
            variant="outline"
            size="xs"
            isLoading={requesting}
            onClick={() => void request(state.deviceId)}
          >
            {ready ? '다시 테스트' : '마이크 테스트'}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          isLoading={requesting}
          onClick={() => void request(state.deviceId)}
        >
          {ready ? '카메라 다시 확인' : '카메라 연결하기'}
        </Button>
      )}
      {requesting ? (
        <p className="text-body3 text-text-tertiary mt-3">
          브라우저의 권한 요청에서 허용을 선택해주세요.
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-body3 text-error mt-3">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
