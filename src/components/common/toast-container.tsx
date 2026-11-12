'use client';

import { Toast } from '@/components/ui/toast';
import { useToastStore } from '@/store/toast-store';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      data-testid="toast-container"
      className="fixed right-6 bottom-6 z-[9999] flex flex-col gap-3"
      aria-label="알림"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
