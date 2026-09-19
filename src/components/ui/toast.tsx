'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore, type ToastItem } from '@/store/toast-store';

const TOAST_CONFIG = {
  success: {
    color: '#22c55e',
    Icon: CheckCircle2,
    role: 'status' as const,
    ariaLive: 'polite' as const,
  },
  error: {
    color: '#ef4444',
    Icon: AlertCircle,
    role: 'alert' as const,
    ariaLive: 'assertive' as const,
  },
  warning: {
    color: '#f59e0b',
    Icon: AlertTriangle,
    role: 'alert' as const,
    ariaLive: 'assertive' as const,
  },
  info: {
    color: '#3b82f6',
    Icon: Info,
    role: 'status' as const,
    ariaLive: 'polite' as const,
  },
} as const;

interface ToastProps {
  toast: ToastItem;
}

export function Toast({ toast }: ToastProps) {
  const remove = useToastStore((state) => state.remove);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { id, type, title, description, duration = 3000 } = toast;
  const config = TOAST_CONFIG[type];
  const { color, Icon, role, ariaLive } = config;

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      remove(id);
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [id, duration, remove]);

  const handleClose = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    remove(id);
  };

  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={cn(
        'relative flex w-[360px] overflow-hidden bg-[#fcfcfc]',
        'drop-shadow-[0px_8px_12px_rgba(149,157,165,0.2)]',
      )}
    >
      {/* 왼쪽 컬러 세로 바 4px */}
      <div
        className="w-1 flex-shrink-0 self-stretch rounded-tl-[10px] rounded-bl-[10px]"
        style={{ backgroundColor: color }}
      />

      {/* 본문 */}
      <div className="flex flex-1 items-center gap-3 rounded-tr-[10px] rounded-br-[10px] p-[14px]">
        {/* 아이콘 컨테이너 40×40px */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[4px]"
          style={{ backgroundColor: `${color}1a` }}
        >
          <Icon size={24} style={{ color }} />
        </div>

        {/* 텍스트 */}
        <div className="flex flex-1 flex-col justify-center gap-0.5">
          <p className="w-[220px] text-[14px] leading-5 font-medium tracking-[-0.28px] text-[#0f172a]">
            {title}
          </p>
          {description && (
            <p
              data-toast-description
              className="text-[12px] leading-4 font-normal tracking-[-0.24px] text-[#64748b]"
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {/* 닫기 버튼 우측 상단 */}
      <button
        type="button"
        aria-label="알림 닫기"
        onClick={handleClose}
        className="absolute top-3 right-3 flex h-[18px] w-[18px] items-center justify-center rounded text-[#64748b] transition-colors hover:text-[#0f172a] focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none"
      >
        <X size={14} />
      </button>
    </div>
  );
}
