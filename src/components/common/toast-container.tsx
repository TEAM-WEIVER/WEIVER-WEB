'use client';

import { useToastStore } from '@/store/toast-store';
import { Toast } from '@/components/ui/toast';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      data-testid="toast-container"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3"
      aria-label="알림"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
