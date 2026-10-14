import { doodlePatternSvg, doodleSvg, initialsHeartsSvg, type DoodleName } from "@/components/invitation/doodles";
import { isMotif } from "@/components/invitation/invitation-backgrounds";
import { botanicalCornerSvg } from "@/components/invitation/invitation-botanical";
import { layoutInStationery, type InvitationLayout } from "@/components/invitation/invitation-layouts";
import { calendarOf, type CalendarMonth, type InvitationStyle } from "@/components/invitation/invitation-model";
import { coupleInitials } from "@/components/invitation/invitation-template-decor";
import {
  LEGACY_COLORS,
  buildTheme,
  mix,
  type InvitationTheme,
} from "@/components/invitation/invitation-theme";
import { paintBackdrop } from "@/components/stationery/save-the-date-backdrop";
import { dateParts } from "@/components/stationery/save-the-date-model";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { getServerT } from "@/lib/i18n/server";
import type { SaveTheDateDesign } from "@/lib/firebase/designs";

// Dibujo de la tarjeta «Reserva la fecha» sobre un <canvas>: la misma función
// pinta la vista previa, las miniaturas y los archivos que se exportan (PNG/PDF),
// así que lo que ves es lo que descargas. Coordenadas lógicas de 1000 × 1400
// (proporción 5 × 7); el lienzo real solo cambia la escala.

export const CARD_W = 1000;
export const CARD_H = 1400;

export interface CardFonts {
  display: string;
  script: string;
  body: string;
  /** Letra a mano en mayúsculas (plantilla «Hilo»). */
  hand: string;
  /** Redondeada y gruesa (plantilla «Retro»). */
  chunky: string;
}

/** Familias de la app (next/font las publica como variables CSS en <html>). */
export function readCardFonts(): CardFonts {
  const style = getComputedStyle(document.documentElement);
  const family = (name: string, fallback: string) => {
    const value = style.getPropertyValue(name).trim();
    return value ? `${value}, ${fallback}` : fallback;
  };
  return {
    display: family("--font-display", "Georgia, serif"),
    script: family("--font-script", "cursive"),
    body: family("--font-body", "system-ui, sans-serif"),
    hand: family("--font-hand", "cursive"),
    chunky: family("--font-chunky", "Georgia, serif"),
  };
}

/** Espera a que las tipografías de la tarjeta estén cargadas antes de dibujar. */
export async function loadCardFonts(fonts: CardFonts, design: SaveTheDateDesign): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const sample = `${design.heading}${design.name1}${design.name2}${design.place}${design.message}ÁÉÍÓÚÑáéíóúñ&0123456789`;
  const specs = [
    `400 64px ${fonts.display}`,
    `italic 400 64px ${fonts.display}`,
    `400 64px ${fonts.script}`,
    `500 28px ${fonts.body}`,
  ];
  try {
    await Promise.all(specs.map((spec) => document.fonts.load(spec, sample)));
  } catch {
    /* se dibuja con la tipografía de respaldo */
  }
}

/* ------------------------------------------------------------------ */
/* Motivos                                                              */
/* ------------------------------------------------------------------ */

type Pt = [number, number];

interface SprigOptions {
  /** Cubic Bézier del tallo: inicio, dos controles y punta. */
  p: [Pt, Pt, Pt, Pt];
  leaves: number;
  radius: number;
  stroke: string;
  fill: string;
  lineWidth?: number;
  /** Lado de la primera hoja (alternan). */
  firstSide?: 1 | -1;
}

function bezierAt([p0, p1, p2, p3]: [Pt, Pt, Pt, Pt], t: number) {
  const u = 1 - t;
  const x = u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0];
  const y = u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  const len = Math.hypot(dx, dy) || 1;
  return { x, y, tx: dx / len, ty: dy / len };
}

/** Ramita de eucalipto: tallo curvo con hojas redondas alternas (como la de la home). */
function sprig(ctx: CanvasRenderingContext2D, o: SprigOptions) {
  const lw = o.lineWidth ?? 3;
  const [p0, p1, p2, p3] = o.p;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = o.stroke;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  ctx.stroke();

  const side0 = o.firstSide ?? 1;
  const leaf = (x: number, y: number, r: number, angle: number) => {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.86, angle, 0, Math.PI * 2);
    ctx.fillStyle = o.fill;
    ctx.fill();
    ctx.lineWidth = lw * 0.6;
    ctx.stroke();
    // nervio
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = lw * 0.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, r * 0.1);
    ctx.quadraticCurveTo(0, -r * 0.12, r * 0.55, -r * 0.1);
    ctx.stroke();
    ctx.restore();
  };

  for (let i = 0; i < o.leaves; i++) {
    const t = 0.1 + (0.8 * i) / Math.max(1, o.leaves - 1);
    const side = (i % 2 === 0 ? side0 : -side0) as 1 | -1;
    const r = o.radius * (1 - 0.4 * t);
    const { x, y, tx, ty } = bezierAt(o.p, t);
    const nx = -ty * side;
    const ny = tx * side;
    const petiole = r * 0.5;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + nx * petiole, y + ny * petiole);
    ctx.stroke();
    leaf(x + nx * (petiole + r), y + ny * (petiole + r), r, Math.atan2(ny, nx) + Math.PI / 2);
  }
  const tip = bezierAt(o.p, 1);
  const tr = o.radius * 0.5;
  leaf(tip.x + tip.tx * tr * 1.1, tip.y + tip.ty * tr * 1.1, tr, Math.atan2(tip.ty, tip.tx));
  ctx.restore();
}

const PETAL = new Path2D("M0 -5 C -10 -11, -9 -25, 0 -27 C 9 -25, 10 -11, 0 -5Z");

