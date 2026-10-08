"use client";

import * as React from "react";
import { ArrowLeftIcon, Loader2, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  CHECKBOX,
  DIALOG_CONTENT,
  DIALOG_TITLE,
  FIELD,
  FIELD_LABEL,
  ROW_FOCUS,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import {
  COMMON_DURATIONS,
  DAY_MIN,
  MAX_START_MIN,
  formatClock,
  formatDuration,
  parseClock,
} from "@/components/timeline/timeline-model";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { ignoreToastInteraction } from "@/components/timeline/use-timeline-undo";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTimelineItem, deleteTimelineItem, updateTimelineItem } from "@/lib/firebase/timeline";
import type { TimelineItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Lo que el formulario ha cambiado en Firestore; el cronograma lo apunta para poder deshacerlo. */
export type TimelineChange =
  | { type: "created"; id: string; title: string }
  | { type: "updated"; before: TimelineItem; title: string }
  | { type: "deleted"; item: TimelineItem };

const CUSTOM = "custom";
const MAX_DURATION_MIN = 24 * 60;

/** Texto de error de campo (sin rojo: el rojo es solo para confirmar borrados). */
const ERROR_TEXT = "text-sm font-medium text-ink";

interface TimelineFormDialogProps {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Momento a editar; sin él, se crea uno nuevo. */
  item?: TimelineItem;
  /** Hora de inicio sugerida al crear (minutos desde las 00:00). */
  defaultStartMin?: number;
  /** Se llama tras crear con éxito (para el progreso del paso). */
  onCreated?: () => void;
  /** Se llama tras crear, editar o eliminar con éxito (para poder deshacerlo). */
  onChange?: (change: TimelineChange) => void;
}

export function TimelineFormDialog({
  planId,
  open,
  onOpenChange,
  item,
  defaultStartMin = 12 * 60,
  onCreated,
  onChange,
}: TimelineFormDialogProps) {
  const restoreFocus = useRestoreFocus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={DIALOG_CONTENT}
        onOpenAutoFocus={restoreFocus.onOpenAutoFocus}
        onInteractOutside={ignoreToastInteraction}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
      >
        {open && (
          <MomentForm
            // Una instancia nueva por momento: el formulario siempre arranca con sus datos.
            key={item?.id ?? "new"}
            planId={planId}
            item={item}
            defaultStartMin={defaultStartMin}
            onDone={() => onOpenChange(false)}
            onCreated={onCreated}
            onChange={onChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormError {
  field: "title" | "time" | "duration";
  text: string;
}

function durationLabel(min: number): string {
  return min === 0 ? "Sin duración (momento puntual)" : formatDuration(min);
}

function MomentForm({
  planId,
  item,
  defaultStartMin,
  onDone,
  onCreated,
  onChange,
}: {
  planId: string;
  item?: TimelineItem;
  defaultStartMin: number;
  onDone: () => void;
  onCreated?: () => void;
  onChange?: (change: TimelineChange) => void;
}) {
  const isEdit = Boolean(item);
  const initialStart = item?.startMin ?? defaultStartMin;
  const initialDuration = item?.durationMin ?? 30;
  const isCommon = (COMMON_DURATIONS as readonly number[]).includes(initialDuration);

  const [title, setTitle] = React.useState(item?.title ?? "");
  const [time, setTime] = React.useState(formatClock(initialStart));
  const [nextDay, setNextDay] = React.useState(initialStart >= DAY_MIN);
  const [durationChoice, setDurationChoice] = React.useState(
    isCommon ? String(initialDuration) : CUSTOM
  );
  const [customMin, setCustomMin] = React.useState(isCommon ? "" : String(initialDuration));
  const [location, setLocation] = React.useState(item?.location ?? "");
  const [responsible, setResponsible] = React.useState(item?.responsible ?? "");
  const [notes, setNotes] = React.useState(item?.notes ?? "");
  const [highlight, setHighlight] = React.useState(item?.highlight ?? false);
  const [error, setError] = React.useState<FormError | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const titleId = React.useId();
  const timeId = React.useId();
  const durationId = React.useId();
  const customId = React.useId();
  const locationId = React.useId();
  const responsibleId = React.useId();
  const notesId = React.useId();

  // Si la duración guardada no es de las habituales, se muestra también en la lista.
  const durationOptions = isCommon
    ? [...COMMON_DURATIONS]
    : [...COMMON_DURATIONS, initialDuration].sort((a, b) => a - b);

  /** Quita el aviso de un campo en cuanto se vuelve a escribir en él. */
  function clearError(field: FormError["field"]) {
    setError((current) => (current?.field === field ? null : current));
  }

  function validate(): FormError | { clock: number; duration: number } {
    if (!title.trim()) return { field: "title", text: "Ponle un nombre al momento." };
    const clock = parseClock(time);
    if (clock === null) return { field: "time", text: "Escribe una hora válida, por ejemplo 12:30." };
    const duration = durationChoice === CUSTOM ? Number(customMin) : Number(durationChoice);
    if (
      (durationChoice === CUSTOM && customMin.trim() === "") ||
      !Number.isInteger(duration) ||
      duration < 0 ||
      duration > MAX_DURATION_MIN
    ) {
      return { field: "duration", text: "Escribe una duración en minutos, entre 0 y 1440." };
    }
    return { clock, duration };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if ("field" in result) {
      setError(result);
      document.getElementById({ title: titleId, time: timeId, duration: durationId }[result.field])?.focus();
      return;
    }
    setError(null);
    const startMin = Math.min(result.clock + (nextDay ? DAY_MIN : 0), MAX_START_MIN);
    const data = {
      title: title.trim(),
      startMin,
      durationMin: result.duration,
      location: location.trim(),
      responsible: responsible.trim(),
      notes: notes.trim(),
      highlight,
    };
    setSubmitting(true);
    try {
      if (item) {
        await updateTimelineItem(planId, item.id, data);
        onChange?.({ type: "updated", before: item, title: data.title });
      } else {
        const id = await createTimelineItem(planId, data);
        onCreated?.();
        onChange?.({ type: "created", id, title: data.title });
      }
      onDone();
    } catch {
      toast.error("No se ha podido guardar el momento.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    try {
      await deleteTimelineItem(planId, item.id);
      onChange?.({ type: "deleted", item });
      onDone();
    } catch {
      toast.error("No se ha podido eliminar el momento.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <button
          type="button"
          onClick={onDone}
          className={cn(
            "-ml-3 -mt-1 mb-1 inline-flex h-9 w-fit items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink",
            ROW_FOCUS
          )}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Volver al cronograma
        </button>
        <DialogTitle className={DIALOG_TITLE}>{isEdit ? "Editar momento" : "Nuevo momento"}</DialogTitle>
        <DialogDescription className="sr-only">
          Hora, duración y detalles de este momento del día.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={titleId} className={FIELD_LABEL}>
            Título
          </Label>
          <Input
            id={titleId}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearError("title");
            }}
            placeholder="Ceremonia, cóctel, primer baile…"
            autoFocus={!isEdit}
            autoComplete="off"
            required
            aria-invalid={error?.field === "title" || undefined}
            aria-describedby={error?.field === "title" ? `${titleId}-error` : undefined}
            className={FIELD}
          />
          {error?.field === "title" && (
            <p id={`${titleId}-error`} role="alert" className={ERROR_TEXT}>
              {error.text}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={timeId} className={FIELD_LABEL}>
              Hora
            </Label>
            <Input
              id={timeId}
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                clearError("time");
              }}
              required
              aria-invalid={error?.field === "time" || undefined}
              aria-describedby={error?.field === "time" ? `${timeId}-error` : undefined}
              className={cn(FIELD, "tabular-nums")}
            />
            {error?.field === "time" && (
              <p id={`${timeId}-error`} role="alert" className={ERROR_TEXT}>
                {error.text}
              </p>
            )}
            <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm text-ink-strong">
              <Checkbox
                checked={nextDay}
                onCheckedChange={(v) => setNextDay(Boolean(v))}
                className={CHECKBOX}
              />
              Madrugada del día siguiente
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={durationId} className={FIELD_LABEL}>
              Duración
            </Label>
            <Select
              value={durationChoice}
              onValueChange={(value) => {
                setDurationChoice(value);
                clearError("duration");
              }}
            >
              <SelectTrigger
                id={durationId}
                aria-invalid={error?.field === "duration" || undefined}
                className={SELECT_TRIGGER}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {durationOptions.map((min) => (
                  <SelectItem key={min} value={String(min)} className={SELECT_ITEM}>
                    {durationLabel(min)}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM} className={SELECT_ITEM}>
                  Otra duración…
                </SelectItem>
              </SelectContent>
            </Select>
            {durationChoice === CUSTOM && (
              <div className="flex items-center gap-2">
                <Label htmlFor={customId} className="sr-only">
                  Duración en minutos
                </Label>
                <Input
                  id={customId}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_DURATION_MIN}
                  step={5}
                  value={customMin}
                  onChange={(e) => {
                    setCustomMin(e.target.value);
                    clearError("duration");
                  }}
                  placeholder="75"
                  aria-describedby={error?.field === "duration" ? `${durationId}-error` : undefined}
                  className={cn(FIELD, "w-28 tabular-nums")}
                />
                <span className="text-sm text-ink-muted">minutos</span>
              </div>
            )}
            {error?.field === "duration" && (
              <p id={`${durationId}-error`} role="alert" className={ERROR_TEXT}>
                {error.text}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={locationId} className={FIELD_LABEL}>
              Lugar
            </Label>
            <Input
              id={locationId}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Iglesia de San Juan"
              autoComplete="off"
              className={FIELD}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={responsibleId} className={FIELD_LABEL}>
              Responsable
            </Label>
            <Input
              id={responsibleId}
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              placeholder="Ana, el fotógrafo…"
              autoComplete="off"
              className={FIELD}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={notesId} className={FIELD_LABEL}>
            Notas
          </Label>
          <Textarea
            id={notesId}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Algo que tengan que saber los proveedores o la familia…"
            rows={3}
            className="min-h-20 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm"
          />
        </div>

        <label className="flex min-h-10 cursor-pointer items-start gap-3 text-sm text-ink-strong">
          <Checkbox
            checked={highlight}
            onCheckedChange={(v) => setHighlight(Boolean(v))}
            className={cn(CHECKBOX, "mt-0.5")}
          />
          <span>
            Momento clave
            <span className="block text-ink-muted">Se marca con un punto destacado en el cronograma.</span>
          </span>
        </label>
      </div>

      <DialogFooter className="mt-6 gap-2 sm:items-center sm:gap-3">
        {item && (
          // Sin confirmación previa: borrar se puede deshacer desde el aviso o la cabecera.
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink sm:mr-auto",
              ROW_FOCUS
            )}
          >
            <Trash2Icon aria-hidden="true" className="size-4" />
            Eliminar momento
          </button>
        )}
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          Cancelar
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Guardar
        </button>
      </DialogFooter>
    </form>
  );
}
