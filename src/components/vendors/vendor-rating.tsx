"use client";

import * as React from "react";
import { StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FIELD_LABEL } from "@/components/vendors/vendor-brand";
import { cn } from "@/lib/utils";

/** Valoración 1-5 en solo lectura (el valor siempre va también en el texto accesible). */
export function RatingStars({ value, className }: { value: number; className?: string }) {
  const { t } = useTranslation("vendors");
  return (
    <span role="img" aria-label={t("rating.value", { count: value })} className={cn("inline-flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          aria-hidden="true"
          className={cn("size-4", n <= value ? "fill-current text-lilac" : "text-line-strong")}
        />
      ))}
    </span>
  );
}

/**
 * Selector de valoración opcional: cinco radios nativos (teclado y lector de pantalla gratis),
 * cada uno con zona táctil de 44 px. `0` = sin valorar.
 */
export function RatingInput({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const { t } = useTranslation("vendors");
  const name = React.useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={FIELD_LABEL}>
        {t("form.fields.rating")} <span className="font-normal text-ink-muted">{t("form.fields.optional")}</span>
      </legend>
      <div className="flex flex-wrap items-center gap-x-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lilac"
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
              aria-label={t("rating.value", { count: n })}
            />
            <StarIcon
              aria-hidden="true"
              className={cn("size-7 transition-colors", n <= value ? "fill-current text-lilac" : "text-line-strong")}
            />
          </label>
        ))}
        {value > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="ml-1 inline-flex h-11 items-center rounded-full px-3 text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-lilac"
          >
            {t("rating.clear")}
          </button>
        )}
      </div>
    </fieldset>
  );
}
