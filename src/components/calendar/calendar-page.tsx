"use client";

import * as React from "react";
import { BellIcon, BellOffIcon, CalendarPlusIcon, ChevronLeftIcon, ChevronRightIcon, HeartIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  EVENT_TYPES,
  TYPE_META,
  countByType,
  dateKey,
  filterByTypes,
  groupByDate,
  monthStartOf,
  todayKey,
  toIcsEvents,
  upcomingEvents,
  dayDiff,
  type CalendarEvent,
  type EventType,
} from "@/components/calendar/calendar-model";
import { EventRow } from "@/components/calendar/event-row";
import { MonthGrid } from "@/components/calendar/month-grid";
import { useAgendaNotification } from "@/components/calendar/use-agenda-notification";
import { useCalendarEvents } from "@/components/calendar/use-calendar-events";
import {
  disableTaskNotifications,
  enableTaskNotifications,
  useTaskNotifyState,
} from "@/components/dashboard/task-notifications";
import { CARD, CTA_SECONDARY, FOCUS } from "@/components/dashboard/ui";
import { Bone } from "@/components/plan/plan-shell";
import { usePlanContext } from "@/lib/context/plan-context";
import { downloadBlob, exportFileName } from "@/lib/export/download";
import { ICS_MIME, buildIcs } from "@/lib/export/ics";
import type { Lang } from "@/lib/i18n/config";
import { dateFormatter, parseDateOnly } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

type View = "month" | "upcoming";

const VIEWS: readonly View[] = ["month", "upcoming"];
const MAX_UPCOMING = 80;
const ICON_BUTTON = cn(
  FOCUS,
  "inline-flex size-11 items-center justify-center rounded-full border border-line-strong bg-field text-ink transition-colors hover:bg-lilac-soft motion-reduce:transition-none"
);

const NARROW_QUERY = "(max-width: 639px)";

function subscribeNarrow(onChange: () => void) {
  const media = window.matchMedia(NARROW_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Pantalla de móvil (< 640 px), sin parpadeo ni efectos. */
function useIsNarrow(): boolean {
  return React.useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false
  );
}

const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function CalendarSkeleton() {
  const { t } = useTranslation("calendar");
  return (
    <div className="flex flex-col gap-5" role="status" aria-label={t("page.loading")}>
      <Bone className="h-8 w-48" />
      <Bone className="h-11 w-full max-w-xl rounded-full" />
      <Bone className="h-96 w-full" />
    </div>
  );
}

/** Opt-in de los avisos del navegador (el mismo ajuste que el de las tareas del Resumen). */
function NotifyToggle() {
  const { t } = useTranslation("calendar");
  const state = useTaskNotifyState();
  if (state === "unsupported") return null;
  if (state === "blocked") return <p className="text-sm text-ink-muted">{t("notify.blocked")}</p>;
  const on = state === "on";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <button
        type="button"
        onClick={() => (on ? disableTaskNotifications() : void enableTaskNotifications())}
        className={cn(
          FOCUS,
          "-ml-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft motion-reduce:transition-none"
        )}
      >
        {on ? <BellOffIcon aria-hidden="true" className="size-4" /> : <BellIcon aria-hidden="true" className="size-4" />}
        {on ? t("notify.disable") : t("notify.enable")}
      </button>
      <span className="text-sm text-ink-muted">{on ? t("notify.onHelp") : t("notify.help")}</span>
    </div>
  );
}

/** Etiqueta de un día para encabezados: «Hoy», «Mañana» o «sáb 12 jun». */
function dayHeading(date: string, today: string, lang: Lang, t: (key: string) => string): string {
  const d = parseDateOnly(date);
  const text = d
    ? dateFormatter(lang, { weekday: "short", day: "numeric", month: "short" }).format(d).replace(/\./g, "")
    : date;
  const diff = dayDiff(today, date);
  if (diff === 0) return `${t("upcoming.today")} · ${text}`;
  if (diff === 1) return `${t("upcoming.tomorrow")} · ${text}`;
  return text;
}

