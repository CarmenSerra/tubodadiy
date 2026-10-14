"use client";

import * as React from "react";
import { LayoutTemplateIcon, PencilRulerIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { InvitationMode } from "@/components/invitation/invitation-model";
import { cn } from "@/lib/utils";

const MODES: readonly InvitationMode[] = ["blank", "template"];

/** Pantalla inicial (invitación aún sin guardar): dos tarjetas grandes para elegir cómo empezar. */
export function InvitationModeChooser({ onChoose }: { onChoose: (mode: InvitationMode) => void }) {
  const { t } = useTranslation("invitationPage");
  return (
    <section aria-labelledby="inv-mode-title" className="flex flex-col gap-4">
      <div>
        <h3 id="inv-mode-title" className="font-display text-lg font-semibold text-ink">
          {t("modeChooser.title")}
        </h3>
        <p className="mt-0.5 text-sm text-ink-muted">{t("modeChooser.description")}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {MODES.map((mode) => {
          const Icon = mode === "blank" ? PencilRulerIcon : LayoutTemplateIcon;
          return (
            <li key={mode} className="flex">
              <button
                type="button"
                onClick={() => onChoose(mode)}
                className="flex min-h-44 w-full flex-col items-start gap-3 rounded-2xl border-2 border-line bg-raised p-5 text-left outline-none transition-colors hover:border-lilac hover:bg-lilac-soft/50 focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <span
                  aria-hidden="true"
                  className="grid size-11 place-items-center rounded-full bg-lilac-soft text-ink-strong"
                >
                  <Icon className="size-5" />
                </span>
                <span className="font-display text-lg font-semibold leading-snug text-ink">
                  {t(`modeChooser.${mode}.title`)}
                </span>
                <span className="text-sm leading-snug text-ink-muted">{t(`modeChooser.${mode}.description`)}</span>
                <span className="mt-auto text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4">
                  {t(`modeChooser.${mode}.cta`)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Conmutador discreto arriba del editor: cambia de modo conservando los dos diseños. */
export function InvitationModeSwitch({
  mode,
  onChange,
}: {
  mode: InvitationMode;
  onChange: (mode: InvitationMode) => void;
}) {
  const { t } = useTranslation("invitationPage");
  const refs = React.useRef<Partial<Record<InvitationMode, HTMLButtonElement | null>>>({});
  const order: readonly InvitationMode[] = ["template", "blank"];

  function onKeyDown(e: React.KeyboardEvent) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = order[(order.indexOf(mode) + dir + order.length) % order.length];
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span id="inv-mode-label" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {t("mode.label")}
      </span>
      <div
        role="radiogroup"
        aria-labelledby="inv-mode-label"
        onKeyDown={onKeyDown}
        className="inline-flex w-full rounded-full border border-line bg-surface p-1 sm:w-auto"
      >
        {order.map((id) => {
          const active = id === mode;
          return (
            <button
              key={id}
              ref={(el) => {
                refs.current[id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(id)}
              className={cn(
                "inline-flex min-h-11 flex-1 items-center justify-center rounded-full border-2 px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac sm:flex-none",
                active ? "border-lilac bg-lilac-soft/60 text-ink" : "border-transparent text-ink-muted hover:text-ink"
              )}
            >
              {t(`mode.${id}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
