"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/invitation/design-accordion";
import { CUSTOM_FONTS, FONT_GROUPS, fontFamilyOf } from "@/components/invitation/custom-fonts";
import { Doodle, DOODLE_NAMES } from "@/components/invitation/doodles";
import {
  CUSTOM_SLOTS,
  CUSTOM_TEXT_BLOCKS,
  type CustomDesign,
  type CustomSlotItem,
  type CustomTextBlock,
} from "@/components/invitation/invitation-model";
import { presetFor } from "@/components/invitation/invitation-theme";
import { ColorTuner, PaletteGrid } from "@/components/invitation/palette-picker";
import { cn } from "@/lib/utils";

type SectionId = "fonts" | "palette" | "elements";
type FontRole = "title" | "body";

/** Mismo elemento (para marcar el seleccionado). */
export function sameItem(a: CustomSlotItem | null | undefined, b: CustomSlotItem | null | undefined): boolean {
  if (!a || !b) return false;
  return a.kind === "text" && b.kind === "text" ? a.block === b.block : a.kind === "doodle" && b.kind === "doodle" && a.name === b.name;
}

const TILE_STATE = (active: boolean) =>
  active ? "border-lilac bg-lilac-soft/60" : "border-line bg-raised hover:border-lilac";
const TILE =
  "flex min-h-11 items-center gap-2 rounded-xl border-2 px-2.5 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/**
 * Paso «Diseño» del modo «Desde cero»: Fuentes (cuadrados por estilo), Paleta y Elementos
 * (bloques de información aún sin colocar + batería de doodles, arrastrables y seleccionables con un toque).
 */
export function BlankDesignPanel({
  design,
  onChange,
  selected,
  onSelect,
}: {
  design: CustomDesign;
  onChange: (change: (design: CustomDesign) => CustomDesign) => void;
  selected: CustomSlotItem | null;
  onSelect: (item: CustomSlotItem | null) => void;
}) {
  const { t } = useTranslation("invitationPage");
  const [open, setOpen] = React.useState<ReadonlySet<SectionId>>(() => new Set<SectionId>(["fonts", "elements"]));
  const toggle = (id: SectionId) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const section = (id: SectionId) => ({ id: `inv-blank-${id}`, open: open.has(id), onToggle: () => toggle(id) });

  const fontLabel = (id: string) => CUSTOM_FONTS.find((f) => f.id === id)?.label ?? id;
  const preset = presetFor(design.palette?.colors);
  const paletteSummary = preset
    ? t(`invitation:palettes.${preset.id}`)
    : design.palette
      ? t("invitation:design.summary.customPalette")
      : t("invitation:design.summary.legacyPalette");
  const placed = CUSTOM_SLOTS.filter((s) => design.slots[s]).length;

  return (
    <div className="flex flex-col gap-3">
      <Section
        {...section("fonts")}
        title={t("blank.fonts.title")}
        summary={`${fontLabel(design.titleFont)} · ${fontLabel(design.bodyFont)}`}
        note={t("blank.fonts.note")}
      >
        <FontPicker design={design} onChange={onChange} />
      </Section>

      <Section {...section("palette")} title={t("blank.palette.title")} summary={paletteSummary} note={t("blank.palette.note")}>
        <PaletteGrid
          variant="dots"
          palette={design.palette}
          onChange={(palette) => onChange((d) => ({ ...d, palette }))}
        />
        <hr className="m-0 h-0 border-0 border-t border-line" />
        <ColorTuner
          bare
          template="botanico"
          palette={design.palette}
          envelopeColor={design.envelopeColor}
          onChange={(palette) => onChange((d) => ({ ...d, palette }))}
          onEnvelopeChange={(envelopeColor) => onChange((d) => ({ ...d, envelopeColor }))}
        />
      </Section>

      <Section
        {...section("elements")}
        title={t("blank.elements.title")}
        summary={placed === 0 ? t("blank.elements.summaryNone") : t("blank.elements.summary", { count: placed })}
        note={t("blank.elements.note")}
      >
        <ElementsPicker design={design} selected={selected} onSelect={onSelect} />
      </Section>
    </div>
  );
}

// ---- Fuentes ----

