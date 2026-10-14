"use client";

import * as React from "react";
import type { CSSProperties } from "react";
import {
  CalendarDaysIcon,
  ChurchIcon,
  HeartIcon,
  MailCheckIcon,
  MessageSquareTextIcon,
  MinusIcon,
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
  coveredSlots,
  getActiveDrag,
  isCornerSlot,
  maxSpanFor,
  parseDraggedItem,
  parseDraggedSlot,
  setActiveDrag,
  spanOf,
} from "@/components/invitation/custom-slots";
import { BlankDoodle } from "@/components/invitation/blank-doodles";
import { InvitationEnvelope } from "@/components/invitation/invitation-envelope";
import {
  CUSTOM_ROWS,
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
/** Ampliar zona: `span` filas (1–3) para el hueco de `slot` (solo filas). */
export type SpanHandler = (slot: CustomSlotId, span: number) => void;

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
  if (item.kind === "doodle") return <BlankDoodle name={item.name} className="cc-doodle" />;
  return (
    <div className="cc-fit">
      <TextBlock block={item.block} content={content} edit={edit} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ajuste del texto al hueco (ampliar zona)
// ---------------------------------------------------------------------------

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/** Escala mínima (respecto al tamaño de diseño) a la que se achica un texto que no cabe. */
const FIT_MIN = 0.4;

/**
 * Cuánto puede crecer el texto (respecto a su tamaño de diseño) según las filas del hueco:
 * los nombres crecen mucho; el mensaje, lo justo para seguir leyéndose como cuerpo.
 */
function fitMax(item: CustomSlotItem, span: number): number {
  const table = item.kind === "text" && item.block === "names" ? [1, 3, 5] : item.kind === "text" && item.block === "message" ? [1, 1.5, 2.1] : [1, 1.8, 2.5];
  return table[Math.min(Math.max(span, 1), 3) - 1];
}

/** Escala de partida (antes de medir: servidor y primer pintado) para que el hueco ampliado no salga diminuto. */
function fitStart(item: CustomSlotItem, span: number): number {
  const max = fitMax(item, span);
  return span <= 1 ? 1 : 1 + (max - 1) * 0.45;
}

/**
 * Deja `--cc-fit` en `item` con la mayor escala (entre `FIT_MIN` y `max`) con la que `content` cabe
 * en el hueco. Si ni la mínima cabe (mensaje muy largo), recorta el mensaje por líneas con `--cc-clamp`.
 */
function fitToHole(item: HTMLElement, content: HTMLElement, max: number, slack: number) {
  item.style.removeProperty("--cc-clamp");
  const style = getComputedStyle(item);
  const avail = (item.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) * slack;
  if (!(avail > 4)) return;
  const set = (value: number) => item.style.setProperty("--cc-fit", (Math.round(value * 1000) / 1000).toString());
  const fits = (value: number) => {
    set(value);
    return content.offsetHeight <= avail + 1 && content.scrollWidth <= content.clientWidth + 1;
  };
  if (fits(max)) return;
  if (!fits(FIT_MIN)) {
    const message = content.querySelector<HTMLElement>(".cc-message");
    const line = message ? parseFloat(getComputedStyle(message).lineHeight) : NaN;
    if (message && line > 0) item.style.setProperty("--cc-clamp", String(Math.max(1, Math.floor(avail / line))));
    return;
  }
  let lo = FIT_MIN;
  let hi = max;
  for (let i = 0; i < 9; i += 1) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  set(lo);
}

/**
 * Hace que el texto de un hueco llene su espacio (y no se salga): mide al montar, cuando cambia el
 * contenido, el número de filas o las fuentes, y cada vez que el hueco cambia de tamaño.
 */
function useFitToHole(
  itemRef: React.RefObject<HTMLDivElement | null>,
  item: CustomSlotItem | undefined,
  span: number,
  key: string
) {
  const text = item?.kind === "text";
  const max = item ? fitMax(item, span) : 1;
  const slack = item?.kind === "text" && item.block === "names" ? 1.1 : 1;
  useIsoLayoutEffect(() => {
    const box = itemRef.current;
    const content = box?.querySelector<HTMLElement>(".cc-fit");
    if (!box || !content || !text) return;
    const run = () => fitToHole(box, content, max, slack);
    run();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(run);
    observer.observe(box);
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    fonts?.addEventListener?.("loadingdone", run);
    return () => {
      observer.disconnect();
      fonts?.removeEventListener?.("loadingdone", run);
    };
  }, [itemRef, text, max, slack, key]);
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
  /** Hay interacción (arrastrar, tocar, quitar, ampliar). */
  interactive: boolean;
  selected: CustomSlotItem | null;
  over: boolean;
  dragging: boolean;
  /** Filas que ocupa (solo filas; 1 si no está ampliado). */
  span: number;
  /** Cambia cuando cambia algo que altera el tamaño del texto (contenido, fuentes, modo). */
  fitKey: string;
  onPlace?: PlaceHandler;
  onSpan?: SpanHandler;
  onOver: (slot: CustomSlotId | null) => void;
  onDragging: (slot: CustomSlotId | null) => void;
  slots: Partial<Record<CustomSlotId, CustomSlotItem>>;
}

function Slot({ slot, item, content, edit, interactive, selected, over, dragging, span, fitKey, onPlace, onSpan, onOver, onDragging, slots }: SlotProps) {
  const { t } = useTranslation("customCard");
  const itemRef = React.useRef<HTMLDivElement>(null);
  useFitToHole(itemRef, item, span, fitKey);

  const corner = isCornerSlot(slot);
  // Fuera de edición los huecos vacíos no se ven: las esquinas no ocupan nada y las filas dejan su espacio en blanco.
  if (!edit && !item) {
    return corner ? null : <div className="cc-slot" data-slot={slot} style={{ "--cc-span": span } as CSSProperties} aria-hidden="true" />;
  }

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

  const label = item
    ? span > 1
      ? t("slot.filledSpan", { slot: slotLabel, item: itemLabel(item), count: span })
      : t("slot.filled", { slot: slotLabel, item: itemLabel(item) })
    : t("slot.empty", { slot: slotLabel });
  const showSpan = interactive && !!onSpan && !!item && !corner;
  const maxSpan = showSpan ? maxSpanFor(slots, slot) : 1;

  return (
    <div
      className="cc-slot"
      data-slot={slot}
      data-corner={corner ? "" : undefined}
      data-filled={item ? "" : undefined}
      data-span={span > 1 ? span : undefined}
      data-over={over ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
      data-target={tapOk ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      style={corner ? undefined : ({ "--cc-span": span } as CSSProperties)}
      role="group"
      aria-label={label}
      {...dnd}
    >
      {item ? (
        <div
          ref={itemRef}
          className="cc-item"
          style={item.kind === "text" ? ({ "--cc-fit": fitStart(item, span) } as CSSProperties) : undefined}
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
      {showSpan && item && (
        <div className="cc-span" role="group" aria-label={t("span.group", { item: itemLabel(item), slot: slotLabel })}>
          {/* aria-disabled (no disabled): el foco no se pierde al llegar al tope */}
          <button
            type="button"
            className="cc-spanBtn"
            aria-disabled={span <= 1}
            aria-label={t("span.shrink", { item: itemLabel(item), slot: slotLabel, count: span - 1 })}
            onClick={() => span > 1 && onSpan!(slot, span - 1)}
          >
            <span className="cc-spanDot">
              <MinusIcon aria-hidden="true" />
            </span>
          </button>
          <button
            type="button"
            className="cc-spanBtn"
            aria-disabled={span >= maxSpan}
            aria-label={t("span.grow", { item: itemLabel(item), slot: slotLabel, count: span + 1 })}
            onClick={() => span < maxSpan && onSpan!(slot, span + 1)}
          >
            <span className="cc-spanDot">
              <PlusIcon aria-hidden="true" />
            </span>
          </button>
          <span className="sr-only" role="status">
            {t("span.size", { count: span })}
          </span>
        </div>
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
  /** Ampliar zona: en `edit`, cada elemento colocado en una fila muestra −/+ para ocupar 1–3 filas. */
  onSpan?: SpanHandler;
  /** Con `mode="edit"`: la tarjeta ya se ve como la final (sin huecos, marcos ni controles) y no responde. */
  final?: boolean;
  className?: string;
}

/**
 * Tarjeta 4:5 del modo «Desde cero»: una rejilla de huecos fijos (dos esquinas arriba, seis filas,
 * dos esquinas abajo) donde se suelta un bloque de texto o un doodle. En `view` los huecos no se
 * ven y los vacíos no ocupan nada. Ocupa el ancho de su contenedor.
 */
export function CustomCard({ content, design, mode, selected = null, onPlace, onSpan, final = false, className }: CustomCardProps) {
  const { t } = useTranslation("customCard");
  const tv = getServerT(content.lang ?? DEFAULT_LANG, "invitation");
  const [over, setOver] = React.useState<CustomSlotId | null>(null);
  const [dragging, setDragging] = React.useState<CustomSlotId | null>(null);
  const edit = mode === "edit";
  const interactive = edit && !final;
  const slots = design.slots;
  // Filas cubiertas por el span de otra: ni se dibujan como hueco ni aceptan drop.
  const covered = coveredSlots(slots, design.spans);
  // Todo lo que cambia el tamaño del texto dentro de su hueco (para volver a ajustarlo).
  const fitKey = JSON.stringify([
    content.names,
    content.date,
    content.ceremony,
    content.banquet,
    content.message,
    content.rsvpDeadline,
    content.lang,
    design.titleFont,
    design.bodyFont,
    edit,
    final,
  ]);

  const render = (slot: CustomSlotId) =>
    covered.has(slot) ? null : (
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
        span={spanOf(design.spans, slot)}
        fitKey={fitKey}
        onPlace={onPlace}
        onSpan={onSpan}
        onOver={setOver}
        onDragging={setDragging}
        slots={slots}
      />
    );

  return (
    <section
      className={cn("cc-card", interactive && "cc-editing", className)}
      data-mode={mode}
      data-final={final ? "" : undefined}
      data-picking={interactive && selected ? "" : undefined}
      aria-label={tv("cardLabel")}
      style={customCardVars(design)}
      lang={content.lang}
    >
      <div className="cc-grid">
        <div className="cc-band">{(["cornerTL", "cornerTR"] as const).map(render)}</div>
        {CUSTOM_ROWS.map(render)}
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
  /** `flat`: tarjetas rectas, el sobre en vertical detrás de la tarjeta (asoma por abajo y los lados) y la tarjetita a la derecha. `final`: como la ve el invitado. */
  arrangement: "flat" | "final";
  /** Se puede colocar elementos en la tarjeta (en `final` no se ven huecos ni controles y no responde). */
  editable: boolean;
  selected?: CustomSlotItem | null;
  onPlace?: PlaceHandler;
  onSpan?: SpanHandler;
  className?: string;
}

/**
 * La vista previa del modo «Desde cero». Cambiar `arrangement` mueve las tres piezas con una
 * transición (transform; sin movimiento si el usuario prefiere reducirlo). Tiene su propia
 * proporción: solo hay que darle ancho.
 */
export function CustomComposition({ content, design, arrangement, editable, selected = null, onPlace, onSpan, className }: CustomCompositionProps) {
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
            onSpan={onSpan}
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
        <BlankDoodle name={item.name} className="size-full text-ink" />
      ) : (
        <>
          {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-green" />}
          {label}
        </>
      )}
    </button>
  );
}
