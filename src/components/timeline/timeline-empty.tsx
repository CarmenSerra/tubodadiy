"use client";

import * as React from "react";
import { CalendarClockIcon, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CARD, CTA_PRIMARY, CTA_SECONDARY, IconCircle } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import {
  MAX_CEREMONY_MIN,
  MIN_CEREMONY_MIN,
  formatClock,
  isValidCeremonyStart,
  parseClock,
} from "@/components/timeline/timeline-model";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";

/**
 * Cronograma vacío: dos caminos, una plantilla (preguntando la hora de la
 * ceremonia) o empezar en blanco.
 */
export function TimelineEmpty({
  creating,
  onTemplate,
  onBlank,
  readOnly = false,
}: {
  readOnly?: boolean;
  creating: boolean;
  onTemplate: (ceremonyStartMin: number) => void;
  onBlank: () => void;
}) {
  const { t } = useTranslation("timeline");
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
      <h3 className="mt-4 font-display text-xl font-semibold text-ink sm:text-2xl">
        {t("empty.title")}
      </h3>
      <p className="mt-2 max-w-md text-sm text-ink-muted">{t("empty.description")}</p>

      {readOnly ? null : choosing ? (
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex w-full max-w-xs flex-col gap-4">
          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor={timeId} className={FIELD_LABEL}>
              {t("empty.ceremonyTime")}
            </Label>
            <TimePicker
              id={timeId}
              value={time}
              onChange={setTime}
              autoFocus
              aria-invalid={invalid || undefined}
              aria-describedby={helpId}
              className={FIELD}
            />
            <p
              id={helpId}
              role={invalid ? "alert" : undefined}
              className={cn("text-sm", invalid ? "font-medium text-ink" : "text-ink-muted")}
            >
              {invalid
                ? t("empty.invalid", { min: formatClock(MIN_CEREMONY_MIN), max: formatClock(MAX_CEREMONY_MIN) })
                : t("empty.hint")}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <button
              type="button"
              onClick={() => setChoosing(false)}
              disabled={creating}
              className={cn(CTA_SECONDARY, "h-11")}
            >
              {t("empty.back")}
            </button>
            <button type="submit" disabled={creating} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
              {creating && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {t("empty.create")}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button type="button" onClick={() => setChoosing(true)} className={CTA_PRIMARY}>
            {t("empty.fromTemplate")}
          </button>
          <button type="button" onClick={onBlank} className={cn(CTA_SECONDARY, "h-11")}>
            {t("empty.blank")}
          </button>
        </div>
      )}
    </div>
  );
}
