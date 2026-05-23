export function ReapplyNotice() {
  return (
    <section className="border-border-strong bg-primary-200 flex flex-col rounded-[20px] border border-dashed px-6 py-7 lg:min-h-[158px] lg:px-[34px]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="bg-bg-primary text-text-secondary flex size-[90px] shrink-0 items-center justify-center rounded-full">
          <p className="flex items-center gap-1">
            <span className="text-h2">D</span>
            <span className="text-h3">-</span>
            <span className="text-h2">0</span>
          </p>
        </div>

        <div className="text-text-secondary flex max-w-[515px] flex-col gap-1.5">
          <h2 className="text-h3">재지원까지 0일 남았습니다.</h2>
          <p className="text-body2">
            위버에서는 무분별한 채용 프로세스 진행 남용 방지를 위해 재지원 가능 일수를 정해두고
            있습니다.
            <br />
            지원자께서는 재지원까지 0일 남으셨습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
