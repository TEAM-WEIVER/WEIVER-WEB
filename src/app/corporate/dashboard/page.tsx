export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* 인사말 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 text-text-secondary">대시보드</h1>
        <p className="text-body2 text-text-tertiary">채용 현황을 한눈에 확인하세요.</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: '진행 중인 공고', value: '0' },
          { label: '총 지원자', value: '0' },
          { label: '면접 예정', value: '0' },
          { label: '채용 완료', value: '0' },
        ].map((card) => (
          <div
            key={card.label}
            className="border-border-light bg-bg-primary flex flex-col gap-3 rounded-[16px] border p-6"
          >
            <p className="text-body2 text-text-tertiary">{card.label}</p>
            <p className="text-h2 text-text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 최근 활동 플레이스홀더 */}
      <div className="border-border-light bg-bg-primary flex flex-col gap-4 rounded-[16px] border p-6">
        <h2 className="text-h3 text-text-secondary">최근 활동</h2>
        <div className="bg-bg-tertiary flex h-[200px] items-center justify-center rounded-lg">
          <p className="text-body2 text-text-disabled">아직 활동 내역이 없습니다.</p>
        </div>
      </div>
    </div>
  );
}
