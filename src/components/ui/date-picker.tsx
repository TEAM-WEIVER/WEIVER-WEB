import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover } from 'radix-ui';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DatePickerProps = {
  id?: string;
  value?: string | null;
  onChange: (value: string) => void;
  mode?: 'date' | 'month';
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (value: number) => String(value).padStart(2, '0');
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

function parseDate(value: string | null | undefined, mode: 'date' | 'month') {
  if (!value || !(mode === 'month' ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/).test(value))
    return null;
  const [year, month, day = 1] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function moveMonth(date: Date, offset: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  target.setDate(Math.min(date.getDate(), daysInMonth(target.getFullYear(), target.getMonth())));
  return target;
}

export function DatePicker({
  id,
  value,
  onChange,
  mode = 'date',
  minYear = 1950,
  maxYear = new Date().getFullYear() + 10,
  disabled = false,
  className,
  'aria-invalid': ariaInvalid = false,
  'aria-label': ariaLabel = '날짜 선택',
  'aria-describedby': describedBy,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parseDate(value, mode) ?? new Date());
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  const helpId = useId();
  const valueId = useId();
  const selected = parseDate(value, mode);
  const selectedValue = selected ? (value ?? '') : '';
  const upperYear = Math.max(minYear, maxYear);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const years = Array.from({ length: upperYear - minYear + 1 }, (_, index) => upperYear - index);

  function clamp(date: Date) {
    if (date.getFullYear() < minYear) return new Date(minYear, 0, 1);
    if (date.getFullYear() > upperYear) return new Date(upperYear, 11, 31);
    return date;
  }

  function changeOpen(next: boolean) {
    if (next) setCursor(clamp(parseDate(value, mode) ?? new Date()));
    setOpen(next);
  }

  useEffect(() => {
    if (shouldFocus.current) {
      gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
      shouldFocus.current = false;
    }
  }, [cursor]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    let next = new Date(cursor);
    const step = mode === 'month' ? 3 : 7;
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -step,
      ArrowDown: step,
    };
    if (event.key in offsets) {
      if (mode === 'month') next = moveMonth(cursor, offsets[event.key]);
      else next.setDate(next.getDate() + offsets[event.key]);
    } else if (event.key === 'Home' || event.key === 'End') {
      const position = mode === 'month' ? month % 3 : cursor.getDay();
      const offset = event.key === 'Home' ? -position : step - 1 - position;
      if (mode === 'month') next = moveMonth(cursor, offset);
      else next.setDate(next.getDate() + offset);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      next = moveMonth(
        cursor,
        (event.key === 'PageUp' ? -1 : 1) * (mode === 'month' || event.shiftKey ? 12 : 1),
      );
    } else return;
    event.preventDefault();
    shouldFocus.current = true;
    setCursor(clamp(next));
  }

  function choose(date: Date) {
    const monthValue = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
    onChange(mode === 'month' ? monthValue : `${monthValue}-${pad(date.getDate())}`);
    setOpen(false);
  }

  const dayCount = daysInMonth(year, month);
  const leading = new Date(year, month, 1).getDay();
  const columns = mode === 'month' ? 3 : 7;
  const cellCount = mode === 'month' ? 12 : Math.ceil((leading + dayCount) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, index) => {
    if (mode === 'month') return new Date(year, index, 1);
    const day = index - leading + 1;
    return day > 0 && day <= dayCount ? new Date(year, month, day) : null;
  });
  const atStart = year === minYear && (mode === 'month' || month === 0);
  const atEnd = year === upperYear && (mode === 'month' || month === 11);
  const selectClass =
    'border-border-default bg-bg-primary text-body2 text-text-primary focus-visible:ring-ring h-9 min-w-0 flex-1 rounded-md border px-2 outline-none focus-visible:ring-2';

  return (
    <div className={cn('w-full', className)}>
      <input
        type="text"
        readOnly
        tabIndex={-1}
        aria-label={`${ariaLabel} 값`}
        value={selectedValue}
        className="sr-only"
      />
      <span id={valueId} className="sr-only">
        {selectedValue || '선택한 날짜 없음'}
      </span>
      <Popover.Root open={open && !disabled} onOpenChange={changeOpen} modal>
        <Popover.Trigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-label={ariaLabel}
            aria-describedby={[describedBy, valueId].filter(Boolean).join(' ')}
            className={cn(
              'border-border-default bg-bg-primary text-body2 text-text-primary hover:bg-bg-tertiary h-12 w-full justify-start rounded-lg px-4 shadow-none',
              !selectedValue && 'text-text-tertiary',
              ariaInvalid && 'border-error focus-visible:ring-error/20',
            )}
          >
            <CalendarIcon aria-hidden="true" className="text-text-tertiary size-4" />
            <span>{selectedValue || (mode === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD')}</span>
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            aria-label={`${ariaLabel} 달력`}
            align="start"
            sideOffset={6}
            collisionPadding={16}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
            }}
            className="border-border-light bg-bg-primary z-50 w-[304px] max-w-[calc(100vw-2rem)] rounded-lg border p-3 shadow-lg"
          >
            <div className="mb-3 flex items-center gap-2">
              <Button
                size="icon-xs"
                variant="ghost"
                disabled={atStart}
                aria-label={mode === 'month' ? '이전 연도' : '이전 달'}
                onClick={() => setCursor(clamp(moveMonth(cursor, mode === 'month' ? -12 : -1)))}
              >
                <ChevronLeft />
              </Button>
              <select
                aria-label="연도 선택"
                value={year}
                className={selectClass}
                onChange={(event) =>
                  setCursor(clamp(moveMonth(cursor, (Number(event.target.value) - year) * 12)))
                }
              >
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}년
                  </option>
                ))}
              </select>
              {mode === 'date' ? (
                <select
                  aria-label="월 선택"
                  value={month}
                  className={selectClass}
                  onChange={(event) =>
                    setCursor(moveMonth(cursor, Number(event.target.value) - month))
                  }
                >
                  {Array.from({ length: 12 }, (_, index) => (
                    <option key={index} value={index}>
                      {index + 1}월
                    </option>
                  ))}
                </select>
              ) : null}
              <Button
                size="icon-xs"
                variant="ghost"
                disabled={atEnd}
                aria-label={mode === 'month' ? '다음 연도' : '다음 달'}
                onClick={() => setCursor(clamp(moveMonth(cursor, mode === 'month' ? 12 : 1)))}
              >
                <ChevronRight />
              </Button>
            </div>
            <p aria-live="polite" className="sr-only">
              {year}년 {mode === 'date' ? `${month + 1}월` : ''}
            </p>
            <div
              ref={gridRef}
              role="grid"
              aria-label={
                mode === 'month' ? `${year}년 월 선택` : `${year}년 ${month + 1}월 날짜 선택`
              }
              aria-describedby={helpId}
            >
              {mode === 'date' ? (
                <div role="row" className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      role="columnheader"
                      aria-label={`${day}요일`}
                      className="text-caption text-text-tertiary flex h-7 items-center justify-center"
                    >
                      {day}
                    </div>
                  ))}
                </div>
              ) : null}
              {Array.from({ length: cellCount / columns }, (_, row) => (
                <div
                  role="row"
                  key={row}
                  className={cn('grid gap-1', mode === 'month' ? 'grid-cols-3' : 'grid-cols-7')}
                >
                  {cells.slice(row * columns, (row + 1) * columns).map((date, col) => {
                    const active =
                      date &&
                      (mode === 'month'
                        ? date.getMonth() === month
                        : date.getDate() === cursor.getDate());
                    const isSelected =
                      !!date &&
                      !!selected &&
                      date.getFullYear() === selected.getFullYear() &&
                      date.getMonth() === selected.getMonth() &&
                      (mode === 'month' || date.getDate() === selected.getDate());
                    return (
                      <div role="gridcell" aria-selected={date ? isSelected : undefined} key={col}>
                        {date ? (
                          <button
                            type="button"
                            tabIndex={active ? 0 : -1}
                            aria-label={
                              mode === 'month'
                                ? `${year}년 ${date.getMonth() + 1}월`
                                : `${year}년 ${month + 1}월 ${date.getDate()}일`
                            }
                            onFocus={() => {
                              if (!active) setCursor(date);
                            }}
                            onKeyDown={navigate}
                            onClick={() => choose(date)}
                            className={cn(
                              'text-body2 hover:bg-primary-100 focus-visible:ring-ring flex h-9 w-full items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset',
                              isSelected
                                ? 'bg-primary-700 text-text-inverse hover:bg-primary-700'
                                : 'text-text-primary',
                            )}
                          >
                            {mode === 'month' ? `${date.getMonth() + 1}월` : date.getDate()}
                          </button>
                        ) : (
                          <div className="h-9" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p id={helpId} className="text-caption text-text-tertiary mt-3">
              방향키로 이동 · Enter로 선택 · Esc로 닫기
            </p>
            <Popover.Close asChild>
              <Button variant="ghost" className="mt-2 w-full">
                닫기
              </Button>
            </Popover.Close>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
