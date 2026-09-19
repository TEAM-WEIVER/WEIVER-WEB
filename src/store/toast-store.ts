import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export type ToastInput = Omit<ToastItem, 'id'>;

interface ToastStore {
  toasts: ToastItem[];
  add: (toast: ToastInput) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },
  remove: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

/** UI 컴포넌트 밖에서도 안전하게 사용할 수 있는 토스트 진입점입니다. */
export const toast = {
  add(input: ToastInput) {
    try {
      useToastStore.getState().add(input);
    } catch (error) {
      console.warn('토스트를 표시하지 못했습니다.', error);
    }
  },
  remove(id: string) {
    try {
      useToastStore.getState().remove(id);
    } catch (error) {
      console.warn('토스트를 제거하지 못했습니다.', error);
    }
  },
};
