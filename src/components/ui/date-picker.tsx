"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const VALUE_FORMAT = "yyyy-MM-dd";
const WEEK = { weekStartsOn: 1 as const, locale: es };
const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function parseValue(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = parse(value, VALUE_FORMAT, new Date());
  return isValid(parsed) ? parsed : null;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Mueve `date` a otro mes/año conservando el día (recortado al último día válido). */
function withMonth(date: Date, year: number, month: number) {
  const target = new Date(year, month, 1);
  const day = Math.min(date.getDate(), endOfMonth(target).getDate());
  return new Date(year, month, day);
}

const NAV_BUTTON =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[#4E6A5A] transition-colors outline-none hover:bg-[#D2D7CB] hover:text-[#26413C] focus-visible:ring-2 focus-visible:ring-[#A38ED2] disabled:pointer-events-none disabled:opacity-40";
const TEXT_BUTTON =
  "rounded-md px-2 py-1 text-sm font-medium text-[#4E6A5A] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#A38ED2]";

export interface CalendarPanelProps {
  /** Fecha en formato `yyyy-MM-dd`, o cadena vacía. */
  value: string;
  /** Recibe `yyyy-MM-dd` al elegir un día, o cadena vacía al pulsar "Borrar". */
  onChange: (value: string) => void;
  /** Primera fecha seleccionable, `yyyy-MM-dd`. */
  min?: string;
  /** Lleva el foco al día al montarse (para popovers). */
  autoFocus?: boolean;
  className?: string;
}

/**
 * Calendario de marca (días, meses, "Borrar" y "Hoy") sin envoltorio: sirve
 * tanto dentro del popover de `DatePicker` como incrustado en otros popovers.
 */
export function CalendarPanel({ value, onChange, min, autoFocus, className }: CalendarPanelProps) {
  const selected = React.useMemo(() => parseValue(value), [value]);
  const minDate = React.useMemo(() => {
    const parsed = parseValue(min);
    return parsed ? startOfDay(parsed) : null;
  }, [min]);

  const [view, setView] = React.useState<"days" | "months">("days");
  // Fecha con el foco del teclado; el mes visible se deriva de ella.
  const [focusDate, setFocusDate] = React.useState<Date>(() => {
    const initial = selected ?? new Date();
    return minDate && initial < minDate ? minDate : initial;
  });
  const rootRef = React.useRef<HTMLDivElement>(null);
  const focusPending = React.useRef(false);

  const isDisabledDay = React.useCallback(
    (day: Date) => minDate !== null && day < minDate,
    [minDate]
  );

  const requestFocus = () => {
    focusPending.current = true;
  };

  // Tras un cambio con teclado, lleva el foco real a la celda con tabindex 0.
  React.useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    rootRef.current?.querySelector<HTMLElement>('[data-roving="true"]')?.focus();
  }, [focusDate, view]);

  // Al montarse (el popover monta su contenido al abrir) lleva el foco al día.
  React.useEffect(() => {
    if (autoFocus) {
      rootRef.current?.querySelector<HTMLElement>('[data-roving="true"]')?.focus();
    }
  }, [autoFocus]);

  const commit = (day: Date) => {
    if (isDisabledDay(day)) return;
    onChange(format(day, VALUE_FORMAT));
  };

  const monthStart = startOfMonth(focusDate);
  const weeks = React.useMemo(() => {
    // Solo las semanas del mes (4–6): así el calendario cabe sobre/bajo el
    // campo dentro del diálogo, incluso en pantallas bajas.
    const first = startOfWeek(monthStart, WEEK);
    const last = endOfWeek(endOfMonth(monthStart), WEEK);
    const count = Math.round((last.getTime() - first.getTime()) / (7 * 86400000));
    return Array.from({ length: count }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d))
    );
  }, [monthStart]);

  const today = new Date();
  const prevMonthBlocked = minDate !== null && endOfMonth(addMonths(monthStart, -1)) < minDate;
  const prevYearBlocked =
    minDate !== null && new Date(focusDate.getFullYear() - 1, 11, 31) < minDate;

  const onDayKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    let next: Date | null = null;
    switch (event.key) {
      case "ArrowLeft":
        next = addDays(focusDate, -1);
        break;
      case "ArrowRight":
        next = addDays(focusDate, 1);
        break;
      case "ArrowUp":
        next = addDays(focusDate, -7);
        break;
      case "ArrowDown":
        next = addDays(focusDate, 7);
        break;
      case "Home":
        next = startOfWeek(focusDate, WEEK);
        break;
      case "End":
        next = endOfWeek(focusDate, WEEK);
        break;
      case "PageUp":
        next = event.shiftKey ? addYears(focusDate, -1) : addMonths(focusDate, -1);
        break;
      case "PageDown":
        next = event.shiftKey ? addYears(focusDate, 1) : addMonths(focusDate, 1);
        break;
    }
    if (next) {
      event.preventDefault();
      requestFocus();
      setFocusDate(next);
    }
  };

  const onMonthKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
    const step = steps[event.key];
    if (step === undefined) return;
    const month = focusDate.getMonth() + step;
    if (month < 0 || month > 11) return;
    event.preventDefault();
    requestFocus();
    setFocusDate(withMonth(focusDate, focusDate.getFullYear(), month));
  };

  const monthLabel = capitalize(format(focusDate, "LLLL yyyy", { locale: es }));

  return (
    <div ref={rootRef} className={className}>
    <div className="mb-1 flex items-center justify-between gap-1">
      <button
        type="button"
        className={NAV_BUTTON}
        aria-label={view === "days" ? "Mes anterior" : "Año anterior"}
        disabled={view === "days" ? prevMonthBlocked : prevYearBlocked}
        onClick={() => setFocusDate(view === "days" ? addMonths(focusDate, -1) : addYears(focusDate, -1))}
      >
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      <button
        type="button"
        aria-live="polite"
        aria-label={
          view === "days"
            ? `${monthLabel}. Cambiar mes y año`
            : `${focusDate.getFullYear()}. Volver a los días`
        }
        className="font-display min-w-0 flex-1 rounded-full px-3 py-1.5 text-lg leading-tight font-medium text-[#26413C] outline-none transition-colors hover:bg-[#D2D7CB] focus-visible:ring-2 focus-visible:ring-[#A38ED2]"
        onClick={() => {
          requestFocus();
          setView(view === "days" ? "months" : "days");
        }}
      >
        {view === "days" ? monthLabel : focusDate.getFullYear()}
      </button>
      <button
        type="button"
        className={NAV_BUTTON}
        aria-label={view === "days" ? "Mes siguiente" : "Año siguiente"}
        onClick={() => setFocusDate(view === "days" ? addMonths(focusDate, 1) : addYears(focusDate, 1))}
      >
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </div>

    {view === "days" ? (
      <div role="grid" aria-label={monthLabel} onKeyDown={onDayKeyDown}>
        <div role="row" className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              role="columnheader"
              aria-label={format(addDays(startOfWeek(monthStart, WEEK), i), "EEEE", { locale: es })}
              className="flex h-7 items-center justify-center text-xs font-medium tracking-wide text-[#586C64]"
            >
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].toISOString()} role="row" className="grid grid-cols-7">
            {week.map((day) => {
              const inMonth = isSameMonth(day, monthStart);
              const isSelected = selected !== null && isSameDay(day, selected);
              const isToday = isSameDay(day, today);
              const isFocus = isSameDay(day, focusDate);
              const dayDisabled = isDisabledDay(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  role="gridcell"
                  tabIndex={isFocus ? 0 : -1}
                  data-roving={isFocus ? "true" : undefined}
                  aria-selected={isSelected}
                  aria-disabled={dayDisabled || undefined}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={format(day, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  onClick={() => commit(day)}
                  className={cn(
                    "mx-auto flex size-9 max-w-full items-center justify-center rounded-full text-sm tabular-nums outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-[#A38ED2] focus-visible:ring-offset-1 focus-visible:ring-offset-[#F8F5F0]",
                    inMonth ? "text-[#26413C]" : "text-[#586C64]/75",
                    !dayDisabled && !isSelected && "hover:text-[#26413C]",
                    isToday && !isSelected && "ring-1 ring-inset ring-[#A38ED2]",
                    isToday && !isSelected && "focus-visible:ring-2",
                    !dayDisabled && !isSelected && "hover:bg-[#D2D7CB]",
                    isSelected && "bg-[#927AAC] font-medium text-white",
                    dayDisabled && "cursor-not-allowed text-[#586C64]/40 line-through"
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    ) : (
      <div role="group" aria-label="Meses" className="grid grid-cols-3 gap-2" onKeyDown={onMonthKeyDown}>
        {Array.from({ length: 12 }, (_, month) => {
          const date = new Date(focusDate.getFullYear(), month, 1);
          const isCurrent = month === focusDate.getMonth();
          const isSelectedMonth =
            selected !== null &&
            selected.getFullYear() === date.getFullYear() &&
            selected.getMonth() === month;
          const monthDisabled = minDate !== null && endOfMonth(date) < minDate;
          return (
            <button
              key={month}
              type="button"
              tabIndex={isCurrent ? 0 : -1}
              data-roving={isCurrent ? "true" : undefined}
              disabled={monthDisabled}
              aria-pressed={isSelectedMonth}
              aria-label={capitalize(format(date, "LLLL yyyy", { locale: es }))}
              onClick={() => {
                requestFocus();
                setFocusDate(withMonth(focusDate, date.getFullYear(), month));
                setView("days");
              }}
              className={cn(
                "flex h-10 items-center justify-center rounded-full text-sm outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-[#A38ED2]",
                "disabled:pointer-events-none disabled:text-[#586C64]/40",
                isSelectedMonth
                  ? "bg-[#927AAC] font-medium text-white"
                  : "text-[#26413C] hover:bg-[#D2D7CB]",
                !isSelectedMonth &&
                  isSameMonth(date, today) &&
                  "ring-1 ring-inset ring-[#A38ED2] focus-visible:ring-2"
              )}
            >
              {capitalize(format(date, "LLL", { locale: es })).replace(".", "")}
            </button>
          );
        })}
      </div>
    )}

    <div className="mt-2 flex min-h-8 items-center justify-between border-t border-[#E5DDEC] pt-2">
      {selected ? (
        <button
          type="button"
          className={TEXT_BUTTON}
          onClick={() => onChange("")}
        >
          Borrar
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        className={cn(TEXT_BUTTON, "disabled:pointer-events-none disabled:opacity-40")}
        disabled={isDisabledDay(startOfDay(today))}
        onClick={() => commit(startOfDay(today))}
      >
        Hoy
      </button>
    </div>
    </div>
  );
}

/** Superficie común de los popovers de marca (calendario, editores de plan…). */
export const BRAND_POPOVER_SURFACE =
  "max-h-[var(--radix-popover-content-available-height)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-[#E5DDEC] bg-[#F8F5F0] p-3 text-[#26413C] shadow-[0_4px_16px_rgba(38,65,60,0.06)]";

/** Popover con el calendario de marca, anclado al elemento que lo dispara. */
export function CalendarPopoverContent({
  align = "start",
  className,
  ...panel
}: Omit<CalendarPanelProps, "autoFocus"> & { align?: "start" | "center" | "end" }) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  return (
    <PopoverContent
      ref={contentRef}
      align={align}
      sideOffset={6}
      collisionPadding={16}
      aria-label="Elegir fecha"
      // El foco se lleva al día aquí (no al montar el panel): dentro de un
      // diálogo modal, antes de este momento su trampa de foco lo devolvería.
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        contentRef.current?.querySelector<HTMLElement>('[data-roving="true"]')?.focus();
      }}
      className={cn(BRAND_POPOVER_SURFACE, "w-[19rem]", className)}
    >
      <CalendarPanel {...panel} />
    </PopoverContent>
  );
}

interface DatePickerProps {
  /** Fecha en formato `yyyy-MM-dd`, o cadena vacía. */
  value: string;
  /** Recibe `yyyy-MM-dd`, o cadena vacía al borrar. */
  onChange: (value: string) => void;
  id?: string;
  "aria-describedby"?: string;
  disabled?: boolean;
  /** Primera fecha seleccionable, `yyyy-MM-dd`. */
  min?: string;
  placeholder?: string;
  /** Clases del disparador (altura, borde, radio…) para casar con los inputs vecinos. */
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  id,
  "aria-describedby": ariaDescribedBy,
  disabled,
  min,
  placeholder = "Elige una fecha",
  className,
}: DatePickerProps) {
  const selected = React.useMemo(() => parseValue(value), [value]);
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          data-slot="date-picker-trigger"
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-left text-sm shadow-sm transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "data-[state=open]:ring-2 data-[state=open]:ring-[#927AAC]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate", !selected && "text-[#586C64]")}>
            {selected ? format(selected, "d 'de' MMMM 'de' yyyy", { locale: es }) : placeholder}
          </span>
          <CalendarDays aria-hidden className="size-4 shrink-0 text-[#927AAC]" />
        </button>
      </PopoverTrigger>
      <CalendarPopoverContent
        value={value}
        min={min}
        onChange={(next) => {
          onChange(next);
          setOpen(false);
        }}
      />
    </Popover>
  );
}
