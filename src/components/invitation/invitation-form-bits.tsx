"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { CARD } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import { LIMITS, type InvitationPlace } from "@/components/invitation/invitation-model";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";

export const SWITCH =
  "relative h-6 w-11 after:absolute after:-inset-x-1.5 after:-inset-y-2.5 after:content-[''] shrink-0 data-[state=checked]:bg-cta data-[state=unchecked]:bg-line-strong focus-visible:ring-lilac [&>span]:size-5 [&>span]:data-[state=checked]:translate-x-[1.375rem] [&>span]:data-[state=unchecked]:translate-x-0.5";

export const AREA = cn(FIELD, "h-auto min-h-24 py-2.5");

/** Tarjeta de un bloque del editor (borde suave, radio 16). */
export function StepCard({
  title,
  note,
  aside,
  children,
  className,
}: {
  title: string;
  note?: string;
  /** Algo a la derecha del título (p. ej. la etiqueta Borrador/Publicada). */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(CARD, "flex min-w-0 flex-col gap-4 p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-snug text-ink">{title}</h3>
          {note && <p className="mt-0.5 text-sm text-ink-muted">{note}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={htmlFor} className={FIELD_LABEL}>
        {label}
      </label>
      {children}
      {hint && <p className="text-[13px] text-ink-muted">{hint}</p>}
    </div>
  );
}

export function PlaceFields({
  id,
  kind,
  place,
  onChange,
  badUrl,
}: {
  id: string;
  kind: "ceremony" | "banquet";
  place: InvitationPlace;
  onChange: (patch: Partial<InvitationPlace>) => void;
  badUrl: boolean;
}) {
  const { t } = useTranslation("invitationPage");
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-raised p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{t(`where.${kind}`)}</legend>
      <div className="grid gap-3 sm:grid-cols-[1fr_8.5rem]">
        <Field label={t("where.name")} htmlFor={`${id}-name`}>
          <Input
            id={`${id}-name`}
            value={place.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={LIMITS.placeName}
            placeholder={t(`where.namePlaceholder.${kind}`)}
            autoComplete="off"
            className={FIELD}
          />
        </Field>
        <Field label={t("where.time")} htmlFor={`${id}-time`}>
          <TimePicker id={`${id}-time`} value={place.time} onChange={(time) => onChange({ time })} className={FIELD} />
        </Field>
      </div>
      <Field label={t("where.address")} htmlFor={`${id}-address`}>
        <Input
          id={`${id}-address`}
          value={place.address}
          onChange={(e) => onChange({ address: e.target.value })}
          maxLength={LIMITS.address}
          placeholder={t("where.addressPlaceholder")}
          autoComplete="off"
          className={FIELD}
        />
      </Field>
      <Field label={t("where.map")} htmlFor={`${id}-map`} hint={t("where.mapHint")}>
        <Input
          id={`${id}-map`}
          type="url"
          inputMode="url"
          value={place.mapUrl}
          onChange={(e) => onChange({ mapUrl: e.target.value })}
          maxLength={LIMITS.url}
          placeholder="https://maps.app.goo.gl/…"
          aria-invalid={badUrl}
          aria-describedby={badUrl ? `${id}-map-error` : undefined}
          className={cn(FIELD, badUrl && "border-danger")}
        />
        {badUrl && (
          <p id={`${id}-map-error`} role="alert" className="text-[13px] text-danger">
            {t("where.mapError")}
          </p>
        )}
      </Field>
    </fieldset>
  );
}
