import type { CompetencyDetail } from '@/schemas/corporate/report';

type Point = {
  x: number;
  y: number;
};

const CHART_SIZE = 320;
const CHART_CENTER = CHART_SIZE / 2;
const CHART_RADIUS = 118;

function clampPercentage(value: number) {
  return Math.max(0, Math.min(value, 100));
}

function polarToCartesian(index: number, total: number, radius: number): Point {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;

  return {
    x: CHART_CENTER + Math.cos(angle) * radius,
    y: CHART_CENTER + Math.sin(angle) * radius,
  };
}

function buildPolygonPoints(items: CompetencyDetail[], scale = 1) {
  return items
    .map((item, index) => {
      const point = polarToCartesian(
        index,
        items.length,
        CHART_RADIUS * scale * (clampPercentage(item.percentage) / 100),
      );

      return `${point.x},${point.y}`;
    })
    .join(' ');
}

function buildGridPoints(total: number, scale: number) {
  return Array.from({ length: total }, (_, index) => {
    const point = polarToCartesian(index, total, CHART_RADIUS * scale);
    return `${point.x},${point.y}`;
  }).join(' ');
}

export function SkillFitScoreDonut({ value }: { value: number }) {
  const normalizedValue = clampPercentage(value);
  const radius = 47;
  const strokeWidth = 14;
  const circumference = Math.PI * 2 * radius;
  const dashOffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="relative flex size-[116px] shrink-0 items-center justify-center">
      <svg className="size-full -rotate-90" viewBox="0 0 116 116" aria-hidden>
        <circle
          cx="58"
          cy="58"
          r={radius}
          fill="none"
          stroke="var(--primary-200)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="58"
          cy="58"
          r={radius}
          fill="none"
          stroke="var(--primary-600)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-caption text-text-disabled">매칭률</p>
        <p className="text-h2 text-text-secondary">{normalizedValue}%</p>
      </div>
    </div>
  );
}

export function SkillRadarChart({ items }: { items: CompetencyDetail[] }) {
  const chartItems = items.slice(0, 6);

  return (
    <div className="border-border-light bg-bg-primary flex h-[436px] items-center justify-center rounded-[20px] border px-8 py-[34px]">
      <div className="relative size-[386px]">
        <svg viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`} className="absolute inset-[33px] size-80">
          {[0.25, 0.5, 0.75, 1].map((scale) => (
            <polygon
              key={scale}
              points={buildGridPoints(chartItems.length, scale)}
              fill="none"
              stroke="var(--border-light)"
              strokeWidth="1"
            />
          ))}

          {chartItems.map((_, index) => {
            const point = polarToCartesian(index, chartItems.length, CHART_RADIUS);

            return (
              <line
                key={index}
                x1={CHART_CENTER}
                y1={CHART_CENTER}
                x2={point.x}
                y2={point.y}
                stroke="var(--border-light)"
                strokeWidth="1"
              />
            );
          })}

          <polygon
            points={buildPolygonPoints(chartItems)}
            fill="rgba(96, 165, 250, 0.38)"
            stroke="var(--info)"
            strokeWidth="2"
          />
        </svg>

        {chartItems.map((item, index) => {
          const point = polarToCartesian(index, chartItems.length, 176);

          return (
            <span
              key={item.name}
              className="text-caption text-text-secondary absolute whitespace-nowrap"
              style={{
                left: point.x + 33,
                top: point.y + 33,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {item.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