function UpcomingList({ events, today, lang }: { events: CalendarEvent[]; today: string; lang: Lang }) {
  const { t } = useTranslation("calendar");
  const upcoming = React.useMemo(() => upcomingEvents(events, today), [events, today]);
  const shown = upcoming.slice(0, MAX_UPCOMING);
  const groups = React.useMemo(() => [...groupByDate(shown)], [shown]);

  if (upcoming.length === 0) {
    return <p className={cn(CARD, "px-5 py-8 text-center text-sm text-ink-muted")}>{t("upcoming.empty")}</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {groups.map(([date, list]) => (
        <section key={date} aria-labelledby={`up-${date}`}>
          <h3 id={`up-${date}`} className="mb-1 px-2 text-sm font-medium text-ink-muted sm:px-3">
            {upperFirst(dayHeading(date, today, lang, (key) => t(key)))}
          </h3>
          <ul className={cn(CARD, "p-1.5 sm:p-2")}>
            {list.map((event) => (
              <li key={event.uid}>
                <EventRow event={event} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {upcoming.length > shown.length && (
        <p className="text-sm text-ink-muted">{t("upcoming.more", { count: upcoming.length - shown.length })}</p>
      )}
    </div>
  );
}

/** Página «Calendario»: citas, tareas con fecha, plazos de pago y el día de la boda. */
export function CalendarPage({ planId }: { planId: string }) {
  const { t } = useTranslation("calendar");
  const { lang } = useLanguage();
  const { plan } = usePlanContext();
  const { events, loading, failed } = useCalendarEvents(planId, plan);

  const today = todayKey();
  const [monthStart, setMonthStart] = React.useState(() => monthStartOf(today));
  const [selected, setSelected] = React.useState(today);
  const [types, setTypes] = React.useState<ReadonlySet<EventType>>(() => new Set(EVENT_TYPES));
  // `null` = sin elegir: en pantallas estrechas se empieza por «Próximos»; después manda lo que elija la persona.
  const [chosenView, setChosenView] = React.useState<View | null>(null);
  const narrow = useIsNarrow();
  const view: View = chosenView ?? (narrow ? "upcoming" : "month");

  useAgendaNotification(planId, loading ? null : events);

  const counts = React.useMemo(() => countByType(events), [events]);
  const visible = React.useMemo(() => filterByTypes(events, types), [events, types]);
  const byDate = React.useMemo(() => groupByDate(visible), [visible]);
  const dayEvents = byDate.get(selected) ?? [];
  const exportable = React.useMemo(() => toIcsEvents(visible, { lang }), [visible, lang]);
  const weddingDate = events.find((e) => e.type === "wedding")?.date ?? null;

  function toggleType(type: EventType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (!next.delete(type)) next.add(type);
      return next;
    });
  }

  function shiftMonth(delta: number) {
    setMonthStart((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function goTo(date: string) {
    setMonthStart(monthStartOf(date));
    setSelected(date);
  }

  function selectDay(date: string) {
    setSelected(date);
    // Un día de un mes vecino lleva a ese mes.
    if (date.slice(0, 7) !== dateKey(monthStart).slice(0, 7)) setMonthStart(monthStartOf(date));
  }

  function exportIcs() {
    try {
      const events = toIcsEvents(visible, { lang, origin: window.location.origin });
      const name = plan?.title.trim() ? t("ics.calendarName", { title: plan.title.trim() }) : t("ics.calendarNameDefault");
      downloadBlob(exportFileName(t("ics.file"), "ics"), buildIcs(events, { calendarName: name }), ICS_MIME);
    } catch {
      toast.error(t("ics.error"));
    }
  }

  if (loading) return <CalendarSkeleton />;

  if (failed) {
    return (
      <div className={cn(CARD, "mx-auto flex max-w-md flex-col items-center p-8 text-center")} role="alert">
        <h2 className="font-display text-xl font-semibold text-ink">{t("page.loadError.title")}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t("page.loadError.text")}</p>
      </div>
    );
  }

  const monthLabel = upperFirst(dateFormatter(lang, { month: "long", year: "numeric" }).format(monthStart));
  const selectedDate = parseDateOnly(selected);
  const selectedLabel = upperFirst(
    selectedDate ? dateFormatter(lang, { weekday: "long", day: "numeric", month: "long" }).format(selectedDate) : selected
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t("page.title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t("page.description")}</p>
        </div>
        <button
          type="button"
          onClick={exportIcs}
          disabled={exportable.length === 0}
          className={cn(CTA_SECONDARY, "h-11 disabled:cursor-not-allowed disabled:opacity-60")}
        >
          <CalendarPlusIcon aria-hidden="true" className="size-4" />
          {t("ics.button")}
        </button>
      </header>

      <div role="group" aria-label={t("filters.label")} className="flex flex-wrap gap-2">
        {EVENT_TYPES.map((type) => {
          const on = types.has(type);
          const Icon = TYPE_META[type].icon;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={on}
              onClick={() => toggleType(type)}
              className={cn(
                FOCUS,
                "inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-medium text-ink transition-colors motion-reduce:transition-none",
                on ? "border-lilac bg-lilac-soft" : "border-line bg-surface hover:bg-lilac-soft/60"
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {t(`types.${type}.label`)}
              <span className="text-ink-muted tabular-nums">{counts[type]}</span>
            </button>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className={cn(CARD, "px-5 py-6 text-center")}>
          <p className="font-display text-lg font-semibold text-ink">{t("empty.title")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{t("empty.text")}</p>
        </div>
      )}

      <div
        role="group"
        aria-label={t("views.label")}
        className="grid h-auto w-full max-w-xs grid-cols-2 gap-1 rounded-2xl bg-surface p-1.5 ring-1 ring-line"
      >
        {VIEWS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setChosenView(value)}
            className={cn(
              FOCUS,
              "min-h-11 rounded-xl px-3 text-sm font-medium transition-colors motion-reduce:transition-none",
              view === value ? "bg-cta text-on-cta" : "text-ink-muted hover:text-ink"
            )}
          >
            {t(`views.${value}`)}
          </button>
        ))}
      </div>

      {view === "month" ? (
        <div className="flex flex-col gap-5">
          <div className={cn(CARD, "flex flex-col gap-3 p-3 sm:p-4")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => shiftMonth(-1)} aria-label={t("month.prev")} className={ICON_BUTTON}>
                  <ChevronLeftIcon aria-hidden="true" className="size-5" />
                </button>
                <button type="button" onClick={() => shiftMonth(1)} aria-label={t("month.next")} className={ICON_BUTTON}>
                  <ChevronRightIcon aria-hidden="true" className="size-5" />
                </button>
              </div>
              <h3 aria-live="polite" className="order-first w-full text-center font-display text-xl font-semibold text-ink sm:order-none sm:w-auto">
                {monthLabel}
              </h3>
              <div className="flex items-center gap-2">
                {weddingDate && (
                  <button
                    type="button"
                    onClick={() => goTo(weddingDate)}
                    className={cn(CTA_SECONDARY, "h-11 px-4")}
                  >
                    <HeartIcon aria-hidden="true" className="size-4" />
                    {t("month.goToWedding")}
                  </button>
                )}
                <button type="button" onClick={() => goTo(today)} className={cn(CTA_SECONDARY, "h-11 px-4")}>
                  {t("month.today")}
                </button>
              </div>
            </div>
            <MonthGrid
              monthStart={monthStart}
              byDate={byDate}
              selected={selected}
              today={today}
              lang={lang}
              onSelect={selectDay}
            />
          </div>

          <section aria-labelledby="cal-day-title">
            <h3 id="cal-day-title" className="mb-2 font-display text-lg font-semibold text-ink">
              {selectedLabel}
            </h3>
            {dayEvents.length === 0 ? (
              <p className={cn(CARD, "px-5 py-6 text-center text-sm text-ink-muted")}>{t("day.empty")}</p>
            ) : (
              <ul className={cn(CARD, "p-1.5 sm:p-2")}>
                {dayEvents.map((event) => (
                  <li key={event.uid}>
                    <EventRow event={event} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <UpcomingList events={visible} today={today} lang={lang} />
      )}

      <div className="flex flex-col gap-1">
        <NotifyToggle />
        <p className="text-sm text-ink-muted">{t("ics.hint")}</p>
      </div>
    </div>
  );
}
