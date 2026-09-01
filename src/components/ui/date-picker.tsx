import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DatePickerMode = 'date' | 'month';

type DatePickerProps = {
  value?: string | null;
  onChange: (value: string) => void;
  mode?: DatePickerMode;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
  className?: string;
};

type ParsedDateValue = {
  year: number | null;
  month: number | null;
  day: number | null;
};

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_LABELS = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function parseValue(value: string | null | undefined, mode: DatePickerMode): ParsedDateValue {
  if (!value) return { year: null, month: null, day: null };

  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month) return { year: null, month: null, day: null };

  return {
    year,
    month,
    day: mode === 'date' && day ? day : null,
  };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatMonthValue(year: number, month: number) {
  return `${year}-${pad(month)}`;
}

function formatDateValue(year: number, month: number, day: number) {
  return `${formatMonthValue(year, month)}-${pad(day)}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getStartWeekday(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function clampYear(year: number, minYear: number, maxYear: number) {
  return Math.min(Math.max(year, minYear), maxYear);
}

function getInitialView(
  value: string | null | undefined,
  mode: DatePickerMode,
  minYear: number,
  maxYear: number,
) {
  const parsed = parseValue(value, mode);
  const now = new Date();

  return {
    year: clampYear(parsed.year ?? now.getFullYear(), minYear, maxYear),
    month: parsed.month ?? now.getMonth() + 1,
  };
}

function getYears(minYear: number, maxYear: number) {
  return Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);
}

export function DatePicker({
  value,
  onChange,
  mode = 'date',
  minYear = 1950,
  maxYear = CURRENT_YEAR + 10,
  disabled = false,
  className,
  'aria-invalid': ariaInvalid = false,
  'aria-label': ariaLabel = '날짜 선택',
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState(() => getInitialView(value, mode, minYear, maxYear));
  const parsedValue = parseValue(value, mode);
  const selectedValue =
    parsedValue.year && parsedValue.month
      ? mode === 'month'
        ? formatMonthValue(parsedValue.year, parsedValue.month)
        : parsedValue.day
          ? formatDateValue(parsedValue.year, parsedValue.month, parsedValue.day)
          : ''
      : '';

  useEffect(() => {
    setView(getInitialView(value, mode, minYear, maxYear));
  }, [maxYear, minYear, mode, value]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const triggerLabel = selectedValue || (mode === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <input
        type="text"
        readOnly
        tabIndex={-1}
        aria-label={`${ariaLabel} 값`}
        value={selectedValue}
        className="sr-only"
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((nextIsOpen) => !nextIsOpen)}
        className={cn(
          'border-border-default bg-bg-primary text-body2 text-text-primary hover:bg-bg-tertiary h-12 w-full justify-start rounded-lg px-4 shadow-none',
          !selectedValue && 'text-text-disabled',
          ariaInvalid && 'border-error focus-visible:border-error focus-visible:ring-error/20',
        )}
      >
        <CalendarIcon className="text-icon-muted size-4" />
        <span>{triggerLabel}</span>
      </Button>

      {isOpen && (
        <div className="border-border-light bg-bg-primary absolute top-[54px] left-0 z-30 w-[304px] rounded-lg border p-3 shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
          {mode === 'month' ? (
            <MonthPickerPanel
              value={parsedValue}
              viewYear={view.year}
              minYear={minYear}
              maxYear={maxYear}
              onViewYearChange={(year) => setView((prev) => ({ ...prev, year }))}
              onSelect={(year, month) => {
                onChange(formatMonthValue(year, month));
                setIsOpen(false);
              }}
            />
          ) : (
            <CalendarPanel
              value={parsedValue}
              view={view}
              minYear={minYear}
              maxYear={maxYear}
              onViewChange={setView}
              onSelect={(year, month, day) => {
                onChange(formatDateValue(year, month, day));
                setIsOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MonthPickerPanel({
  value,
  viewYear,
  minYear,
  maxYear,
  onViewYearChange,
  onSelect,
}: {
  value: ParsedDateValue;
  viewYear: number;
  minYear: number;
  maxYear: number;
  onViewYearChange: (year: number) => void;
  onSelect: (year: number, month: number) => void;
}) {
  const years = useMemo(() => getYears(minYear, maxYear), [maxYear, minYear]);

  return (
    <div className="flex flex-col gap-3">
      <select
        value={viewYear}
        onChange={(event) => onViewYearChange(Number(event.target.value))}
        className="border-border-default bg-bg-primary text-body2 text-text-primary focus-visible:border-ring focus-visible:ring-ring/50 h-10 rounded-md border px-3 outline-none focus-visible:ring-[1px]"
        aria-label="연도 선택"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}년
          </option>
        ))}
      </select>

      <div className="grid grid-cols-3 gap-2">
        {MONTH_LABELS.map((label, index) => {
          const month = index + 1;
          const isSelected = value.year === viewYear && value.month === month;

          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(viewYear, month)}
              className={cn(
                'text-body2 hover:bg-primary-100 h-10 rounded-md transition-colors',
                isSelected
                  ? 'bg-primary-700 text-text-inverse hover:bg-primary-700'
                  : 'text-text-primary',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarPanel({
  value,
  view,
  minYear,
  maxYear,
  onViewChange,
  onSelect,
}: {
  value: ParsedDateValue;
  view: { year: number; month: number };
  minYear: number;
  maxYear: number;
  onViewChange: (view: { year: number; month: number }) => void;
  onSelect: (year: number, month: number, day: number) => void;
}) {
  const years = useMemo(() => getYears(minYear, maxYear), [maxYear, minYear]);
  const daysInMonth = getDaysInMonth(view.year, view.month);
  const startWeekday = getStartWeekday(view.year, view.month);
  const cells = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function moveMonth(offset: number) {
    const nextDate = new Date(view.year, view.month - 1 + offset, 1);
    const nextYear = clampYear(nextDate.getFullYear(), minYear, maxYear);
    const nextMonth =
      nextDate.getFullYear() < minYear
        ? 1
        : nextDate.getFullYear() > maxYear
          ? 12
          : nextDate.getMonth() + 1;

    onViewChange({ year: nextYear, month: nextMonth });
  }

  const isPreviousDisabled = view.year === minYear && view.month === 1;
  const isNextDisabled = view.year === maxYear && view.month === 12;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={isPreviousDisabled}
          onClick={() => moveMonth(-1)}
          className="text-text-tertiary hover:bg-primary-100 flex size-8 items-center justify-center rounded-md disabled:opacity-40"
          aria-label="이전 달"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex min-w-0 flex-1 gap-2">
          <select
            value={view.year}
            onChange={(event) => onViewChange({ ...view, year: Number(event.target.value) })}
            className="border-border-default bg-bg-primary text-body2 text-text-primary focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 flex-1 rounded-md border px-2 outline-none focus-visible:ring-[1px]"
            aria-label="연도 선택"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
          <select
            value={view.month}
            onChange={(event) => onViewChange({ ...view, month: Number(event.target.value) })}
            className="border-border-default bg-bg-primary text-body2 text-text-primary focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 flex-1 rounded-md border px-2 outline-none focus-visible:ring-[1px]"
            aria-label="월 선택"
          >
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={isNextDisabled}
          onClick={() => moveMonth(1)}
          className="text-text-tertiary hover:bg-primary-100 flex size-8 items-center justify-center rounded-md disabled:opacity-40"
          aria-label="다음 달"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((weekday) => (
          <div
            key={weekday}
            className="text-caption text-text-disabled flex h-7 items-center justify-center"
          >
            {weekday}
          </div>
        ))}
        {cells.map((day, index) =>
          day ? (
            <button
              key={`${view.year}-${view.month}-${day}`}
              type="button"
              onClick={() => onSelect(view.year, view.month, day)}
              className={cn(
                'text-body2 hover:bg-primary-100 flex h-9 items-center justify-center rounded-md transition-colors',
                value.year === view.year && value.month === view.month && value.day === day
                  ? 'bg-primary-700 text-text-inverse hover:bg-primary-700'
                  : 'text-text-primary',
              )}
            >
              {day}
            </button>
          ) : (
            <div key={`empty-${index}`} className="h-9" />
          ),
        )}
      </div>
    </div>
  );
}
