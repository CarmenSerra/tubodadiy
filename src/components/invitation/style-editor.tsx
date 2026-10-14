"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Doodle } from "@/components/invitation/doodles";
import { cleanBackground } from "@/components/invitation/invitation-backgrounds";
import {
  TEMPLATES,
  type InvitationStyle,
  type InvitationTemplateId,
} from "@/components/invitation/invitation-model";
import { themeFor, type InvitationTheme } from "@/components/invitation/invitation-theme";
import { LayoutEditor } from "@/components/invitation/layout-picker";
import { BackgroundEditor, ColorEditor } from "@/components/invitation/palette-picker";
import { cn } from "@/lib/utils";

/** Miniatura de una plantilla con los colores de la paleta elegida. */
function TemplateThumb({ id, theme }: { id: InvitationTemplateId; theme: InvitationTheme }) {
  const ink = theme.ink;
  const accent = theme.primary;
  const line = (cls: string, color = ink) => <span className={cn("rounded-full", cls)} style={{ background: color }} />;

  if (id === "doodle") {
    const small = "absolute size-3.5";
    return (
      <>
        <span className="absolute inset-0 overflow-hidden" style={{ color: accent }}>
          <Doodle name="rings" className={cn(small, "left-1 top-0.5 -rotate-12")} />
          <Doodle name="heart" className={cn(small, "right-1.5 top-1 rotate-12")} />
          <Doodle name="flute" className={cn(small, "bottom-0.5 left-2 rotate-6")} />
          <Doodle name="polaroid" className={cn(small, "bottom-0.5 right-1 -rotate-6")} />
        </span>
        <span
          className="relative flex h-9 w-[58%] flex-col items-center justify-center gap-1 rounded-md border"
          style={{ background: theme.paper, borderColor: theme.line }}
        >
          {line("h-1.5 w-9")}
          {line("h-1 w-5", accent)}
        </span>
      </>
    );
  }
  if (id === "hilo") {
    return (
      <>
        {line("h-1.5 w-12")}
        {line("h-1.5 w-8")}
        <Doodle name="threadHands" className="mt-0.5 h-auto w-11" style={{ color: ink, ["--doodle-fill" as string]: ink }} />
      </>
    );
  }
  if (id === "retro") {
    return (
      <>
        <span
          className="absolute -left-2 top-6 h-4 w-[130%] -rotate-12 rounded-full"
          style={{ background: theme.line, opacity: 0.8 }}
        />
        <Doodle name="sparkle" className="absolute right-1.5 top-1 size-3" style={{ color: ink }} />
        <Doodle name="heart" className="absolute bottom-1 left-1.5 size-3" style={{ color: ink }} />
        <span className="relative h-2.5 w-11 rounded-full" style={{ background: ink }} />
        <span className="relative h-2.5 w-7 rounded-full" style={{ background: ink }} />
      </>
    );
  }
  if (id === "azulejo") {
    return (
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          // 15 franjas iguales (impar) y el panel deja ver 2 por cada lado: simétrico a cualquier ancho.
          background: `repeating-linear-gradient(90deg, ${accent} 0 calc(100% / 15), ${theme.paper} calc(100% / 15) calc(200% / 15))`,
        }}
      >
        <span
          className="flex h-[78%] w-[73.333%] flex-col items-center justify-center gap-1 rounded-sm border"
          style={{ background: theme.paper, borderColor: ink }}
        >
          {line("h-1.5 w-8")}
          <Doodle name="heartCouple" className="h-3.5 w-auto" style={{ color: ink }} />
        </span>
      </span>
    );
  }
  return (
    <>
      {line("h-1.5 w-10")}
      {line("h-1 w-6", accent)}
    </>
  );
}

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
 * Estilo compartido del plan: plantilla (tipografía), composición, paleta (con el color del sobre), fondo de la tarjeta.
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
  const set = (patch: Partial<InvitationStyle>) => {
    const next = { ...style, ...patch };
    // Plantillas con dibujos propios (retro, doodle, azulejo): sin motivos de acuarela de fondo.
    const background = cleanBackground(next.background, next.template);
    onChange(background === next.background ? next : { ...next, background });
  };
  const palette = style.palette;

  return (
    <>
      <StyleSection title={t("editor.sections.style")} note={t("editor.style.shared")}>
        <div role="radiogroup" aria-label={t("editor.template.label")} className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TEMPLATES.map((tpl) => {
            const active = style.template === tpl.id;
            const theme = themeFor(palette, tpl.id);
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
                  className="relative flex h-16 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-black/5"
                  style={{ background: theme.bg }}
                >
                  <TemplateThumb id={tpl.id} theme={theme} />
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
          envelopeColor={style.envelopeColor}
          onChange={(palette) => set({ palette })}
          onEnvelopeChange={(envelopeColor) => set({ envelopeColor })}
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
    </>
  );
}
