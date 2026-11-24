import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { ko } from 'date-fns/locale/ko';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover } from 'radix-ui';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type DatePickerProps = {
  id?: string;
  name?: string;
  value?: string | null;
  onChange: (value: string) => void;
  mode?: 'date' | 'month';
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  required?: boolean;
  separator?: '-' | '.';
  'aria-invalid'?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
  triggerClassName?: string;
};

const pad = (value: number) => String(value).padStart(2, '0');

function parseDate(value: string | null | undefined, mode: 'date' | 'month') {
  if (!value || !(mode === 'month' ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/).test(value))
    return null;
  const [year, month, day = 1] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function DatePicker({
  id,
  name,
  value,
  onChange,
  mode = 'date',
  minYear = 1950,
  maxYear = new Date().getFullYear() + 10,
  disabled = false,
  required = false,
  separator = '-',
  className,
  triggerClassName,
  'aria-invalid': ariaInvalid = false,
  'aria-label': ariaLabel = '날짜 선택',
  'aria-describedby': describedBy,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parseDate(value, mode) ?? new Date());
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  const valueId = useId();
  const selected = parseDate(value, mode);
  const selectedValue = selected ? (value ?? '') : '';
  const upperYear = Math.max(minYear, maxYear);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const years = Array.from({ length: upperYear - minYear + 1 }, (_, index) => upperYear - index);
  const visibleValue = selectedValue.replaceAll('-', separator);
  const placeholder = mode === 'month' ? `YYYY${separator}MM` : `YYYY${separator}MM${separator}DD`;

  function clampMonth(date: Date) {
    return new Date(Math.min(upperYear, Math.max(minYear, date.getFullYear())), date.getMonth(), 1);
  }

  function changeOpen(next: boolean) {
    if (next) setCursor(clampMonth(parseDate(value, mode) ?? new Date()));
    setOpen(next);
  }

  useEffect(() => {
    if (shouldFocus.current) {
      gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
      shouldFocus.current = false;
    }
  }, [cursor]);

  function navigateMonths(event: KeyboardEvent<HTMLButtonElement>) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
      ArrowDown: 3,
      Home: -(month % 3),
      End: 2 - (month % 3),
      PageUp: -12,
      PageDown: 12,
    };
    if (!(event.key in offsets)) return;

    event.preventDefault();
    const target = new Date(year, month + offsets[event.key], 1);
    const earliest = new Date(minYear, 0, 1);
    const latest = new Date(upperYear, 11, 1);
    shouldFocus.current = true;
    setCursor(new Date(Math.min(latest.getTime(), Math.max(earliest.getTime(), target.getTime()))));
  }

  function choose(date: Date) {
    const monthValue = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
    onChange(mode === 'month' ? monthValue : `${monthValue}-${pad(date.getDate())}`);
    setOpen(false);
  }

  return (
    <div className={cn('w-full', className)}>
      <input type="hidden" name={name} value={selectedValue} disabled={disabled} />
      <span id={valueId} className="sr-only">
        {visibleValue || '선택한 날짜 없음'}
      </span>
      <Popover.Root open={open && !disabled} onOpenChange={changeOpen} modal>
        <Popover.Trigger asChild>
          <Button
            id={id}
            type="button"
            role="combobox"
            aria-haspopup="dialog"
            aria-required={required}
            aria-readonly="true"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-label={ariaLabel}
            aria-describedby={[describedBy, valueId].filter(Boolean).join(' ')}
            className={cn(
              'border-border-default bg-card text-body2 text-text-primary hover:bg-bg-secondary h-12 w-full justify-start rounded-lg px-4 shadow-none',
              !selectedValue && 'text-text-tertiary',
              ariaInvalid && 'border-error focus-visible:ring-error/20',
              triggerClassName,
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left">{visibleValue || placeholder}</span>
            <CalendarIcon aria-hidden="true" className="text-text-tertiary size-4 shrink-0" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            aria-label={`${ariaLabel} 달력`}
            align="start"
            sideOffset={8}
            collisionPadding={16}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
            }}
            className="border-border-light bg-card z-50 w-[304px] max-w-[calc(100vw-2rem)] rounded-lg border p-3 shadow-md"
          >
            <div className="mb-3 flex items-center gap-2">
              <Button
                size="icon-xs"
                variant="ghost"
                className="size-8"
                disabled={year === minYear && (mode === 'month' || month === 0)}
                aria-label={mode === 'month' ? '이전 연도' : '이전 달'}
                onClick={() => setCursor(new Date(year, month - (mode === 'month' ? 12 : 1), 1))}
              >
                <ChevronLeft />
              </Button>
              <Select
                value={String(year)}
                onValueChange={(nextYear) => setCursor(new Date(Number(nextYear), month, 1))}
              >
                <SelectTrigger
                  aria-label="연도 선택"
                  className={mode === 'date' ? 'w-25 shrink-0 px-2.5' : 'flex-1'}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent aria-label="연도 선택">
                  {years.map((item) => (
                    <SelectItem key={item} value={String(item)}>
                      {item}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mode === 'date' ? (
                <Select
                  value={String(month)}
                  onValueChange={(nextMonth) => setCursor(new Date(year, Number(nextMonth), 1))}
                >
                  <SelectTrigger aria-label="월 선택" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent aria-label="월 선택">
                    {Array.from({ length: 12 }, (_, item) => (
                      <SelectItem key={item} value={String(item)}>
                        {item + 1}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                size="icon-xs"
                variant="ghost"
                className="size-8"
                disabled={year === upperYear && (mode === 'month' || month === 11)}
                aria-label={mode === 'month' ? '다음 연도' : '다음 달'}
                onClick={() => setCursor(new Date(year, month + (mode === 'month' ? 12 : 1), 1))}
              >
                <ChevronRight />
              </Button>
            </div>
            <p aria-live="polite" className="sr-only">
              {year}년 {mode === 'date' ? `${month + 1}월` : ''}
            </p>
            {mode === 'month' ? (
              <div ref={gridRef} role="grid" aria-label={`${year}년 월 선택`}>
                {Array.from({ length: 4 }, (_, row) => (
                  <div role="row" key={row} className="grid grid-cols-3 gap-1">
                    {Array.from({ length: 3 }, (_, col) => {
                      const itemMonth = row * 3 + col;
                      const isSelected =
                        selected?.getFullYear() === year && selected.getMonth() === itemMonth;
                      return (
                        <div role="gridcell" aria-selected={isSelected} key={col}>
                          <button
                            type="button"
                            tabIndex={month === itemMonth ? 0 : -1}
                            aria-label={`${year}년 ${itemMonth + 1}월`}
                            onFocus={() => {
                              if (month !== itemMonth) setCursor(new Date(year, itemMonth, 1));
                            }}
                            onKeyDown={navigateMonths}
                            onClick={() => choose(new Date(year, itemMonth, 1))}
                            className={cn(
                              'text-body2 hover:bg-bg-tertiary focus-visible:ring-ring flex h-10 w-full items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset',
                              isSelected
                                ? 'bg-primary-700 text-text-inverse hover:bg-primary-700'
                                : 'text-text-primary',
                            )}
                          >
                            {itemMonth + 1}월
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div ref={gridRef}>
                <Calendar
                  mode="single"
                  required
                  selected={selected ?? undefined}
                  onSelect={choose}
                  month={cursor}
                  onMonthChange={setCursor}
                  startMonth={new Date(minYear, 0, 1)}
                  endMonth={new Date(upperYear, 11, 1)}
                  disabled={{ before: new Date(minYear, 0, 1), after: new Date(upperYear, 11, 31) }}
                  locale={ko}
                  hideNavigation
                  classNames={{ month_caption: 'sr-only' }}
                  labels={{
                    labelDayButton: (date) =>
                      `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`,
                    labelPrevious: () => '이전 달',
                    labelNext: () => '다음 달',
                  }}
                />
              </div>
            )}
            <Popover.Close asChild>
              <Button variant="ghost" className="mt-2 h-9 w-full">
                닫기
              </Button>
            </Popover.Close>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
