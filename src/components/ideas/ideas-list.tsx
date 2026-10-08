"use client";

import * as React from "react";
import { CheckIcon, Loader2, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import type { IdeasPanelContext } from "@/components/ideas/ideas-panel";
import type { IdeaGroup } from "@/components/ideas/ideas-text";
import { cn } from "@/lib/utils";

/** Foco de teclado sobre el fondo crema del panel. */
const ROW_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F5F1]";

/** Chip de filtro o de elección (también lo usa el panel de invitados). */
export const IDEA_CHIP = cn(
  "inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#D4C0EA] bg-white px-3 py-1 text-[13px] font-medium text-[#26413C] transition-colors hover:bg-[#ECE6F4] motion-reduce:transition-none",
  ROW_FOCUS
);
const CHIP_ON = "border-[#927AAC] bg-[#DECDF1] hover:bg-[#DECDF1]";

const PILL = "rounded-full bg-[#ECE6F4] px-2 py-0.5 text-[11px] font-medium leading-4 text-[#26413C]";

export interface IdeaItem {
  /** Identidad estable de la idea (también sirve para recordar que se ha añadido). */
  key: string;
  title: string;
  /** Explicación breve en gris. */
  hint?: string;
  /** Etiquetas pequeñas bajo el título: plazo, porcentaje, hora… */
  pills?: string[];
  /** Etiqueta destacada junto al título («Imprescindible»). */
  tag?: string;
  /** Id del grupo de filtro (ver `groups`). */
  group?: string;
  /** Ya está en el plan: se muestra «Ya la tienes» o se oculta. */
  present?: boolean;
  /** Si es false, el botón no marca la fila como «Añadida» (p. ej. abre un formulario). */
  markAdded?: boolean;
  /** Etiqueta accesible del botón; por defecto «Añadir «título»». */
  addLabel?: string;
  onAdd: (ctx: IdeasPanelContext) => Promise<void> | void;
}

interface IdeasListProps {
  items: IdeaItem[];
  ctx: IdeasPanelContext;
  /** Género del sustantivo, para «Añadida / Añadido», «Ya la / lo tienes». */
  gender?: "f" | "m";
  /** Título del aviso al añadir («Tarea añadida»). */
  addedMessage: string;
  /** Aviso si falla («No se ha podido añadir la tarea.»). */
  errorMessage: string;
  /** Texto cuando no queda nada que sugerir. */
  emptyText: string;
  /** Chips de filtro opcionales; se muestran si hay ideas suficientes. */
  groups?: IdeaGroup[];
  groupsLabel?: string;
  /** A partir de cuántas ideas visibles aparecen los chips. */
  minForGroups?: number;
}

const COPY = {
  f: {
    added: "Añadida",
    present: "Ya la tienes",
    show: "Mostrar también las que ya tienes",
    hide: "Ocultar las que ya tienes",
  },
  m: {
    added: "Añadido",
    present: "Ya lo tienes",
    show: "Mostrar también los que ya tienes",
    hide: "Ocultar los que ya tienes",
  },
} as const;

