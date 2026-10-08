"use client";

import * as React from "react";
import { addDays, format, parse } from "date-fns";
import { ArrowDownIcon, ArrowUpIcon, MapIcon, PlaneTakeoffIcon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY } from "@/components/dashboard/ui";
import { DeleteIconButton, ICON_BUTTON } from "@/components/guests/brand-dialog";
import { DayFormDialog, EditDayTrigger } from "@/components/honeymoon/day-form-dialog";
import { EmptyState, HM_CARD, HM_TEXT_BUTTON, SectionHeader } from "@/components/honeymoon/ui";
import { deleteDay, restoreDay, swapDays } from "@/lib/firebase/honeymoon";
import { nextOrder, type TripDay } from "@/lib/honeymoon-model";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });

function longDate(value: string): string {
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "";
  const text = DATE_FORMAT.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Día siguiente al último con fecha (para sugerirlo al crear uno nuevo). */
function suggestedDate(days: TripDay[]): string {
  const last = [...days].reverse().find((d) => d.date);
  if (!last) return "";
  const parsed = parse(last.date, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? "" : format(addDays(parsed, 1), "yyyy-MM-dd");
}

const MOVE_BUTTON = cn(ICON_BUTTON, "disabled:pointer-events-none disabled:opacity-40");

export function Itinerary({
  planId,
  days,
  announce,
}: {
  planId: string;
  days: TripDay[];
  announce: (message: string) => void;
}) {
  const orderForNew = nextOrder(days.map((d) => d.order));
  const listRef = React.useRef<HTMLOListElement>(null);
  const pendingFocus = React.useRef<{ id: string; dir: "up" | "down" } | null>(null);

  // Al reordenar, el nodo se mueve en el DOM y el foco se pierde: se devuelve a su botón.
  React.useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const find = (dir: string) =>
      listRef.current?.querySelector<HTMLButtonElement>(`[data-move="${target.id}:${dir}"]`);
    const preferred = find(target.dir);
    (preferred && !preferred.disabled ? preferred : find(target.dir === "up" ? "down" : "up"))?.focus();
  }, [days]);

  async function handleMove(index: number, delta: -1 | 1) {
    const day = days[index];
    const other = days[index + delta];
    if (!other) return;
    pendingFocus.current = { id: day.id, dir: delta < 0 ? "up" : "down" };
    try {
      await swapDays(planId, day, other);
      announce(`Día ${index + 1} movido a la posición ${index + 1 + delta}`);
    } catch {
      pendingFocus.current = null;
      toast.error("No se ha podido mover el día.");
    }
  }

  async function handleDelete(day: TripDay, index: number) {
    try {
      await deleteDay(planId, day.id);
      toastWithUndo(`Día ${index + 1} eliminado`, () => restoreDay(planId, day));
      announce(`Día ${index + 1} eliminado`);
    } catch {
      toast.error("No se ha podido eliminar el día.");
    }
  }

  const addDialog = (
    <DayFormDialog planId={planId} nextOrder={orderForNew} defaultDate={suggestedDate(days)} />
  );

  return (
    <section aria-labelledby="hm-itinerario-title" className="flex flex-col gap-4">
      <SectionHeader
        id="hm-itinerario-title"
        icon={<MapIcon />}
        title="Itinerario por días"
        description="Qué hacer cada día, con su lugar y sus horas."
        actions={days.length > 0 ? addDialog : undefined}
      />

      {days.length === 0 ? (
        <EmptyState
          scene="isla"
          title="El itinerario está en blanco"
          action={
            <DayFormDialog
              planId={planId}
              nextOrder={orderForNew}
              trigger={
                <button type="button" className={CTA_PRIMARY}>
                  Añadir el primer día
                </button>
              }
            />
          }
        >
          Ve montando el viaje día a día: dónde dormir, qué ver y a qué hora sale cada plan. Siempre podrás
          cambiar el orden.
        </EmptyState>
      ) : (
        <div>
          <div
            aria-hidden="true"
            className="mb-2 flex w-fit items-center gap-2 rounded-full bg-surface py-0.5 pl-0.5 pr-4 text-sm font-medium text-ink-muted shadow-pop ring-1 ring-line"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-lilac-mid text-ink-on-tint">
              <PlaneTakeoffIcon className="size-5" />
            </span>
            Despegamos
          </div>
          <ol ref={listRef} className="flex flex-col" aria-label="Días del viaje">
            {days.map((day, index) => {
              const label = `el día ${index + 1}${day.place ? ` (${day.place})` : ""}`;
              const date = longDate(day.date);
              return (
                <li key={day.id} className="relative pb-4 pl-14 last:pb-0 sm:pl-16">
                  {/* Raíl punteado entre los días */}
                  {index < days.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-5 top-12 border-l-[3px] border-dotted border-rail"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-3 flex size-10 items-center justify-center rounded-full bg-cta font-display text-base font-semibold text-on-cta shadow-pop"
                  >
                    {index + 1}
                  </span>
                  <article className={cn(HM_CARD, "p-4 sm:p-5")} aria-label={`Día ${index + 1}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-muted">
                          Día {index + 1}
                          {date && <span> · {date}</span>}
                        </p>
                        <h3 className="break-words font-display text-xl font-semibold leading-snug text-ink-strong">
                          {day.place}
                        </h3>
                      </div>
                      <div className="-mr-2 -mt-1 flex shrink-0">
                        <button
                          type="button"
                          data-move={`${day.id}:up`}
                          className={MOVE_BUTTON}
                          disabled={index === 0}
                          onClick={() => handleMove(index, -1)}
                          aria-label={`Subir ${label}`}
                        >
                          <ArrowUpIcon aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          data-move={`${day.id}:down`}
                          className={MOVE_BUTTON}
                          disabled={index === days.length - 1}
                          onClick={() => handleMove(index, 1)}
                          aria-label={`Bajar ${label}`}
                        >
                          <ArrowDownIcon aria-hidden="true" />
                        </button>
                        <DayFormDialog
                          planId={planId}
                          day={day}
                          nextOrder={orderForNew}
                          trigger={<EditDayTrigger label={label} />}
                        />
                        <DeleteIconButton
                          ariaLabel={`Eliminar ${label}`}
                          onDelete={() => handleDelete(day, index)}
                        />
                      </div>
                    </div>

                    {day.activities.length > 0 ? (
                      <ul className="mt-3 flex flex-col gap-2 border-t border-dashed border-line pt-3">
                        {day.activities.map((a) => (
                          <li key={a.id} className="flex items-baseline gap-3 text-sm">
                            {a.time ? (
                              <span className="w-14 shrink-0 rounded-full bg-lilac-soft px-2 py-0.5 text-center font-medium tabular-nums text-ink">
                                {a.time}
                              </span>
                            ) : (
                              <span aria-hidden="true" className="w-14 shrink-0 text-center text-ink-muted">
                                ·
                              </span>
                            )}
                            <span className="min-w-0 break-words text-ink">{a.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-x-2 border-t border-dashed border-line pt-2 text-sm text-ink-muted">
                        Sin actividades apuntadas.
                        <DayFormDialog
                          planId={planId}
                          day={day}
                          nextOrder={orderForNew}
                          trigger={
                            <button type="button" className={HM_TEXT_BUTTON}>
                              Añadir actividades
                            </button>
                          }
                        />
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
