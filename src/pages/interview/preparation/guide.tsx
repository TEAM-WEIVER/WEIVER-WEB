import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { InterviewDeviceChecks } from '@/hooks/use-interview-device-checks';
import { cn } from '@/lib/utils';

import { GUIDE_LABELS, GuidePageContent } from './guide-pages';
import { useGuideNavigation } from './use-guide-navigation';
import styles from './preparation-guide.module.css';

export type InterviewPreparationGuideProps = {
  devices: InterviewDeviceChecks;
  onExit: () => void;
  /** 실제 면접 화면 연결 전에는 주입하지 않는다. 준비 단계에서는 세션을 생성하지 않는다. */
  onStart?: () => void | Promise<void>;
};

export function InterviewPreparationGuide({
  devices,
  onExit,
  onStart,
}: InterviewPreparationGuideProps) {
  const { step, phase, direction, transitioning, moveTo } = useGuideNavigation(GUIDE_LABELS.length);
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const startLock = useRef(false);
  const mounted = useRef(true);
  const cameraReady = devices.camera.status === 'ready';
  const microphoneReady = devices.microphone.status === 'ready' && devices.hasSound;
  const last = step === GUIDE_LABELS.length - 1;
  const deviceStepReady = step === 1 ? cameraReady : step === 2 ? microphoneReady : true;
  const allReady = cameraReady && microphoneReady && confirmed;
  const disabled = transitioning || starting || (last ? !allReady || !onStart : !deviceStepReady);
  const hint =
    step === 1 && !cameraReady
      ? '카메라 연결을 확인해주세요.'
      : step === 2 && !microphoneReady
        ? '마이크 소리 입력을 확인해주세요.'
        : last && (!cameraReady || !microphoneReady)
          ? '연결이 변경된 장비를 다시 확인해주세요.'
          : last && !confirmed
            ? '면접 진행 안내를 확인해주세요.'
            : last && !onStart
              ? '실제 면접 연결 기능은 준비 중이에요.'
              : '';

  useLayoutEffect(() => {
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [step]);

  useEffect(() => {
    if (transitioning) return;
    const heading = root.current?.querySelector<HTMLHeadingElement>(`#guide-title-${step}`);
    heading?.focus({ preventScroll: true });
  }, [step, transitioning]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function onNext() {
    if (disabled || startLock.current) return;
    if (!last) {
      setStartError('');
      moveTo(step + 1);
      return;
    }
    if (!onStart) return;
    startLock.current = true;
    setStarting(true);
    setStartError('');
    try {
      await onStart();
    } catch {
      if (mounted.current) setStartError('면접을 시작하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      startLock.current = false;
      if (mounted.current) setStarting(false);
    }
  }

  return (
    <main ref={root} className={styles.shell} aria-label="AI 면접 준비 가이드">
      <div className={styles.top}>
        <ol className={styles.progress} aria-label="면접 준비 단계">
          {GUIDE_LABELS.map((label, index) => (
            <li
              key={label}
              data-filled={index <= step}
              aria-current={index === step ? 'step' : undefined}
            >
              <span aria-hidden="true" />
              <span className="sr-only">
                {index + 1}단계: {label}
              </span>
            </li>
          ))}
        </ol>
        <span className={`text-caption ${styles.counter}`} aria-hidden="true">
          {step + 1} / {GUIDE_LABELS.length}
        </span>
        <Button
          type="button"
          variant="ghost"
          disabled={starting}
          onClick={onExit}
          aria-label="가이드 닫기"
        >
          닫기
        </Button>
      </div>
      <div ref={viewport} className={styles.viewport}>
        <div
          className={styles.pages}
          data-phase={phase}
          data-direction={direction}
          inert={transitioning || starting}
        >
          {GUIDE_LABELS.map((label, index) => (
            <section
              key={label}
              aria-labelledby={`guide-title-${index}`}
              aria-hidden={step !== index}
              hidden={step !== index}
              inert={step !== index}
              className={cn(styles.page, index === 0 && step === 0 && styles.intro)}
            >
              <div className="w-full min-w-0">
                <GuidePageContent
                  step={index}
                  devices={devices}
                  confirmed={confirmed}
                  onConfirm={setConfirmed}
                />
                {index === 5 && (!cameraReady || !microphoneReady) ? (
                  <div className="mx-auto mt-4 flex max-w-120 flex-wrap gap-2">
                    {!cameraReady ? (
                      <Button type="button" variant="outline" onClick={() => moveTo(1)}>
                        카메라 다시 확인
                      </Button>
                    ) : null}
                    {!microphoneReady ? (
                      <Button type="button" variant="outline" onClick={() => moveTo(2)}>
                        마이크 다시 확인
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {index === 5 && startError ? (
                  <p role="alert" className="text-body3 text-error mx-auto mt-4 max-w-120">
                    {startError}
                  </p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </div>
      <div className={styles.footer}>
        <div className={styles.controls} data-welcome={step === 0}>
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              disabled={transitioning || starting}
              onClick={() => {
                setStartError('');
                moveTo(step - 1);
              }}
            >
              이전
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={disabled}
            isLoading={starting}
            aria-describedby={hint ? 'guide-next-hint' : undefined}
            onClick={() => void onNext()}
          >
            {step === 0 ? '시작하기' : last ? 'AI 면접 시작' : '다음'}
          </Button>
        </div>
        <p
          id="guide-next-hint"
          role="status"
          className={`text-caption ${styles.hint}`}
          data-welcome={step === 0}
        >
          {hint}
        </p>
      </div>
    </main>
  );
}
