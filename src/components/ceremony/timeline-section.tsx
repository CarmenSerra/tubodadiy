"use client";

import * as React from "react";
import { CalendarClockIcon, PencilIcon, PlusIcon } from "lucide-react";

import { CeremonySection } from "@/components/ceremony/section";
import { CTA_PRIMARY, CTA_SECONDARY, Skeleton } from "@/components/dashboard/ui";
import {
  dayIndex,
  endMin,
  formatClock,
  formatWeekdayDate,
  sortItems,
} from "@/components/timeline/timeline-model";
import { useTimelineLauncher } from "@/components/timeline/timeline-launcher";
import { usePlanContext } from "@/lib/context/plan-context";
import { mapTimelineItem, timelineItemsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { cn } from "@/lib/utils";

/** «Cronograma del día»: resumen de solo lectura; se edita en el diálogo del cronograma. */
export function TimelineSection() {
  const { planId, plan } = usePlanContext();
  const launcher = useTimelineLauncher();
  const { data, loading, error } = useCollection(timelineItemsQuery(planId), mapTimelineItem);
  const items = React.useMemo(() => sortItems(data), [data]);
  const dateText = formatWeekdayDate(plan?.weddingDate);
  const open = launcher?.open;

  return (
    <CeremonySection
      id="cronograma"
      icon={<CalendarClockIcon />}
      title="Cronograma del día"
      description={dateText ?? "Hora a hora, el gran día. Aún no tenéis fecha."}
      action={
        items.length > 0 && open ? (
          <button type="button" onClick={open} className={CTA_SECONDARY}>
            <PencilIcon aria-hidden="true" className="size-4" />
            Editar cronograma
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <div role="status" aria-label="Cargando el cronograma" className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-6 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-ink-muted">
          No hemos podido cargar el cronograma. Comprueba tu conexión; tus datos siguen guardados.
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong p-4 sm:p-5">
          <p className="text-sm text-ink-muted">
            Todavía no hay momentos. Podéis partir de una plantilla (preparativos, ceremonia, cóctel,
            banquete, baile…) y ajustar las horas con calma, o empezar desde cero.
          </p>
          {open && (
            <button type="button" onClick={open} className={CTA_PRIMARY}>
              <PlusIcon aria-hidden="true" className="size-4" />
              Crear el cronograma
            </button>
          )}
        </div>
      ) : (
        <ol className="lg:columns-2 lg:gap-x-10">
          {items.map((item) => {
            const day = dayIndex(item.startMin);
            return (
              <li
                key={item.id}
                className="flex break-inside-avoid items-baseline gap-3 border-b border-line py-2.5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative top-0.5 size-2.5 shrink-0 self-center rounded-full border-2 border-lilac",
                    item.highlight ? "bg-lilac" : "bg-surface"
                  )}
                />
                <time className="w-16 shrink-0 font-display text-lg font-semibold tabular-nums text-ink">
                  {formatClock(item.startMin)}
                  {day > 0 && (
                    <span className="ml-0.5 align-middle font-sans text-xs font-medium text-ink-muted">
                      +{day}
                    </span>
                  )}
                </time>
                <span className="min-w-0 break-words text-sm text-ink-strong">
                  <span className={cn(item.highlight && "font-medium text-ink")}>{item.title}</span>
                  {item.durationMin > 0 && (
                    <span className="text-ink-muted">
                      {" "}
                      <span aria-hidden="true">· hasta las </span>
                      <span className="sr-only">hasta las </span>
                      {formatClock(endMin(item))}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </CeremonySection>
  );
}
