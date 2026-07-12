import type { CompanyDashboardProfile } from './dashboard-fixtures';

type CompanySummaryCardProps = {
  company: CompanyDashboardProfile;
};

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-tertiary flex h-[70px] items-center rounded-[10px] p-3.5">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body3 text-text-tertiary">{label}</p>
        <p className="text-body2 text-text-primary truncate">{value}</p>
      </div>
    </div>
  );
}

function WorkStyleTag({ label }: { label: string }) {
  return (
    <span className="text-body2 border-success bg-success/10 text-text-primary inline-flex h-6 items-center rounded-md border px-1.5">
      {label}
    </span>
  );
}

export function CompanySummaryCard({ company }: CompanySummaryCardProps) {
  const workStyles = [
    company.wayOfWorkingDetail?.workPace,
    company.wayOfWorkingDetail?.decisionMaking,
    company.wayOfWorkingDetail?.roleDefinition,
    company.wayOfWorkingDetail?.operationStyle,
  ].filter((style): style is string => Boolean(style));

  return (
    <section className="border-border-light bg-bg-primary flex min-h-[286px] flex-col rounded-[20px] border p-6 lg:p-[34px]">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-6">
            <div className="bg-bg-primary flex size-[88px] shrink-0 items-center justify-center rounded-[10px] text-[48px] leading-none font-black text-black">
              W
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-h3 text-text-secondary truncate">{company.companyName}</h1>
              <p className="text-body2 text-text-tertiary">{company.companyType}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3.5 min-[560px]:grid-cols-[154px_1fr]">
          <InfoTile label="대표" value={company.companyCeoName ?? '-'} />
          <InfoTile label="주소" value={company.address ?? '-'} />
          <InfoTile label="사원수" value={String(company.employeeNum ?? '-')} />
          <InfoTile label="설립연도" value={company.foundedYear ?? '-'} />
        </div>

        <div className="border-border-light flex min-h-16 flex-col justify-end gap-2 border-t pt-3.5">
          <p className="text-body3 text-text-tertiary">업무방식</p>
          <div className="flex flex-wrap gap-1.5">
            {workStyles.map((style) => (
              <WorkStyleTag key={style} label={style} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
