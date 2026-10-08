"use client";

import * as React from "react";
import { Layers2Icon, MapPinIcon, PencilIcon, PlusIcon, UserIcon } from "lucide-react";

import {
  GAP_MIN,
  NUDGE_MIN,
  dayIndex,
  endMin,
  formatClock,
  formatDuration,
  gapsBefore,
  joinTitles,
  overlapsById,
} from "@/components/timeline/timeline-model";
import { ROW_FOCUS } from "@/components/guests/brand-dialog";
import type { TimelineItem } from "@/lib/types";
import { cn } from "@/lib/utils";

// Altura (desde el borde superior de la fila) a la que se alinean la hora, el
// título y el nodo de la línea: así los tres quedan a la misma altura.
const NODE_CENTER = "1.75rem";

/** Marca "+1": la hora cae en la madrugada del día siguiente. */
function DayMark({ day }: { day: number }) {
  if (day <= 0) return null;
  return (
    <span
      className="ml-0.5 inline-flex items-center rounded-full bg-lilac-soft px-1 py-px align-middle font-sans text-xs font-medium leading-4 text-ink"
      title={day === 1 ? "Día siguiente" : `${day} días después`}
    >
      <span aria-hidden="true">+{day}</span>
      <span className="sr-only">{day === 1 ? "del día siguiente" : `${day} días después`}</span>
    </span>
  );
}

const NUDGE_BUTTON = cn(
  "inline-flex h-8 min-w-12 items-center justify-center rounded-full border border-line-strong bg-raised px-2.5 text-sm font-medium text-ink transition-colors",
  "hover:bg-sage-pale disabled:pointer-events-none disabled:opacity-40 pointer-coarse:h-10 pointer-coarse:min-w-14",
  ROW_FOCUS
);

