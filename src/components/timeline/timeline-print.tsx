"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, Loader2, PrinterIcon } from "lucide-react";

import { RequireAuth } from "@/components/auth/require-auth";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  dayIndex,
  endMin,
  formatClock,
  formatDuration,
  formatWeekdayDate,
  sortItems,
  weddingName,
} from "@/components/timeline/timeline-model";
import { PlanProvider, usePlanContext } from "@/lib/context/plan-context";
import { mapTimelineItem, timelineItemsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import type { TimelineItem } from "@/lib/types";

function DayMark({ day }: { day: number }) {
  if (day <= 0) return null;
  return <sup className="ml-0.5 font-sans text-xs font-medium">+{day}</sup>;
}

function PrintRow({ item }: { item: TimelineItem }) {
  const end = endMin(item);
  const startDay = dayIndex(item.startMin);
  const endDay = dayIndex(end);
  const meta = [
    item.durationMin > 0 ? formatDuration(item.durationMin) : null,
    item.location.trim() || null,
    item.responsible.trim() ? `Responsable: ${item.responsible.trim()}` : null,
  ].filter(Boolean);

  return (
    <li className="grid break-inside-avoid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-5 border-b border-[#26413C]/25 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
      <div className="text-[#26413C]">
        <p className="font-display text-xl font-semibold tabular-nums leading-7">
          {formatClock(item.startMin)}
          <DayMark day={startDay} />
        </p>
        {item.durationMin > 0 && (
          <p className="text-sm tabular-nums">
            → {formatClock(end)}
            {endDay > startDay && <DayMark day={endDay} />}
          </p>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold leading-7 text-[#102D28]">
          {item.title}
          {item.highlight && (
            <span className="ml-2 align-middle font-sans text-xs font-medium uppercase tracking-wide text-[#26413C]">
              ● Momento clave
            </span>
          )}
        </p>
        {meta.length > 0 && <p className="text-sm text-[#26413C]">{meta.join("  ·  ")}</p>}
        {item.notes.trim() && (
          <p className="mt-0.5 whitespace-pre-line break-words text-sm text-[#102D28]">
            {item.notes.trim()}
          </p>
        )}
      </div>
    </li>
  );
}

function PrintDocument() {
  const { planId, plan, loading, isMember } = usePlanContext();
  const { data, loading: itemsLoading, error } = useCollection(
    timelineItemsQuery(planId),
    mapTimelineItem
  );
  const items = React.useMemo(() => sortItems(data), [data]);

  // Abre el diálogo de impresión una sola vez, cuando ya está todo pintado.
  const printed = React.useRef(false);
  const ready = !loading && isMember && !itemsLoading && !error && items.length > 0;
  React.useEffect(() => {
    if (!ready || printed.current) return;
    printed.current = true;
    let cancelled = false;
    const fonts = document.fonts?.ready ?? Promise.resolve();
    fonts.then(() => {
      if (cancelled) return;
      // Un frame más, para que el texto ya esté con su tipografía definitiva.
      requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelled = true;
      // En desarrollo React monta dos veces: deja volver a intentarlo.
      printed.current = false;
    };
  }, [ready]);

  if (loading || itemsLoading) {
    return (
      <div role="status" aria-label="Preparando el cronograma" className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-[#586C64]" />
      </div>
    );
  }

  if (!plan || !isMember) {
    return (
      <p className="mx-auto max-w-md px-4 py-24 text-center text-sm text-[#26413C]">
        No tienes acceso a este plan.
      </p>
    );
  }

  const date = formatWeekdayDate(plan.weddingDate);
  const backHref = `/plan/${planId}?cronograma=1`;

  return (
    <div className="min-h-screen bg-white text-[#102D28]">
      <div className="print:hidden border-b border-[#E5DDEC] bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link href={backHref} className={CTA_SECONDARY}>
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Volver al cronograma
          </Link>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-[#586C64] sm:block">
              Para guardarlo como PDF, elige «Guardar como PDF» al imprimir.
            </p>
            <button type="button" onClick={() => window.print()} className={CTA_PRIMARY}>
              <PrinterIcon aria-hidden="true" className="size-4" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 print:max-w-none print:p-0">
        <header className="border-b-2 border-[#26413C] pb-4">
          <h1 className="font-display text-3xl font-semibold leading-tight text-[#26413C] sm:text-4xl">
            Cronograma del día
          </h1>
          <p className="mt-1 font-display text-lg text-[#102D28]">
            {weddingName(plan.title)}
            {date ? ` · ${date}` : ""}
          </p>
        </header>

        {error ? (
          <p role="alert" className="py-8 text-sm text-[#26413C]">
            No se ha podido cargar el cronograma.
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-sm text-[#26413C]">
            Todavía no hay momentos en el cronograma. Vuelve al plan para añadirlos.
          </p>
        ) : (
          <>
            <ol>
              {items.map((item) => (
                <PrintRow key={item.id} item={item} />
              ))}
            </ol>
            {items.some((i) => dayIndex(endMin(i)) > 0) && (
              <p className="mt-4 text-sm text-[#26413C]">+1: ya de madrugada, del día siguiente.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export function TimelinePrintView({ planId }: { planId: string }) {
  return (
    <RequireAuth>
      <PlanProvider planId={planId}>
        <PrintDocument />
      </PlanProvider>
    </RequireAuth>
  );
}
