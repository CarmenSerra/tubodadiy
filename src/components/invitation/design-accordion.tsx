"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ChipGroup } from "@/components/invitation/choice-chips";
import {
  BACKGROUND_IDS,
  cleanBackground,
  isMotif,
  templateAllowsMotifs,
  type InvitationBackground,
} from "@/components/invitation/invitation-backgrounds";
import {
  LAYOUT_IDS,
  STATIONERY_LAYOUTS,
  cleanLayout,
} from "@/components/invitation/invitation-layouts";
import {
  TEMPLATES,
  type InvitationStyle,
  type InvitationTemplateId,
} from "@/components/invitation/invitation-model";
import { presetFor } from "@/components/invitation/invitation-theme";
import { ColorTuner, PaletteGrid } from "@/components/invitation/palette-picker";
import { TemplateGrid } from "@/components/invitation/style-editor";
import { cn } from "@/lib/utils";

type SectionId = "style" | "palette" | "layout" | "background" | "motifs";

/** Una sección del acordeón: botón con título, resumen de lo elegido y chevron. */
export function Section({
  id,
  title,
  summary,
  note,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  note?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-raised">
      <h3>
        <button
          type="button"
          id={`${id}-trigger`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left outline-none transition-colors hover:bg-lilac-soft/50 focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-base font-semibold leading-snug text-ink">{title}</span>
            <span className="truncate text-sm text-ink-muted">{summary}</span>
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0 text-ink-muted transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>
      </h3>
      {open && (
        <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`} className="flex flex-col gap-3 px-4 pb-4">
          {note && <p className="text-sm text-ink-muted">{note}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * Selector de estilo de la invitación en acordeón: Estilo y Paleta abiertas, y el resto
 * («Más opciones») cerradas con un resumen de lo elegido. Misma semántica que `StyleEditor`
 * (incluida la regla de motivos por plantilla), que sigue siendo el de «Reserva la fecha».
 */
export function DesignAccordion({
  style,
  onChange,
  idPrefix = "design",
}: {
  style: InvitationStyle;
  onChange: (style: InvitationStyle) => void;
  /** Para que los controles de dos editores en la misma página no compartan nombre. */
  idPrefix?: string;
}) {
  const { t } = useTranslation("invitation");
  const [open, setOpen] = React.useState<ReadonlySet<SectionId>>(() => new Set<SectionId>(["style", "palette"]));
  const toggle = (id: SectionId) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const set = (patch: Partial<InvitationStyle>) => {
    const next = { ...style, ...patch };
    // Plantillas con dibujos propios (retro, doodle, azulejo): sin motivos de acuarela de fondo.
    const background = cleanBackground(next.background, next.template);
    onChange(background === next.background ? next : { ...next, background });
  };

  const { template, palette } = style;
  const tpl = TEMPLATES.find((item) => item.id === template);
  const layout = cleanLayout(style.layout);
  const motifsAllowed = templateAllowsMotifs(template);
  const background = !motifsAllowed && isMotif(style.background) ? "plain" : (style.background ?? "plain");

  const preset = presetFor(palette?.colors);
  const paletteSummary = preset ? t(`palettes.${preset.id}`) : palette ? t("design.summary.customPalette") : t("design.summary.legacyPalette");
  const styleSummary = tpl ? `${t(`templates.${tpl.id}.label`)} · ${t(`templates.${tpl.id}.hint`)}` : "";
  const backgroundSummary = isMotif(background) ? t("design.summary.motifBackground") : t(`backgrounds.${background}`);
  const motifsSummary = !motifsAllowed
    ? t("design.summary.motifsUnavailable")
    : isMotif(background)
      ? t(`backgrounds.${background}`)
      : t("editor.background.noMotifs");

  const plain = BACKGROUND_IDS.filter((id) => !isMotif(id));
  const motifs = BACKGROUND_IDS.filter((id) => isMotif(id));
  const pickBackground = (id: InvitationBackground) => set({ background: id });

  const section = (id: SectionId) => ({
    id: `${idPrefix}-${id}`,
    open: open.has(id),
    onToggle: () => toggle(id),
  });

  return (
    <div className="flex flex-col gap-3">
      <Section {...section("style")} title={t("design.sections.style")} summary={styleSummary} note={t("design.notes.style")}>
        <TemplateGrid
          template={template}
          palette={palette}
          onChange={(next: InvitationTemplateId) => set({ template: next })}
          idPrefix={idPrefix}
        />
      </Section>

      <Section
        {...section("palette")}
        title={t("design.sections.palette")}
        summary={paletteSummary}
        note={t("design.notes.palette")}
      >
        <PaletteGrid variant="dots" palette={palette} onChange={(next) => set({ palette: next })} />
        <hr className="m-0 h-0 border-0 border-t border-line" />
        <ColorTuner
          bare
          template={template}
          palette={palette}
          envelopeColor={style.envelopeColor}
          onChange={(next) => set({ palette: next })}
          onEnvelopeChange={(envelopeColor) => set({ envelopeColor })}
        />
      </Section>

      <p className="mt-2 px-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">{t("design.more")}</p>

      <Section
        {...section("layout")}
        title={t("design.sections.layout")}
        summary={t(`layouts.${layout}`)}
        note={t("design.notes.layout")}
      >
        <ChipGroup
          label={t("editor.layout.label")}
          idPrefix={`${idPrefix}-layout`}
          options={LAYOUT_IDS.map((id) => ({ id, label: t(`layouts.${id}`), active: layout === id }))}
          onSelect={(id) => set({ layout: id })}
        />
        <p role="status" className="text-[13px] leading-snug text-ink-muted">
          {STATIONERY_LAYOUTS.includes(layout) ? t("design.notes.layoutShared") : t("design.layoutInvitationOnly")}
        </p>
      </Section>

      <Section
        {...section("background")}
        title={t("design.sections.background")}
        summary={backgroundSummary}
        note={t("design.notes.background")}
      >
        <ChipGroup
          label={t("editor.background.label")}
          options={plain.map((id) => ({ id, label: t(`backgrounds.${id}`), active: background === id }))}
          onSelect={pickBackground}
        />
      </Section>

      <Section
        {...section("motifs")}
        title={t("design.sections.motifs")}
        summary={motifsSummary}
        note={motifsAllowed ? t("design.notes.motifs") : t("editor.background.ownArt")}
      >
        <ChipGroup
          label={t("editor.background.motifsLabel")}
          disabled={!motifsAllowed}
          options={[
            { id: "plain" as InvitationBackground, label: t("editor.background.noMotifs"), active: !isMotif(background) },
            ...motifs.map((id) => ({ id, label: t(`backgrounds.${id}`), active: background === id })),
          ]}
          onSelect={pickBackground}
        />
      </Section>
    </div>
  );
}
