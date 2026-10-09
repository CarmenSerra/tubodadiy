"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon, Loader2, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  DIALOG_CONTENT,
  DIALOG_TITLE,
  EditIconButton,
  FIELD,
  FIELD_LABEL,
  ICON_BUTTON,
} from "@/components/guests/brand-dialog";
import { FieldError } from "@/components/honeymoon/destination-form-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { createDay, updateDay } from "@/lib/firebase/honeymoon";
import { newActivityId, type DayActivity, type TripDay } from "@/lib/honeymoon-model";
import { cn } from "@/lib/utils";

export function DayFormDialog({
  planId,
  day,
  nextOrder,
  defaultDate = "",
  trigger,
}: {
  planId: string;
  day?: TripDay;
  /** Posición del día nuevo (al final del itinerario). */
  nextOrder: number;
  /** Fecha sugerida para un día nuevo (el siguiente al último). */
  defaultDate?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={CTA_PRIMARY}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Añadir día
          </button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className={DIALOG_CONTENT}>
        {open && (
          <DayForm
            planId={planId}
            day={day}
            nextOrder={nextOrder}
            defaultDate={defaultDate}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DayForm({
  planId,
  day,
  nextOrder,
  defaultDate,
  onDone,
}: {
  planId: string;
  day?: TripDay;
  nextOrder: number;
  defaultDate: string;
  onDone: () => void;
}) {
  const [place, setPlace] = React.useState(day?.place ?? "");
  const [date, setDate] = React.useState(day ? day.date : defaultDate);
  const [activities, setActivities] = React.useState<DayActivity[]>(day?.activities ?? []);
  const [placeError, setPlaceError] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const focusActivity = React.useRef<string | null>(null);
  const uid = React.useId();
  const placeId = `${uid}-place`;
  const dateId = `${uid}-date`;

  // Tras añadir una actividad, el foco va a su campo de texto.
  React.useEffect(() => {
    if (!focusActivity.current) return;
    document.getElementById(`${uid}-act-${focusActivity.current}`)?.focus();
    focusActivity.current = null;
  }, [activities, uid]);

  function addActivity(afterIndex = activities.length - 1) {
    const activity = { id: newActivityId(), time: "", text: "" };
    focusActivity.current = activity.id;
    setActivities((list) => [...list.slice(0, afterIndex + 1), activity, ...list.slice(afterIndex + 1)]);
  }

  function patchActivity(id: string, patch: Partial<DayActivity>) {
    setActivities((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function moveActivity(index: number, delta: -1 | 1) {
    setActivities((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!place.trim()) {
      setPlaceError(true);
      document.getElementById(placeId)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        place: place.trim(),
        date,
        activities: activities
          .map((a) => ({ id: a.id, time: a.time, text: a.text.trim() }))
          .filter((a) => a.text),
      };
      if (day) {
        await updateDay(planId, day.id, data);
        toast.success("Día actualizado");
      } else {
        await createDay(planId, data, nextOrder);
        toast.success("Día añadido al itinerario");
      }
      onDone();
    } catch {
      toast.error("No se ha podido guardar el día.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{day ? "Editar día" : "Nuevo día"}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={placeId} className={FIELD_LABEL}>
            Lugar
          </Label>
          <Input
            id={placeId}
            value={place}
            onChange={(e) => {
              setPlace(e.target.value);
              if (placeError) setPlaceError(false);
            }}
            placeholder="Ubud, isla de Gili, vuelo de ida…"
            required
            autoFocus
            autoComplete="off"
            aria-invalid={placeError}
            aria-describedby={placeError ? `${uid}-place-error` : undefined}
            className={FIELD}
          />
          {placeError && <FieldError id={`${uid}-place-error`}>Escribe el lugar de este día.</FieldError>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={dateId} className={FIELD_LABEL}>
            Fecha <span className="font-normal text-ink-muted">(opcional)</span>
          </Label>
          <DatePicker id={dateId} value={date} onChange={setDate} className={FIELD} />
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className={cn(FIELD_LABEL, "mb-2.5")}>Actividades</legend>
          {activities.length === 0 && (
            <p className="text-sm text-ink-muted">Sin actividades todavía. Añade planes con su hora si la tienen.</p>
          )}
          <ul className="flex flex-col gap-2.5">
            {activities.map((a, i) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <TimePicker
                  value={a.time}
                  onChange={(time) => patchActivity(a.id, { time })}
                  aria-label={`Hora de la actividad ${i + 1} (opcional)`}
                  className={cn(FIELD, "w-28 shrink-0")}
                />
                <Input
                  id={`${uid}-act-${a.id}`}
                  value={a.text}
                  onChange={(e) => patchActivity(a.id, { text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (a.text.trim()) addActivity(i);
                    }
                  }}
                  aria-label={`Actividad ${i + 1}`}
                  placeholder="Snorkel, cena en la playa…"
                  autoComplete="off"
                  className={cn(FIELD, "min-w-0 flex-1")}
                />
                <div className="flex shrink-0">
                  <button
                    type="button"
                    className={cn(ICON_BUTTON, "disabled:pointer-events-none disabled:opacity-40")}
                    disabled={i === 0}
                    onClick={() => moveActivity(i, -1)}
                    aria-label={`Subir la actividad ${i + 1}`}
                  >
                    <ArrowUpIcon aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={cn(ICON_BUTTON, "disabled:pointer-events-none disabled:opacity-40")}
                    disabled={i === activities.length - 1}
                    onClick={() => moveActivity(i, 1)}
                    aria-label={`Bajar la actividad ${i + 1}`}
                  >
                    <ArrowDownIcon aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={ICON_BUTTON}
                    onClick={() => setActivities((list) => list.filter((x) => x.id !== a.id))}
                    aria-label={`Quitar la actividad ${i + 1}`}
                  >
                    <XIcon aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => addActivity()} className={cn(CTA_SECONDARY, "mt-1 w-fit")}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Añadir actividad
          </button>
        </fieldset>
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
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

/** Disparador de edición; recibe las props que le inyecta DialogTrigger. */
export function EditDayTrigger({ label, ...props }: React.ComponentProps<"button"> & { label: string }) {
  return <EditIconButton label={`Editar ${label}`} {...props} />;
}
