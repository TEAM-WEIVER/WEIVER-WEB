interface ReapplyNoticeProps {
  reapplyDDay: number | null;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}

export function ReapplyNotice({ reapplyDDay, isLoading, hasError, onRetry }: ReapplyNoticeProps) {
  const dDayText = reapplyDDay === null ? '-' : String(Math.max(reapplyDDay, 0));
  const title =
    reapplyDDay === null
      ? isLoading
        ? '재지원 가능 일수를 확인하고 있어요.'
        : '재지원 가능 일수를 확인할 수 없어요.'
      : `재지원까지 ${Math.max(reapplyDDay, 0)}일 남았습니다.`;

  return (
    <section className="border-border-strong bg-primary-200 flex flex-col rounded-[20px] border border-dashed px-6 py-7 lg:min-h-[158px] lg:px-[34px]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="bg-bg-primary text-text-secondary flex size-[90px] shrink-0 items-center justify-center rounded-full">
          <p className="flex items-center gap-1">
            <span className="text-h2">D</span>
            <span className="text-h3">-</span>
            <span className="text-h2">{dDayText}</span>
          </p>
        </div>

        <div className="text-text-secondary flex max-w-[515px] flex-col gap-1.5">
          <h2 className="text-h3">{title}</h2>
          <p className="text-body2">
            {hasError
              ? '잠시 후 다시 시도해 주세요.'
              : '위버에서는 무분별한 채용 프로세스 진행 남용 방지를 위해 재지원 가능 일수를 정해두고 있습니다.'}
          </p>
          {hasError && (
            <button
              type="button"
              onClick={onRetry}
              className="w-fit text-sm font-semibold underline"
            >
              다시 시도
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
