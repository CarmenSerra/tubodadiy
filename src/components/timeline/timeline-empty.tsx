"use client";

import * as React from "react";
import { CalendarClockIcon, Loader2 } from "lucide-react";

import { CARD, CTA_PRIMARY, CTA_SECONDARY, IconCircle } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import {
  MAX_CEREMONY_MIN,
  MIN_CEREMONY_MIN,
  formatClock,
  isValidCeremonyStart,
  parseClock,
} from "@/components/timeline/timeline-model";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Cronograma vacío: dos caminos, una plantilla (preguntando la hora de la
 * ceremonia) o empezar en blanco.
 */
export function TimelineEmpty({
  creating,
  onTemplate,
  onBlank,
}: {
  creating: boolean;
  onTemplate: (ceremonyStartMin: number) => void;
  onBlank: () => void;
}) {
  const [choosing, setChoosing] = React.useState(false);
  const [time, setTime] = React.useState("12:00");
  const [invalid, setInvalid] = React.useState(false);
  const timeId = React.useId();
  const helpId = React.useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const minutes = parseClock(time);
    if (!isValidCeremonyStart(minutes)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onTemplate(minutes);
  }

  return (
    <div className={cn(CARD, "flex flex-col items-center px-5 py-10 text-center sm:px-10 sm:py-12")}>
      <IconCircle tone="sage" className="size-12 [&_svg]:size-6">
        <CalendarClockIcon />
      </IconCircle>
      <h3 className="mt-4 font-display text-xl font-semibold text-[#26413C] sm:text-2xl">
        Tu día, hora a hora
      </h3>
      <p className="mt-2 max-w-md text-sm text-[#586C64]">
        Pon en orden todo lo que pasará el gran día y ve afinando las horas con calma. Puedes partir
        de una plantilla y cambiar lo que quieras, o empezar desde cero.
      </p>

      {choosing ? (
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex w-full max-w-xs flex-col gap-4">
          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor={timeId} className={FIELD_LABEL}>
              ¿A qué hora es la ceremonia?
            </Label>
            <Input
              id={timeId}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              autoFocus
              required
              aria-invalid={invalid || undefined}
              aria-describedby={helpId}
              className={cn(FIELD, "tabular-nums")}
            />
            <p
              id={helpId}
              role={invalid ? "alert" : undefined}
              className={cn("text-sm", invalid ? "font-medium text-[#26413C]" : "text-[#586C64]")}
            >
              {invalid
                ? `Elige una hora entre las ${formatClock(MIN_CEREMONY_MIN)} y las ${formatClock(MAX_CEREMONY_MIN)}.`
                : "Lo habitual es a las 12:00 o a las 18:00. Después podrás cambiar cualquier hora."}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <button
              type="button"
              onClick={() => setChoosing(false)}
              disabled={creating}
              className={cn(CTA_SECONDARY, "h-11")}
            >
              Atrás
            </button>
            <button type="submit" disabled={creating} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
              {creating && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              Crear mi cronograma
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button type="button" onClick={() => setChoosing(true)} className={CTA_PRIMARY}>
            Empezar con una plantilla
          </button>
          <button type="button" onClick={onBlank} className={cn(CTA_SECONDARY, "h-11")}>
            Empezar en blanco
          </button>
        </div>
      )}
    </div>
  );
}