/** Florecilla de cinco pétalos (`size` ≈ radio total). */
function floret(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  stroke: string,
  fill: string,
  center: string,
  rotation = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const s = size / 27;
  ctx.scale(s, s);
  ctx.lineWidth = 1.8;
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * 72 * Math.PI) / 180);
    ctx.fill(PETAL);
    ctx.stroke(PETAL);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
  ctx.fillStyle = center;
  ctx.fill();
  ctx.restore();
}

const HEART = new Path2D("M0 5 C -8 -1, -5 -8, 0 -3 C 5 -8, 8 -1, 0 5Z");

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 8, size / 8);
  ctx.fillStyle = fill;
  ctx.fill(HEART);
  ctx.restore();
}

/** Aleatorio determinista (las estrellas de «Noche» no cambian entre dibujos). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Plantillas                                                           */
/* ------------------------------------------------------------------ */

interface Theme {
  paintBackground: (ctx: CanvasRenderingContext2D) => void;
  paintForeground?: (ctx: CanvasRenderingContext2D) => void;
  /** Zona vertical donde se centra el texto. */
  top: number;
  bottom: number;
  maxWidth: number;
  heading: string;
  names: string;
  amp: string;
  accent: string;
  date: string;
  muted: string;
  rule: string;
  nameFont: "script" | "display" | "hand" | "chunky";
  nameSize: number;
  /** Mínimo para dejar los dos nombres en una sola línea; por debajo, se apilan. */
  inlineMin: number;
  stackedOnly?: boolean;
  dateStyle: "sentence" | "big" | "numeric";
  upperNames?: boolean;
  /** Nombres en cursiva (tipografía display). */
  nameItalic?: boolean;
  /** Tipografías de los textos pequeños y de las fechas (por defecto, `body` y `display`). */
  bodyKey?: keyof CardFonts;
  displayKey?: keyof CardFonts;
  /** Tipografía de las cifras de la fecha (por defecto, la display). */
  dateKey?: keyof CardFonts;
  /** Sin cursivas (las tipografías de «Hilo» y «Retro» no las tienen). */
  noItalic?: boolean;
  /** Todo el texto en mayúsculas («Hilo»). */
  upperAll?: boolean;
  /** Multiplica el cuerpo de los textos pequeños (la letra a mano es más menuda). */
  capsScale?: number;
  headingSize?: number;
  headingSpacing?: number;
  /** En lugar del filete con corazón: un dibujo (clave de `art`) centrado, de este ancho. */
  divider?: { art: string; width: number };
  /** SVG que hay que descargar antes de dibujar, por clave (ver `loadTemplateArt`). */
  art: Record<string, string>;
}

/**
 * Tema de la tarjeta a partir del estilo compartido del plan: la plantilla
 * (botánico, minimal, elegante) elige la composición y la paleta, los colores.
 * El fondo elegido (rayas, lunares…) se pinta entre el color base y los adornos.
 */
