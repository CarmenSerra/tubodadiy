"use client";

import Link from "next/link";
import { ArrowRightIcon, CalendarPlusIcon, ClockIcon, MapPinIcon } from "lucide-react";

import {
  CATEGORY_INFO,
  dayNumber,
  groupAppointments,
  monthShort,
  relativeDay,
} from "@/components/appointments/appointment-model";
import { appointmentsCollection, mapAppointment } from "@/lib/firebase/appointments";
import { useCollection } from "@/lib/hooks/use-collection";
import { cn } from "@/lib/utils";
import { CARD, FOCUS, IconCircle, LINK } from "./ui";

const MAX_SHOWN = 3;

/**
 * «Próximas citas»: las 3 siguientes de la agenda del plan, con enlace para
 * abrirla. Sin citas, una invitación suave a apuntar la primera; mientras
 * carga o si falla, no se pinta nada (la home no debe saltar ni alarmar).
 */
export function UpcomingAppointments({ planId }: { planId: string }) {
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
          Próximas citas
        </h2>
        <Link href={agendaHref} className={cn(CARD, FOCUS, "group flex items-center gap-4 p-4 transition-colors hover:border-line-strong hover:bg-surface-alt motion-reduce:transition-none sm:p-5")}>
          <IconCircle tone="lilac">
            <CalendarPlusIcon />
          </IconCircle>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold text-ink">
              Agenda tu primera visita o prueba
            </span>
            <span className="block text-sm text-ink-muted">
              Lugares, vestuario, degustaciones y reuniones, todo en un sitio.
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
        Próximas citas
      </h2>
      <div className={cn(CARD, "p-2 sm:p-3")}>
        <ul>
          {shown.map((a) => {
            const Icon = CATEGORY_INFO[a.category].icon;
            const rel = relativeDay(a.date);
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
                    <span className="font-display text-xl font-semibold leading-none tabular-nums">{dayNumber(a.date)}</span>
                    <span className="mt-0.5 text-[0.7rem] font-medium uppercase tracking-wide">{monthShort(a.date)}</span>
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
            {more > 0 ? `y ${more} más` : ""}
          </span>
          <Link href={agendaHref} className={cn(LINK, "inline-flex items-center gap-1.5 text-sm")}>
            Abrir la agenda
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