function FontPicker({
  design,
  onChange,
}: {
  design: CustomDesign;
  onChange: (change: (design: CustomDesign) => CustomDesign) => void;
}) {
  const { t } = useTranslation("invitationPage");
  const [role, setRole] = React.useState<FontRole>("title");
  const current = role === "title" ? design.titleFont : design.bodyFont;
  const pick = (id: string) => onChange((d) => (role === "title" ? { ...d, titleFont: id } : { ...d, bodyFont: id }));

  const groups = FONT_GROUPS.map((g) => ({ id: g.group, fonts: g.fonts }));

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={t("blank.fonts.roleLabel")}
        className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1"
      >
        {(["title", "body"] as const).map((id) => {
          const active = role === id;
          const fontId = id === "title" ? design.titleFont : design.bodyFont;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setRole(id)}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-start justify-center rounded-xl border-2 px-3 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac",
                active ? "border-lilac bg-lilac-soft/60" : "border-transparent hover:bg-lilac-soft/40"
              )}
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t(`blank.fonts.role.${id}`)}
              </span>
              <span
                className="w-full truncate text-base leading-tight text-ink"
                style={{ fontFamily: fontFamilyOf(fontId) }}
              >
                {CUSTOM_FONTS.find((f) => f.id === fontId)?.label ?? fontId}
              </span>
            </button>
          );
        })}
      </div>

      <div className="@container">
        <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.id}
              role="radiogroup"
              aria-label={t("blank.fonts.groupLabel", {
                style: t(`invitation:templates.${group.id}.label`),
                role: t(`blank.fonts.role.${role}`),
              })}
              className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-2"
            >
              <p className="px-1 text-sm font-semibold text-ink">{t(`invitation:templates.${group.id}.label`)}</p>
              {group.fonts.map((font) => {
                const active = current === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pick(font.id)}
                    className={cn(TILE, TILE_STATE(active))}
                  >
                    <span
                      aria-hidden="true"
                      className="w-9 shrink-0 text-2xl leading-none text-ink"
                      style={{ fontFamily: fontFamilyOf(font.id) }}
                    >
                      Aa
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-strong" style={{ fontFamily: fontFamilyOf(font.id) }}>
                      {font.label}
                    </span>
                    {active && <CheckIcon aria-hidden="true" className="size-3.5 shrink-0 text-green" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Elementos ----

/** Un elemento de la batería: arrastrable con ratón y seleccionable con un toque (o Enter/Espacio). */
function PaletteItem({
  item,
  label,
  selected,
  onSelect,
  children,
  className,
}: {
  item: CustomSlotItem;
  label: string;
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // El contenedor es el arrastrable (los <button> no arrastran bien en Firefox); el botón hace de alternativa táctil/teclado.
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-tubo-item", JSON.stringify(item));
        e.dataTransfer.effectAllowed = "copyMove";
      }}
      className="flex cursor-grab active:cursor-grabbing"
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={label}
        title={label}
        onClick={onSelect}
        className={cn(TILE, TILE_STATE(selected), "w-full justify-center", className)}
      >
        {children}
      </button>
    </div>
  );
}

function ElementsPicker({
  design,
  selected,
  onSelect,
}: {
  design: CustomDesign;
  selected: CustomSlotItem | null;
  onSelect: (item: CustomSlotItem | null) => void;
}) {
  const { t } = useTranslation("invitationPage");
  const placedBlocks = new Set<CustomTextBlock>();
  for (const slot of CUSTOM_SLOTS) {
    const item = design.slots[slot];
    if (item?.kind === "text") placedBlocks.add(item.block);
  }
  const freeBlocks = CUSTOM_TEXT_BLOCKS.filter((b) => !placedBlocks.has(b));
  const toggle = (item: CustomSlotItem) => onSelect(sameItem(selected, item) ? null : item);
  const selectedLabel =
    selected?.kind === "text"
      ? t(`blank.blocks.${selected.block}`)
      : selected
        ? t(`blank.doodles.${selected.name}`, { defaultValue: selected.name })
        : "";

  return (
    <div className="flex flex-col gap-4">
      <p role="status" aria-live="polite" className="min-h-5 text-[13px] text-ink-muted">
        {selected ? t("blank.elements.selected", { name: selectedLabel }) : t("blank.elements.hint")}
      </p>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-ink">{t("blank.elements.blocks")}</h4>
        {freeBlocks.length === 0 ? (
          <p className="text-[13px] text-ink-muted">{t("blank.elements.allPlaced")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {freeBlocks.map((block) => {
              const item: CustomSlotItem = { kind: "text", block };
              const label = t(`blank.blocks.${block}`);
              return (
                <PaletteItem
                  key={block}
                  item={item}
                  label={label}
                  selected={sameItem(selected, item)}
                  onSelect={() => toggle(item)}
                  className="px-4 text-sm font-medium text-ink-strong"
                >
                  {label}
                </PaletteItem>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-ink">{t("blank.elements.doodles")}</h4>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2">
          {DOODLE_NAMES.map((name) => {
            const item: CustomSlotItem = { kind: "doodle", name };
            return (
              <PaletteItem
                key={name}
                item={item}
                label={t(`blank.doodles.${name}`, { defaultValue: name })}
                selected={sameItem(selected, item)}
                onSelect={() => toggle(item)}
                className="aspect-square min-h-14 p-1.5"
              >
                <Doodle name={name} className="size-full text-ink" />
              </PaletteItem>
            );
          })}
        </div>
      </div>
    </div>
  );
}
