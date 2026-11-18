import { useLayoutEffect, useRef } from 'react';

import styles from './page-loading-overlay.module.css';

interface PageLoadingOverlayProps {
  /** 페이지 전체가 준비되는 동안 오버레이를 표시합니다. */
  isLoading: boolean;
  /** 스크린 리더에 전달할 로딩 상태입니다. */
  label?: string;
}

export function PageLoadingOverlay({ isLoading, label = '로딩 중' }: PageLoadingOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!isLoading || !dialog) return;

    dialog.setAttribute('closedby', 'none');
    dialog.showModal();
    return () => dialog.close();
  }, [isLoading]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onCancel={(event) => event.preventDefault()}
      className="fixed inset-0 m-auto size-fit max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 outline-none backdrop:bg-black/40"
    >
      <span className={styles.mark} aria-hidden="true" />
    </dialog>
  );
}