/** Lista de ideas con botón «+» por fila, filtros opcionales y las ya presentes aparte. */
export function IdeasList({
  items,
  ctx,
  gender = "f",
  addedMessage,
  errorMessage,
  emptyText,
  groups,
  groupsLabel = "Filtrar ideas",
  minForGroups = 8,
}: IdeasListProps) {
  const copy = COPY[gender];
  const [group, setGroup] = React.useState("all");
  const [showExisting, setShowExisting] = React.useState(false);
  const [added, setAdded] = React.useState<ReadonlySet<string>>(() => new Set());
  const [adding, setAdding] = React.useState<ReadonlySet<string>>(() => new Set());

  // Una idea recién enviada aparece como «presente» en cuanto Firestore refleja la
  // escritura local, antes de que la confirme el servidor: no debe desaparecer de la lista.
  const justAdded = (item: IdeaItem) => added.has(item.key) || (adding.has(item.key) && Boolean(item.present));
  const isExisting = (item: IdeaItem) => Boolean(item.present) && !justAdded(item);
  const candidates = items.filter((i) => !isExisting(i) || showExisting);
  const hiddenCount = items.filter(isExisting).length;

  const presentGroups = (groups ?? []).filter((g) => candidates.some((i) => i.group === g.id));
  const showChips = presentGroups.length > 1 && candidates.length >= minForGroups;
  const activeGroup = showChips && presentGroups.some((g) => g.id === group) ? group : "all";
  const visible = candidates.filter((i) => activeGroup === "all" || i.group === activeGroup);

  function toggle(setter: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>, key: string, on: boolean) {
    setter((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function handleAdd(item: IdeaItem) {
    if (adding.has(item.key) || added.has(item.key)) return;
    toggle(setAdding, item.key, true);
    try {
      await item.onAdd(ctx);
      if (item.markAdded !== false) {
        toggle(setAdded, item.key, true);
        toast.success(addedMessage, { id: "ideas-added", description: item.title });
      }
    } catch {
      toast.error(errorMessage);
    } finally {
      toggle(setAdding, item.key, false);
    }
  }

  return (
    <div>
      {showChips && (
        <div
          role="group"
          aria-label={groupsLabel}
          // Los filtros se quedan arriba mientras se desplaza la lista.
          className="sticky top-0 z-10 -mx-5 flex flex-wrap gap-1.5 bg-[#F8F5F1] px-5 pb-2 pt-1"
        >
          <button
            type="button"
            aria-pressed={activeGroup === "all"}
            onClick={() => setGroup("all")}
            className={cn(IDEA_CHIP, activeGroup === "all" && CHIP_ON)}
          >
            Todas
          </button>
          {presentGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={activeGroup === g.id}
              onClick={() => setGroup(g.id)}
              className={cn(IDEA_CHIP, activeGroup === g.id && CHIP_ON)}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#586C64]">{emptyText}</p>
      ) : (
        <ul>
          {visible.map((item) => {
            const isAdded = justAdded(item);
            const isAdding = adding.has(item.key) && !isAdded;
            return (
              <li
                key={item.key}
                className="flex items-start gap-3 border-b border-[#E5DDEC] py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-[#102D28]">
                    {item.title}
                    {item.tag && (
                      <span className="ml-2 inline-block rounded-full bg-[#D2D7CB] px-2 py-0.5 align-middle text-[11px] font-medium leading-4 text-[#26413C]">
                        {item.tag}
                      </span>
                    )}
                  </p>
                  {item.hint && <p className="mt-0.5 text-[13px] leading-snug text-[#586C64]">{item.hint}</p>}
                  {item.pills && item.pills.length > 0 && (
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.pills.map((pill) => (
                        <span key={pill} className={PILL}>
                          {pill}
                        </span>
                      ))}
                    </p>
                  )}
                </div>

                {isExisting(item) ? (
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#586C64]">
                    <CheckIcon aria-hidden="true" className="size-4" />
                    {copy.present}
                  </span>
                ) : isAdded ? (
                  // aria-disabled (no disabled): el foco del teclado no se pierde al añadir.
                  <button
                    type="button"
                    aria-disabled="true"
                    aria-label={`«${item.title}» ${copy.added.toLowerCase()}`}
                    className={cn(
                      "mt-0.5 inline-flex h-9 shrink-0 cursor-default items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-[#4E6A5A]",
                      ROW_FOCUS
                    )}
                  >
                    <CheckIcon aria-hidden="true" className="size-4" />
                    {copy.added}
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={item.addLabel ?? `Añadir «${item.title}»`}
                    aria-busy={isAdding || undefined}
                    onClick={() => void handleAdd(item)}
                    className={cn(
                      "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DECDF1] text-[#26413C] transition-colors hover:bg-[#D4C0EA] sm:size-9 motion-reduce:transition-none",
                      isAdding && "pointer-events-none opacity-70",
                      ROW_FOCUS
                    )}
                  >
                    {isAdding ? (
                      <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <PlusIcon aria-hidden="true" className="size-4" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hiddenCount > 0 && (
        <div className="pb-2 pt-2">
          <button
            type="button"
            onClick={() => setShowExisting((v) => !v)}
            className={cn(
              "rounded-md py-1 text-[13px] font-medium text-[#26413C] underline decoration-[#927AAC] decoration-2 underline-offset-4 hover:opacity-80",
              ROW_FOCUS
            )}
          >
            {showExisting ? copy.hide : `${copy.show} (${hiddenCount})`}
          </button>
        </div>
      )}
    </div>
  );
}
