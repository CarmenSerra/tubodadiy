"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useLanguage } from "@/lib/i18n/provider";
import { isLang } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Selector de idioma rectangular (esquinas suaves, no píldora) con un bloque
 * deslizante entre las opciones (ES | EN…). Mismo alto que el botón del tema
 * (size-10, size-11 en táctil). Son radios nativos (grupo `radiogroup`), así
 * que el teclado funciona solo: Tab entra en el grupo y las flechas cambian
 * de idioma. Se adapta solo a los idiomas de LANGUAGES.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  const { lang, setLang, languages } = useLanguage();
  const name = React.useId();
  const index = Math.max(
    0,
    languages.findIndex((l) => l.code === lang)
  );

  return (
    <div
      role="radiogroup"
      aria-label={t("language.label")}
      className={cn(
        "relative inline-grid h-10 shrink-0 grid-flow-col auto-cols-fr rounded-lg bg-lilac-soft p-0.5 ring-1 ring-lilac-edge has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lilac pointer-coarse:h-11",
        className
      )}
    >
      {/* Bloque deslizante: se mueve con el idioma activo (sin animación con movimiento reducido). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-md bg-btn-soft transition-transform duration-[320ms] ease-(--ease-gentle) motion-reduce:transition-none"
        style={{
          width: `calc((100% - 4px) / ${languages.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {languages.map((l) => {
        const checked = l.code === lang;
        return (
          <label
            key={l.code}
            className={cn(
              "relative z-10 flex min-w-8 cursor-pointer select-none items-center justify-center rounded-md px-2 text-xs font-semibold tracking-wide transition-colors duration-200 motion-reduce:transition-none sm:min-w-9",
              checked ? "text-ink-on-lilac" : "text-ink-muted hover:text-ink"
            )}
          >
            <input
              type="radio"
              name={name}
              value={l.code}
              checked={checked}
              onChange={(e) => {
                if (isLang(e.target.value)) setLang(e.target.value);
              }}
              className="sr-only"
            />
            <span aria-hidden="true">{l.short}</span>
            <span className="sr-only" lang={l.code}>
              {l.name}
            </span>
          </label>
        );
      })}
    </div>
  );
}
