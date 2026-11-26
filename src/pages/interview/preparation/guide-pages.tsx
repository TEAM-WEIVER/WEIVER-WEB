import { MessageSquare } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import type { InterviewDeviceChecks } from '@/hooks/use-interview-device-checks';

import { DevicePanel } from './device-panel';
import styles from './preparation-guide.module.css';

export const GUIDE_LABELS = [
  '시작 안내',
  '카메라 확인',
  '마이크 확인',
  '기술 면접 안내',
  '인성 면접 안내',
  '최종 확인',
] as const;

export function GuidePageContent({
  step,
  devices,
  confirmed,
  onConfirm,
}: {
  step: number;
  devices: InterviewDeviceChecks;
  confirmed: boolean;
  onConfirm: (value: boolean) => void;
}) {
  if (step === 0)
    return (
      <div className={styles.center}>
        <h1
          id="guide-title-0"
          tabIndex={-1}
          className={`text-h1 ${styles.heading}`}
          data-reveal="0"
        >
          지금부터 면접 준비를
          <br />
          시작할게요
        </h1>
        <p className={`text-body1 ${styles.subtitle}`} data-reveal="1">
          장비를 점검하고 진행 방식을 확인해요.
        </p>
        <p className={`text-body1 ${styles.subtitle} ${styles.follow}`} data-reveal="2">
          하나씩 천천히 따라와 주세요.
        </p>
        <ol className={styles.pills}>
          {['카메라 확인', '마이크 확인', '진행 방식 안내'].map((label, index) => (
            <li key={label}>
              <span aria-hidden="true">{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </div>
    );

  if (step === 1 || step === 2) {
    const camera = step === 1;
    return (
      <div className={styles.split}>
        <div>
          <p className="text-body3 text-primary mb-3 font-semibold">
            STEP {step} · {camera ? '카메라' : '마이크'}
          </p>
          <h1 id={`guide-title-${step}`} tabIndex={-1} className={`text-h1 ${styles.heading}`}>
            {camera ? (
              <>
                카메라 사용을
                <br />
                허용해 주세요
              </>
            ) : (
              <>
                마이크 소리를
                <br />
                확인해 볼게요
              </>
            )}
          </h1>
          <p className={`text-body1 ${styles.subtitle}`}>
            {camera
              ? '브라우저에 권한 요청이 나타나면 ‘허용’을 눌러주세요. 내 모습이 화면에 잘 보이는지 확인해요.'
              : '‘마이크 테스트’를 누르고 평소 목소리로 “안녕하세요”라고 말해보세요. 소리가 감지되면 다음으로 넘어갈 수 있어요.'}
          </p>
          <ul className={styles.tips}>
            {(camera
              ? [
                  '얼굴 전체가 밝게 보이도록 조정해 주세요.',
                  '여러 카메라가 있다면 사용할 장비를 선택해 주세요.',
                ]
              : ['주변 소음이 적은 공간이 좋아요.', '이어폰을 사용하면 울림을 줄일 수 있어요.']
            ).map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
        <DevicePanel kind={camera ? 'camera' : 'microphone'} devices={devices} />
      </div>
    );
  }

  if (step === 3 || step === 4) {
    const technical = step === 3;
    return (
      <div className={styles.center}>
        <h1 id={`guide-title-${step}`} tabIndex={-1} className={`text-h1 ${styles.heading}`}>
          {technical ? (
            <>
              첫 번째는
              <br />
              기술 면접이에요.
            </>
          ) : (
            <>
              두 번째는
              <br />
              인성 면접이에요.
            </>
          )}
        </h1>
        <p className={`text-body1 ${styles.subtitle}`}>
          {technical ? (
            <>
              지원 직무와 관련된 지식과 경험을 바탕으로 질문을 드려요.
              <br />
              생각하는 과정을 차근차근 들려주세요.
            </>
          ) : (
            <>
              일하는 방식과 가치관에 대해 질문을 드려요.
              <br />
              평소 생각을 편하게 이야기해 주세요.
            </>
          )}
        </p>
        <div className={styles.lesson}>
          <div className={styles.question}>
            <p className="text-body3 text-text-tertiary flex items-center gap-2">
              <MessageSquare aria-hidden="true" className="size-4" />
              이런 질문을 드릴 수 있어요
            </p>
            <blockquote className="text-h3 mt-4">
              {technical ? (
                <>
                  “프로젝트에서 겪었던 기술적인 문제를
                  <br />
                  어떻게 해결했나요?”
                </>
              ) : (
                <>
                  “팀원과 의견이 달랐을 때<br />
                  어떻게 조율했나요?”
                </>
              )}
            </blockquote>
          </div>
          <p className="text-body2 text-text-secondary mt-4">
            {technical
              ? '질문을 끝까지 듣고, 내가 맡았던 역할과 해결 과정을 구체적으로 이야기해주세요. 답변에 따라 이어지는 질문을 드릴 수도 있어요.'
              : '정답을 찾기보다 실제 경험과 그때의 생각을 솔직하게 말해주세요. 답변에 따라 이어지는 질문을 드릴 수도 있어요.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.final}>
      <p className="text-body3 text-primary mb-3 font-semibold">마지막 확인</p>
      <h1 id="guide-title-5" tabIndex={-1} className={`text-h1 ${styles.heading}`}>
        시작하기 전에
        <br />꼭 확인해 주세요
      </h1>
      <div className={`text-body1 ${styles.notice}`}>
        두 면접은 연속으로 진행돼요.
        <br />
        시작하면 중간에 일시정지할 수 없어요.
      </div>
      <div className="mt-6 flex items-start gap-3">
        <Checkbox
          id="guide-confirm"
          checked={confirmed}
          onCheckedChange={(checked) => onConfirm(checked === true)}
        />
        <label htmlFor="guide-confirm" className="text-body2 text-text-secondary cursor-pointer">
          면접 진행 방식과 일시정지 불가 안내를 확인했어요.
        </label>
      </div>
    </div>
  );
}
