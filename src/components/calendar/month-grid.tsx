"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { TYPE_META, monthWeeks, type CalendarEvent } from "@/components/calendar/calendar-model";
import { FOCUS } from "@/components/dashboard/ui";
import type { Lang } from "@/lib/i18n/config";
import { dateFormatter, parseDateOnly } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

const MAX_CHIPS = 2;
const MAX_DOTS = 4;

/** Lunes a domingo, en el idioma de la interfaz (2024-01-01 fue lunes). */
function weekdayNames(lang: Lang): { short: string; long: string }[] {
  const short = dateFormatter(lang, { weekday: "short" });
  const long = dateFormatter(lang, { weekday: "long" });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i);
    return { short: short.format(d).replace(/\./g, ""), long: long.format(d) };
  });
}

/**
 * Cuadrícula del mes. Cada día es un botón (≥ 44 px) que lo selecciona; en
 * pantallas anchas enseña los dos primeros eventos y en móvil, puntos de color
 * (el detalle sale en el panel del día).
 */
export function MonthGrid({
  monthStart,
  byDate,
  selected,
  today,
  lang,
  onSelect,
}: {
  monthStart: Date;
  byDate: ReadonlyMap<string, CalendarEvent[]>;
  selected: string;
  today: string;
  lang: Lang;
  onSelect: (date: string) => void;
}) {
  const { t } = useTranslation("calendar");
  const weeks = React.useMemo(() => monthWeeks(monthStart), [monthStart]);
  const names = React.useMemo(() => weekdayNames(lang), [lang]);
  const label = dateFormatter(lang, { month: "long", year: "numeric" }).format(monthStart);
  const dayLabel = dateFormatter(lang, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div role="group" aria-label={t("month.gridLabel", { month: label })} className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {names.map((name) => (
          <span key={name.long} className="py-1 text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
            {name.short}
          </span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0].date} className="grid grid-cols-7 gap-1">
          {week.map((cell) => {
            const events = byDate.get(cell.date) ?? [];
            const isSelected = cell.date === selected;
            const isToday = cell.date === today;
            const date = parseDateOnly(cell.date);
            const readable = date ? dayLabel.format(date) : cell.date;
            const aria =
              events.length > 0
                ? t("month.dayAria", { date: readable, count: events.length })
                : t("month.dayAriaNone", { date: readable });
            const types = [...new Set(events.map((e) => e.type))];
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => onSelect(cell.date)}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={aria}
                className={cn(
                  FOCUS,
                  "flex min-h-14 min-w-0 flex-col items-stretch gap-1 rounded-xl border-2 p-1 text-left transition-colors motion-reduce:transition-none sm:min-h-24 sm:p-1.5",
                  isSelected ? "border-lilac bg-lilac-soft" : "border-line bg-surface hover:bg-lilac-soft/60",
                  !cell.inMonth && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center self-start rounded-full text-sm tabular-nums",
                    isToday ? "bg-cta font-semibold text-on-cta" : "font-medium text-ink"
                  )}
                >
                  {cell.day}
                </span>
                {/* Móvil: puntos por tipo. */}
                <span aria-hidden="true" className="flex flex-wrap gap-1 sm:hidden">
                  {types.slice(0, MAX_DOTS).map((type) => (
                    <span key={type} className={cn("size-2 rounded-full", TYPE_META[type].dot)} />
                  ))}
                </span>
                {/* Escritorio: los primeros eventos. */}
                <span aria-hidden="true" className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {events.slice(0, MAX_CHIPS).map((event) => {
                    const meta = TYPE_META[event.type];
                    const Icon = meta.icon;
                    return (
                      <span
                        key={event.uid}
                        className={cn(
                          "flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-xs leading-tight",
                          meta.chip,
                          event.done && "line-through opacity-70"
                        )}
                      >
                        <Icon className="size-3 shrink-0" />
                        <span className="truncate">{event.title}</span>
                      </span>
                    );
                  })}
                  {events.length > MAX_CHIPS && (
                    <span className="px-1 text-xs text-ink-muted">{t("month.more", { count: events.length - MAX_CHIPS })}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