function makeTheme(style: InvitationStyle, design: SaveTheDateDesign): Theme {
  const tk: InvitationTheme = buildTheme(style.palette?.colors ?? LEGACY_COLORS[style.template], style.template);
  const accentInk = tk.vars["--inv-accent-ink"];
  const muted = tk.vars["--inv-muted"];
  const leafDark = tk.vars["--inv-leaf-dark"];
  const base: Pick<Theme, "top" | "bottom"> = { top: 250, bottom: 1150 };
  const none: Record<string, string> = {};

  if (style.template === "minimal") {
    return {
      ...base,
      art: none,
      top: 190,
      bottom: 1210,
      paintBackground(ctx) {
        ctx.fillStyle = tk.bg;
        ctx.fillRect(0, 0, CARD_W, CARD_H);
        paintBackdrop(ctx, style.background, tk, CARD_W, CARD_H);
        ctx.strokeStyle = tk.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(64, 64, CARD_W - 128, CARD_H - 128);
        // Hueco en el marco para la florecilla
        ctx.fillStyle = tk.bg;
        ctx.fillRect(440, 54, 120, 20);
        ctx.fillRect(440, CARD_H - 74, 120, 20);
      },
      paintForeground(ctx) {
        floret(ctx, 500, 64, 24, accentInk, tk.bg, tk.leaf, 0);
        floret(ctx, 500, CARD_H - 64, 24, accentInk, tk.bg, tk.leaf, 0.6);
      },
      maxWidth: 740,
      heading: muted,
      names: tk.ink,
      amp: accentInk,
      accent: muted,
      date: tk.ink,
      muted,
      rule: accentInk,
      nameFont: "display",
      nameSize: 92,
      inlineMin: 52,
      upperNames: true,
      dateStyle: "big",
    };
  }

  if (style.template === "elegante") {
    return {
      ...base,
      art: none,
      top: 200,
      bottom: 1200,
      paintBackground(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, CARD_H);
        g.addColorStop(0, mix(tk.bg, tk.primary, 0.1));
        g.addColorStop(1, mix(tk.bg, "#000000", 0.2));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CARD_W, CARD_H);
        paintBackdrop(ctx, style.background, tk, CARD_W, CARD_H);
        // Estrellitas
        const rand = seeded(7);
        ctx.fillStyle = tk.primary;
        for (let i = 0; i < 46; i++) {
          const x = 90 + rand() * (CARD_W - 180);
          const y = 90 + rand() * (CARD_H - 180);
          ctx.globalAlpha = 0.18 + rand() * 0.4;
          ctx.beginPath();
          ctx.arc(x, y, 1.2 + rand() * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Doble marco
        ctx.strokeStyle = accentInk;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(44, 44, CARD_W - 88, CARD_H - 88);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = tk.primary;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(62, 62, CARD_W - 124, CARD_H - 124);
        ctx.globalAlpha = 1;
      },
      paintForeground(ctx) {
        for (const [x, y, r] of [
          [62, 62, 0],
          [CARD_W - 62, 62, 1],
          [62, CARD_H - 62, 2],
          [CARD_W - 62, CARD_H - 62, 3],
        ] as const) {
          ctx.fillStyle = tk.bg;
          ctx.beginPath();
          ctx.arc(x, y, 22, 0, Math.PI * 2);
          ctx.fill();
          floret(ctx, x, y, 20, tk.primary, tk.paper, tk.leaf, r * 0.5);
        }
        sprig(ctx, {
          p: [[480, 1318], [420, 1336], [340, 1316], [270, 1262]],
          leaves: 6,
          radius: 17,
          stroke: tk.leaf,
          fill: tk.paper,
          lineWidth: 2.6,
        });
        sprig(ctx, {
          p: [[520, 1318], [580, 1336], [660, 1316], [730, 1262]],
          leaves: 6,
          radius: 17,
          stroke: tk.leaf,
          fill: tk.paper,
          lineWidth: 2.6,
          firstSide: -1,
        });
      },
      maxWidth: 740,
      heading: accentInk,
      names: tk.ink,
      amp: tk.primary,
      accent: tk.leaf,
      date: tk.ink,
      muted,
      rule: tk.primary,
      nameFont: "script",
      nameSize: 180,
      inlineMin: 100,
      dateStyle: "numeric",
    };
  }

  if (isDoodleStyle(style.template)) return doodleTheme(style, design, tk, base);

  // botanico (el «Jardín» de siempre): marco fino y guirnalda floral en las esquinas.
  // Con un motivo de acuarela no lleva guirnalda (el motivo trae las suyas), igual que la invitación.
  const garland = isMotif(style.background)
    ? undefined
    : botanicalCornerSvg({ leaf: tk.leaf, leafDark, petal: tk.primary, petalLine: accentInk, center: tk.paper });
  return {
    ...base,
    art: garland ? { garland } : none,
    paintBackground(ctx) {
      ctx.fillStyle = tk.bg;
      ctx.fillRect(0, 0, CARD_W, CARD_H);
      paintBackdrop(ctx, style.background, tk, CARD_W, CARD_H);
      // Marco fino
      ctx.strokeStyle = accentInk;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(36, 36, CARD_W - 72, CARD_H - 72, 14);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    paintForeground(ctx) {
      // La misma guirnalda que la invitación (esquina arriba a la izquierda y abajo a la derecha, girada).
      drawArt(ctx, garland, 320, 210, 640);
      drawArt(ctx, garland, CARD_W - 320, CARD_H - 210, 640, Math.PI);
    },
    maxWidth: 760,
    heading: accentInk,
    names: tk.ink,
    amp: accentInk,
    accent: accentInk,
    date: tk.ink,
    muted,
    rule: tk.primary,
    nameFont: "script",
    nameSize: 190,
    inlineMin: 100,
    dateStyle: "sentence",
  };
}

/* ------------------------------------------------------------------ */
/* Texto                                                                */
/* ------------------------------------------------------------------ */

interface TextStyle {
  font: (size: number) => string;
  size: number;
  color: string;
  spacing?: number;
  upper?: boolean;
  lineHeight?: number;
}

type Ctx = CanvasRenderingContext2D;

function applyStyle(ctx: Ctx, style: TextStyle, size = style.size) {
  ctx.font = style.font(size);
  ctx.fillStyle = style.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${style.spacing ?? 0}px`;
}

function measure(ctx: Ctx, text: string, style: TextStyle, size = style.size): number {
  applyStyle(ctx, style, size);
  return ctx.measureText(text).width;
}

/** Reduce el cuerpo hasta que el texto cabe en `maxWidth`. */
function fitSize(ctx: Ctx, text: string, style: TextStyle, maxWidth: number, minSize: number): number {
  let size = style.size;
  while (size > minSize && measure(ctx, text, style, size) > maxWidth) size -= 2;
  return size;
}

function wrap(ctx: Ctx, text: string, style: TextStyle, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(ctx, next, style) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

interface Block {
  height: number;
  /** Dibuja el bloque con su borde superior en `top`. */
  draw: (ctx: Ctx, cx: number, top: number) => void;
}

function lineBlock(ctx: Ctx, text: string, style: TextStyle, maxWidth: number, minSize = 20): Block {
  const shown = style.upper ? text.toUpperCase() : text;
  const size = fitSize(ctx, shown, style, maxWidth, minSize);
  const lh = (style.lineHeight ?? 1) * size;
  return {
    height: lh,
    draw(c, cx, top) {
      applyStyle(c, style, size);
      const spacing = style.spacing ?? 0;
      c.fillText(shown, cx + spacing / 2, top + lh * 0.78);
    },
  };
}

function paragraphBlock(ctx: Ctx, text: string, style: TextStyle, maxWidth: number): Block {
  const shown = style.upper ? text.toUpperCase() : text;
  const lines = wrap(ctx, shown, style, maxWidth);
  const lh = (style.lineHeight ?? 1.3) * style.size;
  return {
    height: lines.length * lh,
    draw(c, cx, top) {
      applyStyle(c, style);
      const spacing = style.spacing ?? 0;
      lines.forEach((line, i) => c.fillText(line, cx + spacing / 2, top + lh * (i + 0.78)));
    },
  };
}

interface Segment {
  text: string;
  style: TextStyle;
}

/**
 * Varios textos en una sola línea, sobre la misma línea base y centrados («Ana», «&», «Luis»,
 * cada uno con su estilo). Si no caben en `maxWidth`, se reducen todos a la vez hasta `minScale`.
 * `fits` dice si caben sin reducir el cuerpo (para decidir entre una línea y dos).
 */
function inlineBlock(
  ctx: Ctx,
  segments: Segment[],
  gapEm: number,
  maxWidth: number,
  minScale: number
): Block & { fits: boolean } {
  const shown = segments.map((seg) => ({ ...seg, text: seg.style.upper ? seg.text.toUpperCase() : seg.text }));
  // El cuerpo y el interlineado los marca el texto más grande (el «&» es más pequeño).
  const main = shown.reduce((a, b) => (b.style.size > a.style.size ? b : a));
  const base = main.style.size;
  const widthAt = (k: number) =>
    shown.reduce((sum, seg) => sum + measure(ctx, seg.text, seg.style, seg.style.size * k), 0) +
    gapEm * base * k * (shown.length - 1);
  let k = 1;
  const fits = widthAt(1) <= maxWidth;
  while (k > minScale && widthAt(k) > maxWidth) k -= 0.02;
  const total = widthAt(k);
  const lh = (main.style.lineHeight ?? 1) * base * k;
  return {
    fits,
    height: lh,
    draw(c, cx, top) {
      let x = cx - total / 2;
      for (const seg of shown) {
        const size = seg.style.size * k;
        applyStyle(c, seg.style, size);
        c.textAlign = "left";
        c.fillText(seg.text, x, top + lh * 0.78);
        x += measure(ctx, seg.text, seg.style, size) + gapEm * base * k;
      }
    },
  };
}

function spacer(height: number): Block {
  return { height, draw() {} };
}

/** Filete corto con un corazoncito en el centro. */
function ruleBlock(color: string, withHeart: boolean): Block {
  return {
    height: 36,
    draw(c, cx, top) {
      const y = top + 18;
      c.save();
      c.strokeStyle = color;
      c.globalAlpha = 0.8;
      c.lineWidth = 2;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(cx - 110, y);
      c.lineTo(cx - 24, y);
      c.moveTo(cx + 24, y);
      c.lineTo(cx + 110, y);
      c.stroke();
      c.restore();
      if (withHeart) heart(c, cx, y - 1, 11, color);
      else {
        c.fillStyle = color;
        c.beginPath();
        c.arc(cx, y, 4, 0, Math.PI * 2);
        c.fill();
      }
    },
  };
}

/** Filete fino a todo lo ancho de `width`. */
function lineBlock2(color: string, width: number): Block {
  return {
    height: 30,
    draw(c, cx, top) {
      c.save();
      c.strokeStyle = color;
      c.globalAlpha = 0.7;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(cx - width / 2, top + 15);
      c.lineTo(cx + width / 2, top + 15);
      c.stroke();
      c.restore();
    },
  };
}

/** Mini calendario del mes con el día de la boda dentro de un corazón. */
function calendarBlock(cal: CalendarMonth, theme: Theme, fonts: CardFonts): Block {
  const colW = 92;
  const rowH = 56;
  const rows = cal.cells.length / 7;
  const head = 112;
  return {
    height: head + rows * rowH + 8,
    draw(c, cx, top) {
      const left = cx - colW * 3.5;
      c.save();
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      if ("letterSpacing" in c) c.letterSpacing = "0px";
      c.fillStyle = theme.date;
      c.font = `${theme.noItalic ? "" : "italic "}400 48px ${fonts.display}`;
      c.fillText(cal.title, cx, top + 46);
      c.fillStyle = theme.accent;
      c.font = `600 ${24 * (theme.capsScale ?? 1)}px ${fonts.body}`;
      cal.weekdays.forEach((w, i) => c.fillText(w.toUpperCase(), left + colW * (i + 0.5), top + 98));
      cal.cells.forEach((day, i) => {
        if (day === null) return;
        const x = left + colW * ((i % 7) + 0.5);
        const rowTop = top + head + Math.floor(i / 7) * rowH;
        const y = rowTop + rowH / 2 + 11;
        if (day === cal.day) {
          c.save();
          c.translate(x, rowTop + rowH / 2 - 1);
          c.scale(6.4, 6.4);
          c.globalAlpha = 0.32;
          c.fillStyle = theme.rule;
          c.fill(HEART);
          c.globalAlpha = 1;
          c.strokeStyle = theme.rule;
          c.lineWidth = 0.5;
          c.lineJoin = "round";
          c.stroke(HEART);
          c.restore();
          c.fillStyle = theme.date;
          c.font = `700 ${32 * (theme.capsScale ?? 1)}px ${fonts.body}`;
        } else {
          c.fillStyle = theme.muted;
          c.font = `400 ${30 * (theme.capsScale ?? 1)}px ${fonts.body}`;
        }
        c.fillText(String(day), x, y);
      });
      c.restore();
    },
  };
}

/** Arco con la fecha dentro (el «medallón» de la invitación). */
function archBlock(
  parts: NonNullable<ReturnType<typeof dateParts>>,
  theme: Theme,
  fonts: CardFonts
): Block {
  const w = 300;
  const h = 370;
  return {
    height: h,
    draw(c, cx, top) {
      const r = w / 2;
      const outline = (inset: number, alpha: number, lw: number) => {
        c.save();
        c.globalAlpha = alpha;
        c.strokeStyle = theme.rule;
        c.lineWidth = lw;
        c.beginPath();
        c.moveTo(cx - r + inset, top + h);
        c.lineTo(cx - r + inset, top + r);
        c.arc(cx, top + r, r - inset, Math.PI, 0);
        c.lineTo(cx + r - inset, top + h);
        c.stroke();
        c.restore();
      };
      outline(0, 1, 3);
      outline(16, 0.5, 2);
      c.save();
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      c.fillStyle = theme.accent;
      c.font = `500 ${26 * Math.min(theme.capsScale ?? 1, 1.2)}px ${fonts.body}`;
      if ("letterSpacing" in c) c.letterSpacing = theme.capsScale ? "4px" : "7px";
      c.fillText(parts.weekday.toUpperCase(), cx + 3, top + 168);
      c.fillText(parts.month.toUpperCase(), cx + 3, top + 312);
      c.fillStyle = theme.date;
      if ("letterSpacing" in c) c.letterSpacing = "0px";
      c.font = `400 124px ${fonts.display}`;
      c.fillText(parts.day, cx, top + 274);
      c.fillStyle = theme.muted;
      c.font = `500 ${28 * Math.min(theme.capsScale ?? 1, 1.2)}px ${fonts.body}`;
      if ("letterSpacing" in c) c.letterSpacing = theme.capsScale ? "3px" : "6px";
      c.fillText(parts.year, cx + 3, top + 350);
      c.restore();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Plantillas de dibujitos (doodle, hilo, retro, azulejo)               */
/* ------------------------------------------------------------------ */

const DOODLE_STYLES: readonly InvitationStyle["template"][] = ["doodle", "hilo", "retro", "azulejo"];

function isDoodleStyle(template: InvitationStyle["template"]): boolean {
  return DOODLE_STYLES.includes(template);
}

/** Dentro de una imagen SVG no hay tipografías de la página: los corazones con iniciales usan esta. */
const HEARTS_FONT = "Georgia, 'Times New Roman', serif";

const artLoads = new Map<string, Promise<HTMLImageElement | null>>();
const artReady = new Map<string, HTMLImageElement>();

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function loadArt(svg: string): Promise<HTMLImageElement | null> {
  let cached = artLoads.get(svg);
  if (!cached) {
    cached = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        artReady.set(svg, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = svgUrl(svg);
    });
    // Los colores cambian mucho al elegir paleta: la caché no crece sin límite.
    if (artLoads.size > 60) {
      const oldest = artLoads.keys().next().value as string;
      artLoads.delete(oldest);
      artReady.delete(oldest);
    }
    artLoads.set(svg, cached);
  }
  return cached;
}

/** Ancho y alto con los que el generador de dibujos escribe el SVG (proporción del dibujo). */
function svgSize(svg: string): { w: number; h: number } {
  const w = /<svg[^>]*?\swidth="([\d.]+)"/.exec(svg)?.[1];
  const h = /<svg[^>]*?\sheight="([\d.]+)"/.exec(svg)?.[1];
  return { w: Number(w) || 100, h: Number(h) || 100 };
}

/**
 * Descarga los dibujos (y las tipografías de la plantilla) del estilo elegido; hay
 * que esperarla antes de `drawSaveTheDate`. Con las demás plantillas no hace nada.
 */
export async function loadTemplateArt(style: InvitationStyle, design: SaveTheDateDesign, fonts: CardFonts): Promise<void> {
  if (!isDoodleStyle(style.template) && style.template !== "botanico") return;
  const sample = `${design.heading}${design.name1}${design.name2}${design.place}${design.message}ÁÉÍÓÚÑáéíóúñ&0123456789`;
  const art = Object.values(makeTheme(style, design).art);
  const family = style.template === "hilo" ? fonts.hand : style.template === "retro" ? fonts.chunky : null;
  try {
    await Promise.all([
      ...art.map(loadArt),
      ...(family && typeof document !== "undefined" && document.fonts ? [document.fonts.load(`400 64px ${family}`, sample)] : []),
    ]);
  } catch {
    /* se dibuja con la tipografía de respaldo */
  }
}

/** Dibuja un dibujo ya cargado centrado en (`cx`, `cy`), de ancho `width`; sin imagen no hace nada. */
function drawArt(ctx: Ctx, svg: string | undefined, cx: number, cy: number, width: number, rotation = 0, flipX = false) {
  const img = svg ? artReady.get(svg) : undefined;
  if (!svg || !img) return;
  const { w, h } = svgSize(svg);
  const height = (width * h) / w;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  if (flipX) ctx.scale(-1, 1);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
}

/** Bloque de texto-aire con un dibujo centrado (el adorno central de las plantillas de dibujitos). */
function artBlock(svg: string | undefined, width: number): Block {
  const { w, h } = svg ? svgSize(svg) : { w: 1, h: 1 };
  const height = (width * h) / w;
  return {
    height: height + 8,
    draw(c, cx, top) {
      drawArt(c, svg, cx, top + 4 + height / 2, width);
    },
  };
}

/** Cinta ondulada de «Retro» (en las mismas coordenadas 100 × 140 que la de la invitación). */
const WAVE = new Path2D(
  "M100 30 C 76 36, 78 62, 52 74 C 30 84, 16 100, 0 104 L 0 134 C 22 132, 38 116, 62 104 C 90 90, 86 70, 100 66 Z"
);

function roundedBox(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Franjas del marco de «Azulejo» (siempre impar: simétrico, igual que el CSS de la invitación). */
const AZULEJO_BANDS = 79;

function doodleTheme(
  style: InvitationStyle,
  design: SaveTheDateDesign,
  tk: InvitationTheme,
  base: Pick<Theme, "top" | "bottom">
): Theme {
  const ink = tk.ink;
  const muted = tk.vars["--inv-muted"];
  const accentInk = tk.vars["--inv-accent-ink"];
  const paper = tk.paper;
  const initials = coupleInitials(`${design.name1.trim()} & ${design.name2.trim()}`);
  const stroke = (name: DoodleName, color: string, fill: string) => doodleSvg(name, color, fill);
  const common = {
    ...base,
    heading: accentInk,
    names: ink,
    amp: accentInk,
    accent: accentInk,
    date: ink,
    muted,
    rule: tk.primary,
  };

  if (style.template === "doodle") {
    // Patrón de dibujitos en el color principal y un recuadro liso encima con el texto.
    const patternInk = mix(tk.primary, ink, 0.38);
    const patternFill = mix(tk.primary, tk.bg, 0.3);
    const art: Record<string, string> = {
      // Mismas coordenadas (400 × 560) que el de la invitación, así se ve igual de denso.
      pattern: doodlePatternSvg({ width: 400, height: 560, color: patternInk, fill: patternFill, seed: 7, density: "mid", initials: initials ?? undefined, fontFamily: HEARTS_FONT }),
    };
    if (initials) art.hearts = initialsHeartsSvg(initials.a, initials.b, accentInk, mix(tk.primary, paper, 0.55), HEARTS_FONT);
    else art.hearts = stroke("heart", accentInk, mix(tk.primary, paper, 0.55));
    return {
      ...common,
      art,
      top: 250,
      bottom: 1150,
      maxWidth: 580,
      paintBackground(ctx) {
        // El marco (color de fondo + patrón de dibujitos) no lleva el fondo elegido: va dentro del recuadro.
        ctx.fillStyle = tk.bg;
        ctx.fillRect(0, 0, CARD_W, CARD_H);
        drawArt(ctx, art.pattern, CARD_W / 2, CARD_H / 2, CARD_W);
        // Recuadro liso con un halo suave.
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = paper;
        roundedBox(ctx, 88, 160, CARD_W - 176, CARD_H - 320, 48);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = paper;
        ctx.strokeStyle = tk.line;
        ctx.lineWidth = 2;
        roundedBox(ctx, 104, 176, CARD_W - 208, CARD_H - 352, 36);
        ctx.fill();
        // El fondo elegido, recortado al recuadro.
        ctx.save();
        ctx.clip();
        paintBackdrop(ctx, style.background, tk, CARD_W, CARD_H);
        ctx.restore();
        roundedBox(ctx, 104, 176, CARD_W - 208, CARD_H - 352, 36);
        ctx.stroke();
      },
      nameFont: "display",
      nameItalic: true,
      nameSize: 150,
      inlineMin: 84,
      dateStyle: "numeric",
      divider: { art: "hearts", width: initials ? 250 : 90 },
    };
  }

  if (style.template === "hilo") {
    // Todo en un solo color (el oscuro), letra a mano en mayúsculas y el hilo en el centro.
    const art = { hands: stroke("threadHands", ink, ink) };
    return {
      ...base,
      art,
      top: 150,
      bottom: 1250,
      maxWidth: 800,
      paintBackground(ctx) {
        ctx.fillStyle = tk.bg;
        ctx.fillRect(0, 0, CARD_W, CARD_H);
        paintBackdrop(ctx, style.background, tk, CARD_W, CARD_H);
      },
      heading: ink,
      names: ink,
      amp: ink,
      accent: ink,
      date: ink,
      muted: ink,
      rule: ink,
      nameFont: "hand",
      nameSize: 170,
      inlineMin: 90,
      upperNames: true,
      dateStyle: "numeric",
      bodyKey: "hand",
      displayKey: "hand",
      noItalic: true,
      upperAll: true,
      capsScale: 1.55,
      headingSize: 42,
      headingSpacing: 6,
      divider: { art: "hands", width: 740 },
    };
  }

  if (style.template === "retro") {
    // Título redondeado y grueso, dibujitos en las esquinas y una onda de color detrás del texto.
    const soft = mix(tk.primary, paper, 0.55);
    const art = {
      swirl: stroke("cornerSwirl", ink, soft),
      disco: stroke("discoBall", ink, soft),
      coupes: stroke("coupes", ink, soft),
    };
    const waveColor = mix(tk.line, paper, 0.3);
    return {
      ...common,
      art,
      top: 260,
      bottom: 1140,
      maxWidth: 680,
      paintBackground(ctx) {
        ctx.fillStyle = paper;
        ctx.fillRect(0, 0, CARD_W, CARD_H);
        paintBackdrop(ctx, style.background, tk, CARD_W, CARD_H);
        ctx.save();
        ctx.scale(CARD_W / 100, CARD_H / 140);
        ctx.fillStyle = waveColor;
        ctx.fill(WAVE);
        ctx.restore();
      },
      paintForeground(ctx) {
        drawArt(ctx, art.swirl, 30 + 85, 30 + 90, 170);
        drawArt(ctx, art.swirl, CARD_W - 30 - 85, CARD_H - 30 - 90, 170, Math.PI);
        drawArt(ctx, art.disco, CARD_W - 40 - 55, 40 + 55, 110, 0.17);
        drawArt(ctx, art.coupes, 40 + 55, CARD_H - 40 - 55, 110, -0.14);
      },
      heading: ink,
      accent: ink,
      amp: accentInk,
      nameFont: "chunky",
      nameSize: 160,
      inlineMin: 92,
      dateStyle: "sentence",
      dateKey: "chunky",
    };
  }

  // azulejo: marco de rayas verticales y la pareja de corazones (sin lazos, ramitas ni chispas).
  const soft = mix(tk.primary, paper, 0.55);
  const art = {
    couple: stroke("heartCouple", ink, soft),
  };
  const stripe = mix(tk.primary, paper, 0.28);
  return {
    ...common,
    art,
    top: 205,
    bottom: 1195,
    maxWidth: 620,
    paintBackground(ctx) {
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, CARD_W, CARD_H);
      // 79 franjas iguales (impar): la primera y la última son del mismo color, así el marco es simétrico (como en la invitación).
      ctx.fillStyle = stripe;
      const band = CARD_W / AZULEJO_BANDS;
      for (let i = 0; i < AZULEJO_BANDS; i += 2) ctx.fillRect(i * band, 0, band, CARD_H);
      // Panel con doble línea: deja ver 5 franjas por cada lado. El fondo elegido va dentro del panel, no en las rayas.
      const inset = band * 5;
      ctx.fillStyle = paper;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.5;
      roundedBox(ctx, inset, inset, CARD_W - 2 * inset, CARD_H - 2 * inset, 22);
      ctx.fill();
      ctx.stroke();
      // Recortado a la línea interior, como en la invitación (el anillo liso entre las dos líneas queda limpio).
      ctx.save();
      roundedBox(ctx, inset + 15.5, inset + 15.5, CARD_W - 2 * inset - 31, CARD_H - 2 * inset - 31, 14);
      ctx.clip();
      paintBackdrop(ctx, style.background, tk, CARD_W, CARD_H);
      ctx.restore();
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2.5;
      roundedBox(ctx, inset + 15.5, inset + 15.5, CARD_W - 2 * inset - 31, CARD_H - 2 * inset - 31, 14);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    heading: ink,
    nameFont: "display",
    nameItalic: true,
    nameSize: 150,
    inlineMin: 84,
    dateStyle: "sentence",
    divider: { art: "couple", width: 340 },
  };
}

/* ------------------------------------------------------------------ */
/* Composición                                                          */
/* ------------------------------------------------------------------ */

function buildBlocks(
  ctx: Ctx,
  design: SaveTheDateDesign,
  theme: Theme,
  rawFonts: CardFonts,
  lang: Lang,
  layout: InvitationLayout
): Block[] {
  // Las plantillas de dibujitos cambian la tipografía de los textos pequeños y de las fechas.
  const fonts: CardFonts = {
    ...rawFonts,
    body: rawFonts[theme.bodyKey ?? "body"],
    display: rawFonts[theme.displayKey ?? "display"],
  };
  const it = theme.noItalic ? "" : "italic ";
  const sc = theme.capsScale ?? 1;
  const W = theme.maxWidth;
  const blocks: Block[] = [];
  const gap = (h: number) => blocks.push(spacer(h));

  const caps = (size: number, color: string, spacing: number): TextStyle => ({
    font: (s) => `500 ${s}px ${fonts.body}`,
    size: size * sc,
    color,
    spacing,
    upper: true,
  });

  // Encabezado
  const heading = design.heading.trim();
  if (heading) {
    blocks.push(lineBlock(ctx, heading, caps(theme.headingSize ?? 28, theme.heading, theme.headingSpacing ?? 9), W, 18));
    gap(34);
  }

  // Nombres
  const n1 = design.name1.trim();
  const n2 = design.name2.trim();
  const nameStyle: TextStyle =
    theme.nameFont === "script"
      ? { font: (s) => `400 ${s}px ${fonts.script}`, size: theme.nameSize, color: theme.names, lineHeight: 0.92 }
      : {
          font: (s) =>
            `${theme.nameItalic ? "italic " : ""}400 ${s}px ${theme.nameFont === "display" ? fonts.display : fonts[theme.nameFont]}`,
          size: theme.nameSize,
          color: theme.names,
          spacing: theme.nameFont === "chunky" ? 2 : theme.nameFont === "hand" ? 6 : 8,
          upper: theme.upperNames,
          lineHeight: theme.nameFont === "chunky" ? 1.0 : 1.05,
        };
  const ampStyle: TextStyle = {
    font: (s) =>
      theme.nameFont === "hand" || theme.nameFont === "chunky"
        ? `400 ${s}px ${fonts[theme.nameFont]}`
        : `${it}400 ${s}px ${fonts.display}`,
    size: theme.nameFont === "script" ? 64 : theme.nameFont === "hand" ? 90 : theme.nameFont === "chunky" ? 70 : 48,
    color: theme.amp,
  };

  const parts = dateParts(design.date, lang);
  const medallion = layout === "medallion" && Boolean(parts) && Boolean(n1) && Boolean(n2);

  // Editorial y medallón: «Ana & Luis» en una línea si cabe a este tamaño de letra; si no, «Ana»
  // arriba y «& Luis» debajo (el «&» más pequeño y con su color, como en la invitación).
  const pairedNames = (): void => {
    const oneLine = inlineBlock(
      ctx,
      [
        { text: n1, style: nameStyle },
        { text: "&", style: ampStyle },
        { text: n2, style: nameStyle },
      ],
      0.28,
      W,
      30 / nameStyle.size
    );
    if (oneLine.fits) {
      blocks.push(oneLine);
      return;
    }
    blocks.push(lineBlock(ctx, n1, nameStyle, W, 40));
    gap(6);
    blocks.push(
      inlineBlock(
        ctx,
        [
          { text: "&", style: ampStyle },
          { text: n2, style: nameStyle },
        ],
        0.28,
        W,
        40 / nameStyle.size
      )
    );
  };

  if (medallion && parts) {
    // Nombres justo encima del arco con la fecha
    pairedNames();
    gap(22);
    blocks.push(archBlock(parts, theme, fonts));
  } else if (n1 || n2) {
    const both = n1 && n2;
    const joined = both ? `${n1} & ${n2}` : n1 || n2;
    const shown = nameStyle.upper ? joined.toUpperCase() : joined;
    const inlineSize = fitSize(ctx, shown, nameStyle, W, 10);
    if (both && layout === "editorial") {
      pairedNames();
    } else if (!both || (!theme.stackedOnly && inlineSize >= theme.inlineMin)) {
      blocks.push(lineBlock(ctx, joined, nameStyle, W, 30));
    } else {
      blocks.push(lineBlock(ctx, n1, nameStyle, W, 40));
      gap(6);
      blocks.push(lineBlock(ctx, "&", ampStyle, W, 30));
      gap(6);
      blocks.push(lineBlock(ctx, n2, nameStyle, W, 40));
    }
    gap(34);
  }

  if (!medallion && layout !== "editorial") {
    const tight = layout === "calendar" || layout === "vertical";
    blocks.push(
      theme.divider
        ? artBlock(theme.art[theme.divider.art], theme.divider.width * (tight ? 0.62 : 1))
        : ruleBlock(theme.rule, true)
    );
    gap(38);
  } else if (medallion) {
    gap(24);
  }

  // Fecha
  const dateFont = rawFonts[theme.dateKey ?? theme.displayKey ?? "display"];
  const display = (size: number, color: string, extra: Partial<TextStyle> = {}): TextStyle => ({
    font: (s) => `400 ${s}px ${dateFont}`,
    size,
    color,
    ...extra,
  });
  let placeShown = false;
  if (parts && !medallion) {
    if (layout === "bigDate") {
      blocks.push(lineBlock2(theme.rule, 520));
      gap(8);
      blocks.push(lineBlock(ctx, parts.weekday, caps(28, theme.accent, 12), W, 18));
      gap(14);
      blocks.push(
        lineBlock(ctx, `${parts.day} · ${parts.monthNumber} · ${parts.year}`, display(150, theme.date, { spacing: 2 }), W, 40)
      );
      gap(8);
      blocks.push(lineBlock2(theme.rule, 520));
    } else if (layout === "vertical") {
      blocks.push(lineBlock2(theme.rule, 360));
      gap(10);
      blocks.push(lineBlock(ctx, parts.weekday, caps(28, theme.accent, 12), W, 18));
      gap(12);
      blocks.push(lineBlock(ctx, parts.day, display(280, theme.date, { lineHeight: 0.9 }), W, 80));
      gap(10);
      blocks.push(lineBlock(ctx, parts.month, caps(36, theme.date, 14), W, 18));
      gap(10);
      blocks.push(lineBlock(ctx, parts.year, caps(30, theme.muted, 16), W, 18));
      gap(10);
      blocks.push(lineBlock2(theme.rule, 360));
    } else if (layout === "medallion") {
      blocks.push(archBlock(parts, theme, fonts));
    } else if (layout === "calendar") {
      const cal = calendarOf(design.date, lang);
      if (cal) blocks.push(calendarBlock(cal, theme, fonts));
    } else if (layout === "editorial") {
      const t = getServerT(lang, "invitation");
      const weekday = lang === "en" ? parts.weekday : parts.weekday.toLocaleLowerCase(lang);
      const date = t("view.layout.sentence.date", { weekday, day: parts.day, month: parts.month, year: parts.year });
      const where = design.place.trim() ? t("view.layout.sentence.place", { place: design.place.trim() }) : "";
      blocks.push(
        paragraphBlock(
          ctx,
          [date, where].filter(Boolean).join(t("view.layout.sentence.joiner")) + ".",
          { font: (s) => `${it}400 ${s}px ${fonts.display}`, size: 56 * sc, color: theme.date, lineHeight: 1.4, upper: theme.upperAll },
          W
        )
      );
      placeShown = true;
    } else if (theme.dateStyle === "sentence") {
      blocks.push(lineBlock(ctx, parts.weekday, caps(28, theme.accent, 10), W, 18));
      gap(18);
      blocks.push(lineBlock(ctx, parts.dayMonth, display(92, theme.date), W, 36));
      gap(16);
      blocks.push(lineBlock(ctx, parts.year, caps(32, theme.accent, 18), W, 18));
    } else if (theme.dateStyle === "big") {
      blocks.push(lineBlock(ctx, parts.weekday, caps(28, theme.accent, 12), W, 18));
      gap(26);
      blocks.push(lineBlock(ctx, parts.day, display(300, theme.date, { lineHeight: 0.9 }), W, 80));
      gap(14);
      blocks.push(lineBlock(ctx, `${parts.month}  ·  ${parts.year}`, caps(32, theme.date, 12), W, 18));
    } else {
      blocks.push(lineBlock(ctx, parts.weekday, caps(28, theme.accent, 10), W, 18));
      gap(20);
      blocks.push(
        lineBlock(ctx, `${parts.day}  ·  ${parts.monthNumber}  ·  ${parts.year}`, display(96, theme.date, { spacing: 3 }), W, 36)
      );
      gap(10);
      blocks.push(
        lineBlock(
          ctx,
          parts.month,
          { font: (s) => `${it}400 ${s}px ${fonts.display}`, size: 56 * sc, color: theme.heading, upper: theme.upperAll },
          W,
          24
        )
      );
    }
  }

  // Lugar
  const place = placeShown ? "" : design.place.trim();
  if (place) {
    gap(parts ? 44 : 0);
    blocks.push(paragraphBlock(ctx, place, { ...caps(26, theme.date, 6), lineHeight: 1.45 }, W));
  }

  // Mensaje
  const message = design.message.trim();
  if (message) {
    gap(place || parts ? 44 : 0);
    blocks.push(
      paragraphBlock(
        ctx,
        message,
        {
          font: (s) => `${it}400 ${s}px ${fonts.display}`,
          size: 36 * sc,
          color: theme.muted,
          lineHeight: 1.4,
          upper: theme.upperAll,
        },
        Math.min(W, 640)
      )
    );
  }
  return blocks;
}

/**
 * Pinta la tarjeta en `canvas` (cuyo alto debe ser 1,4 × su ancho) con el
 * estilo compartido del plan. Las tipografías y las imágenes del fondo ya deben
 * estar cargadas (ver `loadCardFonts` y `loadBackdrop`).
 */
export function drawSaveTheDate(
  canvas: HTMLCanvasElement,
  design: SaveTheDateDesign,
  style: InvitationStyle,
  fonts: CardFonts,
  lang: Lang = DEFAULT_LANG
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const theme = makeTheme(style, design);
  const layout = layoutInStationery(style.layout ?? "classic");
  const k = canvas.width / CARD_W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  theme.paintBackground(ctx);

  const blocks = buildBlocks(ctx, design, theme, fonts, lang, layout);
  const total = blocks.reduce((sum, b) => sum + b.height, 0);
  const available = theme.bottom - theme.top;
  const scale = total > available ? available / total : 1;
  const centerY = (theme.top + theme.bottom) / 2;
  const cx = CARD_W / 2;

  ctx.save();
  ctx.translate(cx, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -centerY);
  let y = centerY - total / 2;
  for (const block of blocks) {
    block.draw(ctx, cx, y);
    y += block.height;
  }
  ctx.restore();

  theme.paintForeground?.(ctx);
}