function MomentCard({
  item,
  coincidences,
  canEarlier,
  canLater,
  onEdit,
  onNudge,
}: {
  item: TimelineItem;
  coincidences: string[];
  canEarlier: boolean;
  canLater: boolean;
  onEdit: () => void;
  onNudge: (delta: number) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const notes = item.notes.trim();
  const longNotes = notes.length > 70 || notes.includes("\n");
  const notesId = React.useId();

  return (
    <article
      className={cn(
        "group/card grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 rounded-2xl border bg-surface px-4 py-3.5 transition-colors motion-reduce:transition-none",
        item.highlight ? "border-line-strong" : "border-line hover:border-line-strong"
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar «${item.title}»`}
        className={cn("col-span-2 -m-1 min-w-0 rounded-xl p-1 text-left sm:col-span-1 sm:col-start-1 sm:row-start-1", ROW_FOCUS)}
      >
        <span className="flex items-start gap-2">
          <span className="min-w-0 break-words font-display text-lg font-semibold leading-7 text-ink">
            {item.title}
          </span>
          <PencilIcon
            aria-hidden="true"
            className="mt-2 size-3.5 shrink-0 text-lilac transition-opacity motion-reduce:transition-none pointer-fine:opacity-0 pointer-fine:group-hover/card:opacity-100 pointer-fine:group-focus-within/card:opacity-100"
          />
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-ink-muted">
          <span>{formatDuration(item.durationMin)}</span>
          {item.location.trim() && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="sr-only">Lugar: </span>
              <span className="min-w-0 break-words">{item.location}</span>
            </span>
          )}
          {item.responsible.trim() && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <UserIcon aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="sr-only">Responsable: </span>
              <span className="min-w-0 break-words">{item.responsible}</span>
            </span>
          )}
        </span>
      </button>

      {notes && (
        <div className="col-span-2 text-sm text-ink-muted">
          <p
            id={notesId}
            className={cn("break-words", expanded ? "whitespace-pre-line" : "line-clamp-1")}
          >
            {notes}
          </p>
          {longNotes && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={notesId}
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                "-mx-1 mt-0.5 rounded-md px-1 py-0.5 font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4",
                ROW_FOCUS
              )}
            >
              {expanded ? "Ver menos" : "Ver más"}
            </button>
          )}
        </div>
      )}

      {coincidences.length > 0 && (
        <p className="col-span-2 flex items-start gap-1.5 text-sm text-green">
          <Layers2Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>Coincide con {joinTitles(coincidences)}</span>
        </p>
      )}
      {/* Ajuste fino: en móvil va debajo; en escritorio, arriba a la derecha y solo al pasar el ratón o con foco. */}
      <div
        role="group"
        aria-label={`Ajustar la hora de «${item.title}»`}
        className={cn(
          "col-span-2 flex items-center gap-2 pt-1",
          "sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:self-start sm:pt-0",
          "transition-opacity motion-reduce:transition-none",
          "pointer-fine:sm:opacity-0 pointer-fine:sm:group-hover/card:opacity-100 pointer-fine:sm:group-focus-within/card:opacity-100"
        )}
      >
        <button
          type="button"
          disabled={!canEarlier}
          onClick={() => onNudge(-NUDGE_MIN)}
          aria-label={`Adelantar ${NUDGE_MIN} minutos «${item.title}»`}
          title={`Adelantar ${NUDGE_MIN} minutos`}
          className={NUDGE_BUTTON}
        >
          <span aria-hidden="true">−{NUDGE_MIN}</span>
        </button>
        <button
          type="button"
          disabled={!canLater}
          onClick={() => onNudge(NUDGE_MIN)}
          aria-label={`Retrasar ${NUDGE_MIN} minutos «${item.title}»`}
          title={`Retrasar ${NUDGE_MIN} minutos`}
          className={NUDGE_BUTTON}
        >
          <span aria-hidden="true">+{NUDGE_MIN}</span>
        </button>
      </div>

    </article>
  );
}

/** Tramo de la línea vertical: continuo entre filas; el primero y el último acaban en su nodo. */
function Rail({ first, last, node }: { first?: boolean; last?: boolean; node?: "filled" | "outline" }) {
  return (
    <div aria-hidden="true" className="relative">
      {!(first && last) && (
        <span
          className="absolute left-1/2 w-0.5 -translate-x-1/2 bg-btn-soft"
          style={
            last
              ? { top: 0, height: NODE_CENTER }
              : { top: first ? NODE_CENTER : 0, bottom: 0 }
          }
        />
      )}
      {node && (
        <span
          className={cn(
            "absolute left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-lilac",
            node === "filled" ? "bg-lilac" : "bg-surface"
          )}
          style={{ top: NODE_CENTER }}
        />
      )}
    </div>
  );
}

const ROW_GRID = "grid grid-cols-[5.25rem_1.25rem_minmax(0,1fr)] sm:grid-cols-[6.5rem_2rem_minmax(0,1fr)]";

export function TimelineRoadmap({
  items,
  cascade,
  onEdit,
  onNudge,
  onAdd,
}: {
  /** Ya ordenados por hora. */
  items: TimelineItem[];
  cascade: boolean;
  onEdit: (item: TimelineItem) => void;
  onNudge: (item: TimelineItem, delta: number) => void;
  onAdd: () => void;
}) {
  const coincidences = React.useMemo(() => overlapsById(items), [items]);
  const gaps = React.useMemo(() => gapsBefore(items), [items]);

  // ¿Se puede mover sin salirse de 00:00 – 23:59 (+1)? En cascada cuenta el primero y el último de los que se mueven.
  const bounds = React.useMemo(() => {
    const result: Record<string, { earlier: boolean; later: boolean }> = {};
    const lastStart = items.length > 0 ? Math.max(...items.map((i) => i.startMin)) : 0;
    items.forEach((item, index) => {
      const moving = cascade ? items.slice(index) : [item];
      const first = Math.min(...moving.map((i) => i.startMin));
      const last = cascade ? lastStart : item.startMin;
      result[item.id] = {
        earlier: first - NUDGE_MIN >= 0,
        later: last + NUDGE_MIN <= 2879,
      };
    });
    return result;
  }, [items, cascade]);

  return (
    <div>
      <ol className="flex flex-col">
        {items.map((item, index) => {
          const first = index === 0;
          const end = endMin(item);
          const startDay = dayIndex(item.startMin);
          const endDay = dayIndex(end);
          const gap = gaps[item.id];
          return (
            <li key={item.id}>
              {gap !== undefined && gap > GAP_MIN && (
                <div className={ROW_GRID}>
                  <div />
                  <Rail />
                  <p className="pb-3 pt-0.5">
                    <span className="inline-block rounded-full border border-dashed border-line-strong px-3 py-1 text-sm text-ink-muted">
                      Hueco de {formatDuration(gap)}
                    </span>
                  </p>
                </div>
              )}
              <div className={ROW_GRID}>
                <div className="pr-1.5 pt-[0.75rem]">
                  <p className="font-display text-xl font-semibold leading-8 tabular-nums text-ink sm:text-2xl">
                    <time>{formatClock(item.startMin)}</time>
                    <DayMark day={startDay} />
                  </p>
                  {item.durationMin > 0 && (
                    <p className="text-sm tabular-nums text-ink-muted">
                      <span aria-hidden="true">→ </span>
                      <span className="sr-only">hasta las </span>
                      {formatClock(end)}
                      {endDay > startDay && <DayMark day={endDay} />}
                    </p>
                  )}
                </div>
                <Rail
                  first={first}
                  last={index === items.length - 1}
                  node={item.highlight ? "filled" : "outline"}
                />
                <div className="pb-3">
                  <MomentCard
                    item={item}
                    coincidences={coincidences[item.id] ?? []}
                    canEarlier={bounds[item.id].earlier}
                    canLater={bounds[item.id].later}
                    onEdit={() => onEdit(item)}
                    onNudge={(delta) => onNudge(item, delta)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className={ROW_GRID}>
        <div />
        <div />
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm font-medium text-ink transition-colors hover:bg-lilac-soft motion-reduce:transition-none",
            ROW_FOCUS
          )}
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          Añadir momento
        </button>
      </div>
    </div>
  );
}
