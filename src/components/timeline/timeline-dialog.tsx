"use client";

import * as React from "react";
import Link from "next/link";
import { CopyIcon, PlusIcon, PrinterIcon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY, Skeleton } from "@/components/dashboard/ui";
import { CHECKBOX } from "@/components/guests/brand-dialog";
import { TimelineIdeas } from "@/components/ideas/timeline-ideas";
import { TimelineEmpty } from "@/components/timeline/timeline-empty";
import { TimelineFormDialog } from "@/components/timeline/timeline-form-dialog";
import {
  MAX_START_MIN,
  buildTemplate,
  endMin,
  formatClock,
  formatWeekdayDate,
  planShift,
  sortItems,
  timelineToText,
} from "@/components/timeline/timeline-model";
import { TimelineRoadmap } from "@/components/timeline/timeline-roadmap";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlanContext } from "@/lib/context/plan-context";
import { markTimelineProgress } from "@/lib/firebase/mutations";
import { mapTimelineItem, timelineItemsQuery } from "@/lib/firebase/plans";
import { addTimelineItems, shiftTimelineItems } from "@/lib/firebase/timeline";
import { useCollection } from "@/lib/hooks/use-collection";
import type { TimelineItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Pantalla completa en móvil; en escritorio, un diálogo grande que crece con
 * el contenido hasta el 85 % del alto, con la cabecera y la barra fijas y el
 * cronograma desplazándose.
 */
const MODAL =
  "top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-surface p-0 outline-none " +
  "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-line";

const CASCADE_KEY = "tubodadiy:timeline-cascade";

function readCascadePref(): boolean {
  try {
    return window.localStorage.getItem(CASCADE_KEY) !== "off";
  } catch {
    return true;
  }
}

function writeCascadePref(value: boolean) {
  try {
    window.localStorage.setItem(CASCADE_KEY, value ? "on" : "off");
  } catch {
    /* sin almacenamiento: la preferencia dura lo que dure el diálogo */
  }
}

const DESKTOP_QUERY = "(min-width: 640px)";

/** ¿Pantalla de escritorio (sm y mayores)? El diálogo solo se pinta en el cliente. */
function useIsDesktop(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true
  );
}

/** Copia al portapapeles; con el respaldo de siempre si la API moderna no está. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* se prueba el respaldo */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function TimelineDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { plan } = usePlanContext();
  const dateText = formatWeekdayDate(plan?.weddingDate);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const restoreFocus = useRestoreFocus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className={MODAL}
        // El foco empieza en el propio diálogo (se anuncia su título) y no en el
        // botón de cerrar; el primer Tab llega ya a «Añadir momento».
        onOpenAutoFocus={(event) => {
          restoreFocus.onOpenAutoFocus();
          event.preventDefault();
          contentRef.current?.focus();
        }}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
      >
        <DialogHeader className="shrink-0 gap-1 px-5 pb-4 pt-5 pr-14 text-left sm:px-8 sm:pt-7">
          <DialogTitle className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Cronograma del día
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-muted">
            {dateText ?? "Aún no tienes fecha"}
          </DialogDescription>
        </DialogHeader>
        {open && <TimelineBody />}
      </DialogContent>
    </Dialog>
  );
}

