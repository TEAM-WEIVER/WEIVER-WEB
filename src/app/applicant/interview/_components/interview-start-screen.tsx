'use client';

import { useState, useEffect, useRef } from 'react';
import { Video, Mic, Bookmark, Info, UserRound, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface InterviewStartScreenProps {
  onStart: () => void;
  isConnecting: boolean;
}

const CHECKLIST_ITEMS = [
  { id: 'quiet', label: '조용한 환경에서 진행해주세요.' },
  { id: 'camera', label: '얼굴이 잘 보이도록 카메라를 조정해주세요.' },
  { id: 'earphone', label: '이어폰 사용을 권장해요.' },
] as const;

type ChecklistId = (typeof CHECKLIST_ITEMS)[number]['id'];
type PermissionStatus = 'checking' | 'granted' | 'denied';

const STATUS_TAG: Record<PermissionStatus, { label: string; className: string }> = {
  checking: { label: '확인 중...', className: 'bg-slate-200 text-slate-500' },
  granted: { label: '정상 작동 중이예요', className: 'bg-teal-300 text-slate-900' },
  denied: { label: '권한이 거부되었어요', className: 'bg-red-200 text-red-700' },
};

export function InterviewStartScreen({ onStart, isConnecting }: InterviewStartScreenProps) {
  const [checked, setChecked] = useState<Record<ChecklistId, boolean>>({
    quiet: false,
    camera: false,
    earphone: false,
  });
  const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('checking');
  const [micStatus, setMicStatus] = useState<PermissionStatus>('checking');
  const [micBars, setMicBars] = useState<number[]>([8, 16, 24, 32, 24, 16, 8]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // 카메라 권한 요청
  useEffect(() => {
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
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 카메라 스트림 → video 요소 연결 (granted 이후 ref가 마운트된 경우 대응)
  useEffect(() => {
    if (cameraStatus === 'granted' && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraStatus]);

  // 마이크 권한 요청 + 음파 시각화
  useEffect(() => {
    let audioCtx: AudioContext | null = null;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        micStreamRef.current = stream;
        setMicStatus('granted');

        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const BASE = [8, 16, 24, 32, 24, 16, 8];

        function tick() {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((s, v) => s + v, 0) / data.length;
          const scale = 1 + (avg / 128) * 1.5;
          setMicBars(BASE.map((h) => Math.min(Math.round(h * scale), 48)));
          animFrameRef.current = requestAnimationFrame(tick);
        }
        animFrameRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setMicStatus('denied'));

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
    };
  }, []);

  const allChecked = Object.values(checked).every(Boolean);

  function handleCheck(id: ChecklistId, value: boolean) {
    setChecked((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <div className="flex flex-col gap-6 bg-slate-50 px-4 py-8">
      {/* 섹션 1: 상단 안내 텍스트 */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-center text-2xl font-semibold text-slate-700">
          아래 체크리스트를 모두 확인하고 준비되면 하단의 시작 버튼을 눌러주세요.
        </p>
        <p className="text-center text-base font-medium text-slate-400">
          면접 전, 카메라와 마이크 상태를 확인하고 진행방식을 이해하는 단계입니다.
        </p>
      </div>

      {/* 섹션 2~5: 2x2 그리드 (md 미만은 세로 배치) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 섹션 2: 카메라 확인 카드 */}
        <div className="flex flex-col gap-4 rounded-xl bg-[#fbfbfb] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video size={20} className="text-slate-700" />
              <span className="text-lg font-semibold text-slate-700">카메라 확인</span>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm ${STATUS_TAG[cameraStatus].className}`}
            >
              {STATUS_TAG[cameraStatus].label}
            </span>
          </div>

          {/* 카메라 프리뷰 */}
          <div
            className="relative w-full overflow-hidden rounded-lg bg-slate-200"
            style={{ aspectRatio: '16/9' }}
          >
            {cameraStatus === 'granted' ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : cameraStatus === 'denied' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <AlertCircle size={40} className="text-red-400" />
                <p className="text-sm text-slate-500">
                  브라우저 설정에서 카메라 권한을 허용해주세요.
                </p>
              </div>
            ) : (
              <>
                <div className="absolute inset-0 animate-pulse bg-slate-200" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <UserRound size={64} className="text-slate-400" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 섹션 3: 마이크 확인 카드 */}
        <div className="flex flex-col gap-4 rounded-xl bg-[#fbfbfb] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic size={20} className="text-slate-700" />
              <span className="text-lg font-semibold text-slate-700">마이크 확인</span>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm ${STATUS_TAG[micStatus].className}`}>
              {STATUS_TAG[micStatus].label}
            </span>
          </div>

          {/* 마이크 테스트 영역 */}
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg bg-slate-200 px-6 py-5">
            {micStatus === 'denied' ? (
              <div className="flex flex-col items-center gap-2">
                <AlertCircle size={40} className="text-red-400" />
                <p className="text-sm text-slate-500">
                  브라우저 설정에서 마이크 권한을 허용해주세요.
                </p>
              </div>
            ) : (
              <>
                {/* 고정 높이 컨테이너 — 막대 높이가 바뀌어도 아래 문구 위치 고정 */}
                <div className="flex h-14 items-center justify-center py-2">
                  <div className="flex items-end gap-1">
                    {micBars.map((h, i) => {
                      const colors = [
                        'bg-slate-400',
                        'bg-slate-500',
                        'bg-slate-600',
                        'bg-slate-700',
                        'bg-slate-600',
                        'bg-slate-500',
                        'bg-slate-400',
                      ];
                      return (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all duration-75 ${colors[i]}`}
                          style={{ height: `${h}px` }}
                        />
                      );
                    })}
                  </div>
                </div>
                <p className="text-center text-base font-medium text-slate-700">
                  {micStatus === 'checking' ? '마이크 권한 확인 중...' : '마이크에 대고 말해보세요'}
                </p>
                <p className="text-center text-xs font-normal text-slate-500">
                  시스템 설정 : Default - Macbook Mic
                </p>
              </>
            )}
          </div>
        </div>

        {/* 섹션 4: 면접 전 체크리스트 */}
        <div className="flex flex-col overflow-hidden rounded-xl shadow-sm">
          <div className="flex flex-col gap-1 bg-slate-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <Bookmark size={18} className="text-white" />
              <span className="text-lg font-semibold text-white">면접 전 체크리스트</span>
            </div>
            <p className="text-sm font-medium text-white">
              오류 없는 면접 결과를 위해 아래 환경을 준비하고 체크박스를 클릭해주세요.
            </p>
          </div>

          <div className="flex flex-col divide-y divide-slate-100">
            {CHECKLIST_ITEMS.map((item) => (
              <label
                key={item.id}
                htmlFor={`checklist-${item.id}`}
                className="flex cursor-pointer items-center gap-3 bg-[#fbfbfb] px-6 py-4"
              >
                <Checkbox
                  id={`checklist-${item.id}`}
                  checked={checked[item.id]}
                  onCheckedChange={(value) => handleCheck(item.id, Boolean(value))}
                />
                <span className="text-sm font-medium text-slate-900">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 섹션 5: 면접 안내 */}
        <div className="flex flex-col gap-4 rounded-xl bg-slate-100 p-6">
          <div className="flex items-center gap-2">
            <Info size={20} className="text-slate-700" />
            <span className="text-lg font-semibold text-slate-700">면접 안내</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-base font-medium text-slate-700">1차 면접</span>
              <span className="text-sm text-slate-400">
                지원자님의 기술적 지식에 대해 질문합니다. 정확하게 답변해 주세요.
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-base font-medium text-slate-700">2차 면접</span>
              <span className="text-sm text-slate-400">
                지원자님의 인적성 면모에 대해 질문합니다. 자연스럽게 답변해 주세요.
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-200 px-4 py-3">
            <p className="text-sm text-slate-500">
              1차 면접 이후, 2차 면접이 안내되고 바로 진행됩니다. 중간에 면접은 중단할 수 없으니
              신중하게 생각하고 면접을 시작해주세요.
            </p>
          </div>
        </div>
      </div>

      {/* 하단: 면접 시작 버튼 */}
      <Button
        type="button"
        onClick={onStart}
        disabled={!allChecked || isConnecting}
        aria-disabled={!allChecked || isConnecting}
        className={`w-full ${!allChecked ? 'bg-slate-200 text-slate-500 hover:bg-slate-200' : ''}`}
      >
        {isConnecting ? '연결 중...' : '면접 시작하기'}
      </Button>
    </div>
  );
}
