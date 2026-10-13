"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowRightIcon, CalendarPlusIcon, ClockIcon, MapPinIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { CATEGORY_INFO, groupAppointments } from "@/components/appointments/appointment-model";
import { dateFnsLocale } from "@/lib/date-locale";
import { appointmentsCollection, mapAppointment } from "@/lib/firebase/appointments";
import { useCollection } from "@/lib/hooks/use-collection";
import { type Lang } from "@/lib/i18n/config";
import { parseDateOnly } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/provider";
import { cn, daysUntil } from "@/lib/utils";
import { CARD, FOCUS, IconCircle, LINK } from "./ui";

const MAX_SHOWN = 3;

/** «Hoy», «Mañana», «En 5 días»; null si ya pasó o no hay fecha. */
function relativeDay(date: string, t: TFunction): string | null {
  const days = daysUntil(date);
  if (days === null || days < 0) return null;
  if (days === 0) return t("appointments.today");
  if (days === 1) return t("appointments.tomorrow");
  return t("appointments.inDays", { count: days });
}

/** Número del día y mes abreviado («12», «jun») para la insignia de la fecha. */
function dayBadge(date: string, lang: Lang): { day: string; month: string } {
  const d = parseDateOnly(date);
  if (!d) return { day: "–", month: "" };
  return { day: String(d.getDate()), month: format(d, "MMM", { locale: dateFnsLocale(lang) }).replace(/\./g, "") };
}

/**
 * «Próximas citas»: las 3 siguientes de la agenda del plan, con enlace para
 * abrirla. Sin citas, una invitación suave a apuntar la primera; mientras
 * carga o si falla, no se pinta nada (la home no debe saltar ni alarmar).
 */
export function UpcomingAppointments({ planId }: { planId: string }) {
  const { t } = useTranslation("dashboard");
  const { lang } = useLanguage();
  const { data, loading, error } = useCollection(appointmentsCollection(planId), mapAppointment);
  if (loading || error) return null;

  const agendaHref = `/plan/${planId}?citas=1`;
  const { upcoming } = groupAppointments(data);
  const shown = upcoming.slice(0, MAX_SHOWN);
  const more = upcoming.length - shown.length;

  if (shown.length === 0) {
    return (
      <section aria-labelledby="appointments-title">
        <h2 id="appointments-title" className="mb-3 font-display text-lg font-semibold text-ink">
          {t("appointments.title")}
        </h2>
        <Link href={agendaHref} className={cn(CARD, FOCUS, "group flex items-center gap-4 p-4 transition-colors hover:border-line-strong hover:bg-surface-alt motion-reduce:transition-none sm:p-5")}>
          <IconCircle tone="lilac">
            <CalendarPlusIcon />
          </IconCircle>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold text-ink">
              {t("appointments.emptyTitle")}
            </span>
            <span className="block text-sm text-ink-muted">
              {t("appointments.emptyText")}
            </span>
          </span>
          <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="appointments-title">
      <h2 id="appointments-title" className="mb-3 font-display text-lg font-semibold text-ink">
        {t("appointments.title")}
      </h2>
      <div className={cn(CARD, "p-2 sm:p-3")}>
        <ul>
          {shown.map((a) => {
            const Icon = CATEGORY_INFO[a.category].icon;
            const rel = relativeDay(a.date, t);
            const badge = dayBadge(a.date, lang);
            return (
              <li key={a.id}>
                <Link
                  href={agendaHref}
                  className={cn(
                    FOCUS,
                    "flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-lilac-soft motion-reduce:transition-none sm:gap-4 sm:px-3"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-lilac-mid py-1.5 text-ink-on-tint"
                  >
                    <span className="font-display text-xl font-semibold leading-none tabular-nums">{badge.day}</span>
                    <span className="mt-0.5 text-[0.7rem] font-medium uppercase tracking-wide">{badge.month}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <Icon aria-hidden="true" className="size-4 shrink-0 text-ink-on-tint" />
                      <span className="truncate font-display text-base font-semibold text-ink">{a.title}</span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-muted">
                      {rel && <span className="font-medium text-green">{rel}</span>}
                      {a.time && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <ClockIcon aria-hidden="true" className="size-3.5" />
                          {a.time}
                        </span>
                      )}
                      {a.place.trim() && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
                          <span className="truncate">{a.place.trim()}</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2 sm:px-3">
          <span className="text-sm text-ink-muted">
            {more > 0 ? t("appointments.more", { count: more }) : ""}
          </span>
          <Link href={agendaHref} className={cn(LINK, "inline-flex items-center gap-1.5 text-sm")}>
            {t("appointments.open")}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
