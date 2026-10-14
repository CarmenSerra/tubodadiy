"use client";

import * as React from "react";
import type { CSSProperties } from "react";
import {
  CalendarDaysIcon,
  ChurchIcon,
  HeartIcon,
  MailCheckIcon,
  MessageSquareTextIcon,
  PlusIcon,
  UtensilsCrossedIcon,
  XIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { DEFAULT_BODY_FONT, DEFAULT_TITLE_FONT, customFontOf, fontFamilyOf } from "@/components/invitation/custom-fonts";
import {
  DND_ITEM,
  DND_SLOT,
  canPlace,
  getActiveDrag,
  isCornerSlot,
  parseDraggedItem,
  parseDraggedSlot,
  setActiveDrag,
} from "@/components/invitation/custom-slots";
import { Doodle } from "@/components/invitation/doodles";
import { InvitationEnvelope } from "@/components/invitation/invitation-envelope";
import {
  CUSTOM_SLOTS,
  formatShortDate,
  formatTime,
  type CustomDesign,
  type CustomSlotId,
  type CustomSlotItem,
  type CustomTextBlock,
  type InvitationContent,
  type InvitationGift,
  type InvitationPlace,
  type InvitationPublicData,
} from "@/components/invitation/invitation-model";
import { ThanksCard } from "@/components/invitation/invitation-thanks";
import { DEFAULT_PALETTE, buildTheme, resolveEnvelope, type InvitationPalette } from "@/components/invitation/invitation-theme";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { dateFormatter } from "@/lib/i18n/format";
import { getServerT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

import "./invitation.css";
import "./custom-card.css";

/**
 * Lo que necesita la tarjeta «Desde cero»: el contenido de la invitación (vale tanto
 * `InvitationContent` del editor como `InvitationPublicData` de la página pública). `gift`
 * solo lo usa la tarjetita de agradecimiento.
 */
export type CustomContent = Omit<InvitationContent, "showGift"> & { gift?: InvitationGift | null };

export type PlaceHandler = (slot: CustomSlotId, item: CustomSlotItem | null, from?: CustomSlotId) => void;

const paletteOf = (design: CustomDesign): InvitationPalette =>
  design.palette ?? { id: DEFAULT_PALETTE.id, colors: { ...DEFAULT_PALETTE.colors } };

/**
 * Variables CSS del diseño: los colores de la paleta (`--inv-*`, como en las plantillas) y las
 * fuentes y el tamaño de los títulos (`--cc-*`). Van en la tarjeta, la tarjetita y la composición.
 */
export function customCardVars(design: CustomDesign): CSSProperties {
  const title = customFontOf(design.titleFont, DEFAULT_TITLE_FONT);
  return {
    ...buildTheme(paletteOf(design).colors, "minimal").vars,
    "--cc-title": fontFamilyOf(design.titleFont, DEFAULT_TITLE_FONT),
    "--cc-body": fontFamilyOf(design.bodyFont, DEFAULT_BODY_FONT),
    "--cc-tk": String(title.titleScale ?? 1),
    "--cc-tw": String(title.titleWeight ?? 400),
    "--cc-case": title.upper ? "uppercase" : "none",
    "--cc-ls": title.upper ? "0.06em" : "0",
  } as CSSProperties;
}

// ---------------------------------------------------------------------------
// Contenido de cada bloque de texto
// ---------------------------------------------------------------------------

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayOf(value: string): Date | null {
  const m = DAY_RE.exec(value);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function nameSize(names: string): "l" | "m" | "s" | "xs" {
  const length = names.length;
  return length <= 12 ? "l" : length <= 20 ? "m" : length <= 36 ? "s" : "xs";
}

function messageSize(message: string): "l" | "m" | "s" {
  return message.length <= 130 ? "l" : message.length <= 300 ? "m" : "s";
}

function PlaceBlock({
  kind,
  place,
  lang,
  edit,
  placeholder,
}: {
  kind: string;
  place: InvitationPlace;
  lang: Lang;
  edit: boolean;
  placeholder: string;
}) {
  const name = place.name || place.address;
  if (!name) {
    return edit ? (
      <div className="cc-place" data-ph="">
        <p className="cc-eyebrow">{kind}</p>
        <p className="cc-placeName">{placeholder}</p>
      </div>
    ) : null;
  }
  const detail = [formatTime(place.time, lang), place.name ? place.address : ""].filter(Boolean).join(" · ");
  return (
    <div className="cc-place">
      <p className="cc-eyebrow">{kind}</p>
      <p className="cc-placeName">{name}</p>
      {detail && <p className="cc-placeLine">{detail}</p>}
    </div>
  );
}

function TextBlock({ block, content, edit }: { block: CustomTextBlock; content: CustomContent; edit: boolean }) {
  const { t } = useTranslation("customCard");
  const lang = content.lang;
  const tv = getServerT(lang, "invitation");

  switch (block) {
    case "names": {
      const typed = content.names.trim();
      const names = typed || "Ana & Luis";
      return (
        <p className="cc-names" data-size={nameSize(names)} data-ph={!typed && edit ? "" : undefined}>
          {names}
        </p>
      );
    }
    case "date": {
      const date = dayOf(content.date);
      if (!date) {
        return edit ? (
          <div className="cc-date" data-ph="">
            <p className="cc-dateMain">{t("placeholder.date")}</p>
          </div>
        ) : null;
      }
      const weekday = capitalize(dateFormatter(lang, { weekday: "long" }).format(date));
      const full = dateFormatter(lang, { day: "numeric", month: "long", year: "numeric" }).format(date);
      return (
        <div className="cc-date">
          <p className="cc-eyebrow">{weekday}</p>
          <p className="cc-dateMain">{full}</p>
        </div>
      );
    }
    case "ceremony":
      return (
        <PlaceBlock
          kind={tv("view.places.ceremony")}
          place={content.ceremony}
          lang={lang}
          edit={edit}
          placeholder={t("placeholder.ceremony")}
        />
      );
    case "banquet":
      return (
        <PlaceBlock
          kind={tv("view.places.banquet")}
          place={content.banquet}
          lang={lang}
          edit={edit}
          placeholder={t("placeholder.banquet")}
        />
      );
    case "message": {
      const message = content.message.trim();
      if (!message) {
        return edit ? (
          <p className="cc-message" data-size="l" data-ph="">
            {t("placeholder.message")}
          </p>
        ) : null;
      }
      return (
        <p className="cc-message" data-size={messageSize(message)}>
          {message}
        </p>
      );
    }
    case "rsvp": {
      const deadline = formatShortDate(content.rsvpDeadline, lang);
      return (
        <div className="cc-rsvp">
          <p className="cc-rsvpTitle">{tv("view.rsvpTitle")}</p>
          {deadline && (
            <p className="cc-rsvpNote">
              {tv("view.deadline.beforePrefix")}
              {deadline}
              {tv("view.deadline.beforeSuffix")}
            </p>
          )}
        </div>
      );
    }
  }
}

function ItemView({ item, content, edit }: { item: CustomSlotItem; content: CustomContent; edit: boolean }) {
  if (item.kind === "doodle") return <Doodle name={item.name} className="cc-doodle" />;
  return <TextBlock block={item.block} content={content} edit={edit} />;
}

// ---------------------------------------------------------------------------
// Hueco
// ---------------------------------------------------------------------------

interface SlotProps {
  slot: CustomSlotId;
  item: CustomSlotItem | undefined;
  content: CustomContent;
  /** Se pintan los huecos vacíos y los marcos (modo edición). */
  edit: boolean;
  /** Hay interacción (arrastrar, tocar, quitar). */
  interactive: boolean;
  selected: CustomSlotItem | null;
  over: boolean;
  dragging: boolean;
  onPlace?: PlaceHandler;
  onOver: (slot: CustomSlotId | null) => void;
  onDragging: (slot: CustomSlotId | null) => void;
  slots: Partial<Record<CustomSlotId, CustomSlotItem>>;
}

function Slot({ slot, item, content, edit, interactive, selected, over, dragging, onPlace, onOver, onDragging, slots }: SlotProps) {
  const { t } = useTranslation("customCard");
  if (!edit && !item) return null;

  const corner = isCornerSlot(slot);
  const slotLabel = t(`slot.${slot}`);
  const itemLabel = (it: CustomSlotItem) => (it.kind === "text" ? t(`block.${it.block}`) : t(`doodle.${it.name}`, { defaultValue: it.name }));

  const canTap = interactive && !!onPlace && !!selected;
  const tapOk = canTap && canPlace(slot, selected!);
  const invalid = canTap && !tapOk;

  const dnd = interactive && onPlace
    ? {
        onDragOver: (event: React.DragEvent) => {
          if (!event.dataTransfer.types.includes(DND_ITEM)) return;
          const active = getActiveDrag();
          if (active && !canPlace(slot, active)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          if (!over) onOver(slot);
        },
        onDragLeave: (event: React.DragEvent) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onOver(null);
        },
        onDrop: (event: React.DragEvent) => {
          event.preventDefault();
          onOver(null);
          setActiveDrag(null);
          const dropped = parseDraggedItem(event.dataTransfer.getData(DND_ITEM));
          if (!dropped || !canPlace(slot, dropped)) return;
          const from = parseDraggedSlot(event.dataTransfer.getData(DND_SLOT));
          if (from === slot) return;
          const displaced = slots[slot];
          if (from && displaced && !canPlace(from, displaced)) return;
          onPlace(slot, dropped, from);
        },
      }
    : {};

  return (
    <div
      className="cc-slot"
      data-slot={slot}
      data-corner={corner ? "" : undefined}
      data-filled={item ? "" : undefined}
      data-over={over ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
      data-target={tapOk ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      role="group"
      aria-label={item ? t("slot.filled", { slot: slotLabel, item: itemLabel(item) }) : t("slot.empty", { slot: slotLabel })}
      {...dnd}
    >
      {item ? (
        <div
          className="cc-item"
          draggable={interactive && !!onPlace}
          onDragStart={(event) => {
            event.dataTransfer.setData(DND_ITEM, JSON.stringify(item));
            event.dataTransfer.setData(DND_SLOT, slot);
            event.dataTransfer.effectAllowed = "move";
            setActiveDrag(item);
            window.setTimeout(() => onDragging(slot), 0);
          }}
          onDragEnd={() => {
            setActiveDrag(null);
            onDragging(null);
            onOver(null);
          }}
        >
          <ItemView item={item} content={content} edit={edit} />
        </div>
      ) : (
        <span className="cc-slotHint" aria-hidden="true">
          <PlusIcon />
        </span>
      )}

      {tapOk && (
        <button
          type="button"
          className="cc-slotBtn"
          aria-label={t("slot.place", { item: itemLabel(selected!), slot: slotLabel })}
          onClick={() => onPlace!(slot, selected!)}
        />
      )}
      {interactive && onPlace && item && (
        <button
          type="button"
          className="cc-remove"
          aria-label={t("slot.remove", { item: itemLabel(item), slot: slotLabel })}
          onClick={() => onPlace(slot, null)}
        >
          <span className="cc-removeDot">
            <XIcon aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta
// ---------------------------------------------------------------------------

export interface CustomCardProps {
  content: CustomContent;
  design: CustomDesign;
  /** `edit`: huecos visibles (rejilla discontinua). `view`: solo lo colocado, tal como lo ve el invitado. */
  mode: "edit" | "view";
  /** Elemento elegido en la batería (tocar para elegir y tocar un hueco para colocarlo). */
  selected?: CustomSlotItem | null;
  /**
   * Coloca (`item`), quita (`item === null`) o traslada (`from`: intercambia con lo que hubiera)
   * un elemento. `applyPlacement` de `custom-slots.ts` aplica estas reglas a los huecos.
   */
  onPlace?: PlaceHandler;
  /** Con `mode="edit"`: la tarjeta ya se ve como la final (huecos vacíos y marcos se desvanecen) y no responde. */
  final?: boolean;
  className?: string;
}

/**
 * Tarjeta 4:5 del modo «Desde cero»: una rejilla de huecos fijos (dos esquinas arriba, seis filas,
 * dos esquinas abajo) donde se suelta un bloque de texto o un doodle. En `view` los huecos no se
 * ven y los vacíos no ocupan nada. Ocupa el ancho de su contenedor.
 */
export function CustomCard({ content, design, mode, selected = null, onPlace, final = false, className }: CustomCardProps) {
  const { t } = useTranslation("customCard");
  const tv = getServerT(content.lang ?? DEFAULT_LANG, "invitation");
  const [over, setOver] = React.useState<CustomSlotId | null>(null);
  const [dragging, setDragging] = React.useState<CustomSlotId | null>(null);
  const edit = mode === "edit";
  const interactive = edit && !final;
  const slots = design.slots;

  const render = (slot: CustomSlotId) => (
    <Slot
      key={slot}
      slot={slot}
      item={slots[slot]}
      content={content}
      edit={edit}
      interactive={interactive}
      selected={selected}
      over={over === slot}
      dragging={dragging === slot}
      onPlace={onPlace}
      onOver={setOver}
      onDragging={setDragging}
      slots={slots}
    />
  );

  return (
    <section
      className={cn("cc-card", className)}
      data-mode={mode}
      data-final={final ? "" : undefined}
      data-picking={interactive && selected ? "" : undefined}
      aria-label={tv("cardLabel")}
      style={customCardVars(design)}
      lang={content.lang}
    >
      <div className="cc-grid">
        <div className="cc-band">{(["cornerTL", "cornerTR"] as const).map(render)}</div>
        {CUSTOM_SLOTS.filter((s) => s.startsWith("row")).map(render)}
        <div className="cc-band">{(["cornerBL", "cornerBR"] as const).map(render)}</div>
      </div>
      {/* Aviso para lectores de pantalla cuando hay algo elegido por colocar */}
      {interactive && selected && (
        <p className="sr-only" role="status">
          {t("item.picked", { item: selected.kind === "text" ? t(`block.${selected.block}`) : t(`doodle.${selected.name}`, { defaultValue: selected.name }) })}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tarjetita de agradecimiento con las fuentes del diseño
// ---------------------------------------------------------------------------

/** Los datos "vistos" por las piezas que reutilizan las plantillas (neutra: sin adornos ni fondo). */
export function customPublicData(content: CustomContent, design: CustomDesign): InvitationPublicData {
  return {
    ...content,
    gift: content.gift ?? null,
    template: "minimal",
    palette: paletteOf(design),
    background: undefined,
    layout: undefined,
    envelopeColor: design.envelopeColor,
  };
}

/** `ThanksCard` con la paleta y las fuentes del diseño (título en «Muchas gracias» y las iniciales). */
export function CustomThanks({ content, design, className }: { content: CustomContent; design: CustomDesign; className?: string }) {
  return (
    <div className={cn("cc-thanks", className)} style={customCardVars(design)}>
      <ThanksCard data={customPublicData(content, design)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composición: sobre + tarjeta + tarjetita, plana o final
// ---------------------------------------------------------------------------

export interface CustomCompositionProps {
  content: CustomContent;
  design: CustomDesign;
  /** `flat`: tarjetas rectas, el sobre debajo y la tarjetita a la derecha. `final`: como la ve el invitado. */
  arrangement: "flat" | "final";
  /** Se puede colocar elementos en la tarjeta (en `final` los huecos se desvanecen y no responden). */
  editable: boolean;
  selected?: CustomSlotItem | null;
  onPlace?: PlaceHandler;
  className?: string;
}

/**
 * La vista previa del modo «Desde cero». Cambiar `arrangement` mueve las tres piezas con una
 * transición (transform; sin movimiento si el usuario prefiere reducirlo). Tiene su propia
 * proporción: solo hay que darle ancho.
 */
export function CustomComposition({ content, design, arrangement, editable, selected = null, onPlace, className }: CustomCompositionProps) {
  const envelope = resolveEnvelope(paletteOf(design), design.envelopeColor, "minimal");
  return (
    <div className={cn("inv-root inv-preview cc-compose", className)} data-arrangement={arrangement} lang={content.lang}>
      <div className="cc-stage">
        <div className="cc-piece cc-pieceEnv">
          <InvitationEnvelope color={envelope} className="cc-env" />
        </div>
        <div className="cc-piece cc-pieceCard">
          <CustomCard
            content={content}
            design={design}
            mode={editable ? "edit" : "view"}
            final={editable && arrangement === "final"}
            selected={selected}
            onPlace={onPlace}
          />
        </div>
        <div className="cc-piece cc-pieceThanks">
          <CustomThanks content={content} design={design} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Elemento de la batería
// ---------------------------------------------------------------------------

const BLOCK_ICONS = {
  names: HeartIcon,
  date: CalendarDaysIcon,
  ceremony: ChurchIcon,
  banquet: UtensilsCrossedIcon,
  message: MessageSquareTextIcon,
  rsvp: MailCheckIcon,
} as const satisfies Record<CustomTextBlock, unknown>;

/**
 * Elemento de la batería: botón real que se puede arrastrar (ratón) o elegir con un toque o
 * Enter/Espacio (luego se toca un hueco). Un segundo toque lo deja de elegir.
 */
export function CustomDragItem({
  item,
  selected = false,
  onSelect,
  className,
}: {
  item: CustomSlotItem;
  selected?: boolean;
  onSelect?: (item: CustomSlotItem | null) => void;
  className?: string;
}) {
  const { t } = useTranslation("customCard");
  const label = item.kind === "text" ? t(`block.${item.block}`) : t(`doodle.${item.name}`, { defaultValue: item.name });
  const Icon = item.kind === "text" ? BLOCK_ICONS[item.block] : null;
  return (
    <button
      type="button"
      draggable
      aria-pressed={selected}
      aria-label={t("item.pick", { item: label })}
      title={label}
      onClick={() => onSelect?.(selected ? null : item)}
      onDragStart={(event) => {
        event.dataTransfer.setData(DND_ITEM, JSON.stringify(item));
        event.dataTransfer.effectAllowed = "copyMove";
        setActiveDrag(item);
      }}
      onDragEnd={() => setActiveDrag(null)}
      className={cn(
        "inline-flex cursor-grab items-center justify-center gap-2 border-2 text-ink-strong outline-none transition-colors active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        item.kind === "doodle" ? "size-14 rounded-xl p-1.5" : "min-h-11 rounded-full px-3.5 text-sm font-medium",
        selected ? "border-lilac bg-lilac-soft/60" : "border-line bg-raised hover:border-lilac",
        className
      )}
    >
      {item.kind === "doodle" ? (
        <Doodle name={item.name} className="size-full text-ink" />
      ) : (
        <>
          {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-green" />}
          {label}
        </>
      )}
    </button>
  );
}
