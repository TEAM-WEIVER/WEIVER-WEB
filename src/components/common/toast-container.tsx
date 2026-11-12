'use client';

import { Toast } from '@/components/ui/toast';
import { useToastStore } from '@/store/toast-store';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      role="region"
      data-testid="toast-container"
      className="fixed right-4 bottom-4 z-[9999] flex w-[calc(100%-2rem)] max-w-[360px] flex-col gap-3 sm:right-6 sm:bottom-6"
      aria-label="알림"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
