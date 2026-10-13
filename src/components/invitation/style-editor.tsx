"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  TEMPLATES,
  type InvitationStyle,
  type InvitationTemplateId,
} from "@/components/invitation/invitation-model";
import { LayoutEditor } from "@/components/invitation/layout-picker";
import { BackgroundEditor, ColorEditor, EnvelopeEditor } from "@/components/invitation/palette-picker";
import { cn } from "@/lib/utils";

function StyleSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        {note && <p className="mt-0.5 text-sm text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Estilo compartido del plan: plantilla (tipografía), composición, paleta, fondo de la tarjeta y color del sobre.
 * Es el mismo selector en el editor de la invitación y en «Reserva la fecha»,
 * porque los dos se ven siempre con el mismo estilo.
 */
export function StyleEditor({
  style,
  onChange,
  idPrefix = "style",
}: {
  style: InvitationStyle;
  onChange: (style: InvitationStyle) => void;
  /** Para que los controles de dos editores en la misma página no compartan nombre. */
  idPrefix?: string;
}) {
  const { t } = useTranslation("invitation");
  const set = (patch: Partial<InvitationStyle>) => onChange({ ...style, ...patch });

  return (
    <>
      <StyleSection title={t("editor.sections.style")} note={t("editor.style.shared")}>
        <div role="radiogroup" aria-label={t("editor.template.label")} className="grid grid-cols-3 gap-2.5">
          {TEMPLATES.map((tpl) => {
            const active = style.template === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                role="radio"
                id={`${idPrefix}-tpl-${tpl.id}`}
                aria-checked={active}
                onClick={() => set({ template: tpl.id as InvitationTemplateId })}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border bg-raised p-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  active ? "border-lilac ring-2 ring-lilac" : "border-line-strong hover:border-lilac"
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex h-14 flex-col items-center justify-center gap-1 rounded-lg border border-black/5"
                  style={{ background: tpl.swatch.bg }}
                >
                  <span className="h-1.5 w-10 rounded-full" style={{ background: tpl.swatch.ink }} />
                  <span className="h-1 w-6 rounded-full" style={{ background: tpl.swatch.accent }} />
                </span>
                <span className="flex items-center gap-1 px-0.5 text-sm font-medium leading-tight text-ink-strong">
                  {active && <CheckIcon aria-hidden="true" className="size-3.5 shrink-0 text-green" />}
                  {t(`templates.${tpl.id}.label`)}
                </span>
                <span className="hidden px-0.5 text-xs leading-snug text-ink-muted sm:block">
                  {t(`templates.${tpl.id}.hint`)}
                </span>
              </button>
            );
          })}
        </div>
      </StyleSection>

      <StyleSection title={t("editor.sections.layout")} note={t("editor.layout.note")}>
        <LayoutEditor
          template={style.template}
          palette={style.palette}
          layout={style.layout}
          onChange={(layout) => set({ layout })}
          idPrefix={idPrefix}
        />
      </StyleSection>

      <StyleSection title={t("editor.sections.color")} note={t("editor.color.note")}>
        <ColorEditor
          template={style.template}
          palette={style.palette}
          onChange={(palette) => set({ palette })}
        />
      </StyleSection>

      <StyleSection title={t("editor.sections.background")} note={t("editor.background.note")}>
        <BackgroundEditor
          template={style.template}
          palette={style.palette}
          background={style.background}
          onChange={(background) => set({ background })}
        />
      </StyleSection>

      <StyleSection title={t("editor.sections.envelope")} note={t("editor.envelope.note")}>
        <EnvelopeEditor color={style.envelopeColor} onChange={(envelopeColor) => set({ envelopeColor })} />
      </StyleSection>
    </>
  );
}