function TimelineSkeleton() {
  return (
    <div role="status" aria-label="Cargando el cronograma" className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid grid-cols-[5rem_1fr] gap-4 sm:grid-cols-[6.5rem_1fr]">
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function TimelineBody() {
  const { planId, plan } = usePlanContext();
  const { data, loading, error } = useCollection(timelineItemsQuery(planId), mapTimelineItem);
  const items = React.useMemo(() => sortItems(data), [data]);
  const isDesktop = useIsDesktop();

  const [cascade, setCascade] = React.useState(readCascadePref);
  const [form, setForm] = React.useState<{ open: boolean; item?: TimelineItem }>({ open: false });
  const [creating, setCreating] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");


  const lastEnd = items.length > 0 ? Math.max(...items.map(endMin)) : null;
  const defaultStart = lastEnd === null ? 12 * 60 : Math.min(lastEnd, MAX_START_MIN);

  function openNew() {
    setForm({ open: true, item: undefined });
  }

  function handleCascadeChange(value: boolean) {
    setCascade(value);
    writeCascadePref(value);
  }

  async function handleTemplate(ceremonyStartMin: number) {
    setCreating(true);
    try {
      await addTimelineItems(planId, buildTemplate(ceremonyStartMin));
      toast.success("Cronograma creado. Ya puedes ajustar las horas.");
      void markTimelineProgress(planId, "draft");
    } catch {
      toast.error("No se ha podido crear el cronograma.");
    } finally {
      setCreating(false);
    }
  }

  async function handleNudge(item: TimelineItem, delta: number) {
    const updates = planShift(items, item.id, delta, cascade);
    if (!updates) return;
    try {
      await shiftTimelineItems(planId, updates);
      const moved = updates.length > 1 ? " y lo que viene después" : "";
      setAnnouncement(`«${item.title}»${moved}: ahora a las ${formatClock(item.startMin + delta)}`);
    } catch {
      toast.error("No se ha podido cambiar la hora.");
    }
  }

  async function handleCopy() {
    if (!plan) return;
    const ok = await copyText(timelineToText(items, plan));
    if (ok) {
      toast.success("Cronograma copiado");
      void markTimelineProgress(planId, "share");
    } else {
      toast.error("No se ha podido copiar. Prueba con «Imprimir / PDF».");
    }
  }

  if (error) {
    return (
      <div className="flex-1 px-5 py-6 sm:px-8">
        <p role="alert" className="text-sm text-ink">
          No se ha podido cargar el cronograma. Recarga la página e inténtalo de nuevo.
        </p>
      </div>
    );
  }

  const hasItems = items.length > 0;
  const toolbar = hasItems ? (
    <div
      className={cn(
        "flex flex-col gap-3",
        // En escritorio la barra queda fija; en móvil forma parte del desplazamiento
        // (ocupa demasiado alto para dejarla siempre a la vista).
        isDesktop ? "shrink-0 border-y border-line px-8 py-3" : "pb-4 pt-1"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={openNew} className={cn(CTA_PRIMARY, "h-10 px-5")}>
          <PlusIcon aria-hidden="true" className="size-4" />
          Añadir momento
        </button>
        <TimelineIdeas planId={planId} items={items} />
        <button type="button" onClick={handleCopy} className={CTA_SECONDARY}>
          <CopyIcon aria-hidden="true" className="size-4" />
          Copiar como texto
        </button>
        <Link
          href={`/plan/${planId}/cronograma/imprimir`}
          target="_blank"
          rel="noopener"
          onClick={() => void markTimelineProgress(planId, "share")}
          className={CTA_SECONDARY}
        >
          <PrinterIcon aria-hidden="true" className="size-4" />
          Imprimir / PDF
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </Link>
      </div>
      <label className="flex cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-ink-strong">
        <Checkbox
          checked={cascade}
          onCheckedChange={(v) => handleCascadeChange(Boolean(v))}
          className={CHECKBOX}
        />
        <span>Mover también lo que viene después</span>
        <span className="hidden text-ink-muted sm:inline">(al ajustar una hora con −15 / +15)</span>
      </label>
    </div>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isDesktop && toolbar}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-8",
          hasItems ? "py-5" : "pb-6 pt-1"
        )}
      >
        {!isDesktop && toolbar}
        {loading ? (
          <TimelineSkeleton />
        ) : hasItems ? (
          <TimelineRoadmap
            items={items}
            cascade={cascade}
            onEdit={(item) => setForm({ open: true, item })}
            onNudge={handleNudge}
            onAdd={openNew}
          />
        ) : (
          <TimelineEmpty creating={creating} onTemplate={handleTemplate} onBlank={openNew} />
        )}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <TimelineFormDialog
        planId={planId}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        item={form.item}
        defaultStartMin={defaultStart}
        // Ojo: Firestore refleja la escritura al instante, así que "¿es el primero?"
        // se decide con la lista tal y como estaba al enviar el formulario (esta
        // función es la de ese render), no con la de cuando termina de guardar.
        onCreated={() => {
          if (items.length === 0) void markTimelineProgress(planId, "draft");
        }}
      />
    </div>
  );
}

