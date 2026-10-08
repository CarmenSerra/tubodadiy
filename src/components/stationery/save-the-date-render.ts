import { dateParts } from "@/components/stationery/save-the-date-model";
import type { SaveTheDateDesign, SaveTheDateTemplate } from "@/lib/firebase/designs";

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
/* Paleta (la de la marca, fija: la tarjeta no cambia con el tema)     */
/* ------------------------------------------------------------------ */

const C = {
  cream: "#F8F5F1",
  paper: "#FCFAF7",
  lilacSoft: "#ECE6F4",
  lilacMid: "#DECDF1",
  lilac: "#D4C0EA",
  lilacDeep: "#927AAC",
  plum: "#38384D",
  plumDeep: "#2D2D3F",
  plumSoft: "#474755",
  deep: "#3F5C4A",
  green: "#4E6A5A",
  sage: "#8FAF8A",
  sagePale: "#D2D7CB",
  sageLight: "#BCC7B5",
  ink: "#26413C",
  inkMuted: "#586C64",
  night: "#F4F1EB",
};

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

/** Guijarro lila (el de la bienvenida), 200 × 170. */
const PEBBLE = new Path2D(
  "M20 76 C 8 28, 60 2, 108 12 C 156 24, 184 72, 156 114 C 128 156, 62 166, 32 128 C 22 116, 22 96, 20 76Z"
);

function archPath(ctx: CanvasRenderingContext2D, left: number, right: number, top: number, bottom: number) {
  const r = (right - left) / 2;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, top + r);
  ctx.arc((left + right) / 2, top + r, r, Math.PI, 0);
  ctx.lineTo(right, bottom);
  ctx.closePath();
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
  nameFont: "script" | "display";
  nameSize: number;
  /** Mínimo para dejar los dos nombres en una sola línea; por debajo, se apilan. */
  inlineMin: number;
  stackedOnly?: boolean;
  dateStyle: "sentence" | "big" | "numeric";
  upperNames?: boolean;
}

const jardin: Theme = {
  paintBackground(ctx) {
    ctx.fillStyle = C.cream;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    // Manchas de color
    ctx.save();
    ctx.translate(-120, -90);
    ctx.scale(3.6, 3.6);
    ctx.fillStyle = C.lilacMid;
    ctx.fill(PEBBLE);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(1040, 1450, 330, 0, Math.PI * 2);
    ctx.fillStyle = C.sagePale;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-40, 1330, 150, 0, Math.PI * 2);
    ctx.fillStyle = C.lilacSoft;
    ctx.fill();
    // Marco fino
    ctx.strokeStyle = C.lilacDeep;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(36, 36, CARD_W - 72, CARD_H - 72, 14);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
  paintForeground(ctx) {
    sprig(ctx, {
      p: [[1010, 30], [950, 60], [880, 130], [790, 250]],
      leaves: 8,
      radius: 36,
      stroke: C.green,
      fill: C.sageLight,
      lineWidth: 3.4,
    });
    sprig(ctx, {
      p: [[-10, 1420], [50, 1370], [120, 1290], [240, 1170]],
      leaves: 8,
      radius: 36,
      stroke: C.green,
      fill: C.sageLight,
      lineWidth: 3.4,
      firstSide: -1,
    });
    floret(ctx, 150, 170, 38, C.lilacDeep, C.lilacSoft, C.sage, 0.3);
    floret(ctx, 215, 118, 22, C.lilacDeep, C.lilacSoft, C.sage, 1);
    floret(ctx, 860, 1245, 34, C.lilacDeep, C.cream, C.sage, 0.6);
    floret(ctx, 800, 1300, 20, C.lilacDeep, C.cream, C.sage, 1.4);
  },
  top: 250,
  bottom: 1150,
  maxWidth: 760,
  heading: C.green,
  names: C.deep,
  amp: C.lilacDeep,
  accent: C.green,
  date: C.ink,
  muted: C.inkMuted,
  rule: C.lilacDeep,
  nameFont: "script",
  nameSize: 190,
  inlineMin: 100,
  dateStyle: "sentence",
};

const arco: Theme = {
  paintBackground(ctx) {
    ctx.fillStyle = C.lilacMid;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    // Arco crema con filete lila oscuro desplazado
    ctx.strokeStyle = C.lilacDeep;
    ctx.lineWidth = 2.5;
    archPath(ctx, 112, 888, 110, 1290);
    ctx.stroke();
    archPath(ctx, 132, 868, 130, 1290);
    ctx.fillStyle = C.paper;
    ctx.fill();
    // Suelo salvia
    ctx.fillStyle = C.sagePale;
    ctx.beginPath();
    ctx.roundRect(112, 1290, 776, 26, 13);
    ctx.fill();
  },
  paintForeground(ctx) {
    sprig(ctx, {
      p: [[150, 1290], [90, 1180], [100, 1020], [190, 880]],
      leaves: 8,
      radius: 32,
      stroke: C.green,
      fill: C.sageLight,
      lineWidth: 3.2,
    });
    sprig(ctx, {
      p: [[850, 1290], [910, 1180], [900, 1020], [810, 880]],
      leaves: 8,
      radius: 32,
      stroke: C.green,
      fill: C.sageLight,
      lineWidth: 3.2,
      firstSide: -1,
    });
    floret(ctx, 130, 1250, 28, C.lilacDeep, C.paper, C.sage, 0.4);
    floret(ctx, 880, 1240, 28, C.lilacDeep, C.paper, C.sage, 1.2);
    floret(ctx, 500, 168, 22, C.lilacDeep, C.lilacSoft, C.sage, 0);
  },
  top: 300,
  bottom: 1190,
  maxWidth: 560,
  heading: C.green,
  names: C.deep,
  amp: C.lilacDeep,
  accent: C.green,
  date: C.ink,
  muted: C.inkMuted,
  rule: C.lilacDeep,
  nameFont: "script",
  nameSize: 150,
  inlineMin: 100,
  stackedOnly: true,
  dateStyle: "sentence",
};

const minimal: Theme = {
  paintBackground(ctx) {
    ctx.fillStyle = "#FBFAF7";
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(64, 64, CARD_W - 128, CARD_H - 128);
    // Hueco en el marco para la florecilla
    ctx.fillStyle = "#FBFAF7";
    ctx.fillRect(440, 54, 120, 20);
    ctx.fillRect(440, CARD_H - 74, 120, 20);
  },
  paintForeground(ctx) {
    floret(ctx, 500, 64, 24, C.lilacDeep, "#FBFAF7", C.sage, 0);
    floret(ctx, 500, CARD_H - 64, 24, C.lilacDeep, "#FBFAF7", C.sage, 0.6);
  },
  top: 190,
  bottom: 1210,
  maxWidth: 740,
  heading: C.inkMuted,
  names: C.ink,
  amp: C.lilacDeep,
  accent: C.inkMuted,
  date: C.ink,
  muted: C.inkMuted,
  rule: C.lilacDeep,
  nameFont: "display",
  nameSize: 92,
  inlineMin: 52,
  upperNames: true,
  dateStyle: "big",
};

const noche: Theme = {
  paintBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, CARD_H);
    g.addColorStop(0, C.plum);
    g.addColorStop(1, C.plumDeep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    // Estrellitas
    const rand = seeded(7);
    ctx.fillStyle = C.lilac;
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
    ctx.strokeStyle = C.lilacDeep;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(44, 44, CARD_W - 88, CARD_H - 88);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = C.lilac;
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
      ctx.fillStyle = C.plum;
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
      floret(ctx, x, y, 20, C.lilac, C.plumSoft, C.sage, r * 0.5);
    }
    sprig(ctx, {
      p: [[480, 1318], [420, 1336], [340, 1316], [270, 1262]],
      leaves: 6,
      radius: 17,
      stroke: C.sage,
      fill: C.plumSoft,
      lineWidth: 2.6,
    });
    sprig(ctx, {
      p: [[520, 1318], [580, 1336], [660, 1316], [730, 1262]],
      leaves: 6,
      radius: 17,
      stroke: C.sage,
      fill: C.plumSoft,
      lineWidth: 2.6,
      firstSide: -1,
    });
  },
  top: 200,
  bottom: 1200,
  maxWidth: 740,
  heading: C.lilac,
  names: C.night,
  amp: C.lilac,
  accent: C.sageLight,
  date: C.night,
  muted: "#D2D7CB",
  rule: C.lilac,
  nameFont: "script",
  nameSize: 180,
  inlineMin: 100,
  dateStyle: "numeric",
};

const THEMES: Record<SaveTheDateTemplate, Theme> = { jardin, arco, minimal, noche };

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

/* ------------------------------------------------------------------ */
/* Composición                                                          */
/* ------------------------------------------------------------------ */

function buildBlocks(ctx: Ctx, design: SaveTheDateDesign, theme: Theme, fonts: CardFonts): Block[] {
  const W = theme.maxWidth;
  const blocks: Block[] = [];
  const gap = (h: number) => blocks.push(spacer(h));

  const caps = (size: number, color: string, spacing: number): TextStyle => ({
    font: (s) => `500 ${s}px ${fonts.body}`,
    size,
    color,
    spacing,
    upper: true,
  });

  // Encabezado
  const heading = design.heading.trim();
  if (heading) {
    blocks.push(lineBlock(ctx, heading, caps(28, theme.heading, 9), W, 18));
    gap(34);
  }

  // Nombres
  const n1 = design.name1.trim();
  const n2 = design.name2.trim();
  const nameStyle: TextStyle =
    theme.nameFont === "script"
      ? { font: (s) => `400 ${s}px ${fonts.script}`, size: theme.nameSize, color: theme.names, lineHeight: 0.92 }
      : {
          font: (s) => `400 ${s}px ${fonts.display}`,
          size: theme.nameSize,
          color: theme.names,
          spacing: 8,
          upper: theme.upperNames,
          lineHeight: 1.05,
        };
  const ampStyle: TextStyle = {
    font: (s) => `italic 400 ${s}px ${fonts.display}`,
    size: theme.nameFont === "script" ? 64 : 48,
    color: theme.amp,
  };

  if (n1 || n2) {
    const both = n1 && n2;
    const joined = both ? `${n1} & ${n2}` : n1 || n2;
    const shown = nameStyle.upper ? joined.toUpperCase() : joined;
    const inlineSize = fitSize(ctx, shown, nameStyle, W, 10);
    if (!both || (!theme.stackedOnly && inlineSize >= theme.inlineMin)) {
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

  blocks.push(ruleBlock(theme.rule, true));
  gap(38);

  // Fecha
  const parts = dateParts(design.date);
  const display = (size: number, color: string, extra: Partial<TextStyle> = {}): TextStyle => ({
    font: (s) => `400 ${s}px ${fonts.display}`,
    size,
    color,
    ...extra,
  });
  if (parts) {
    if (theme.dateStyle === "sentence") {
      blocks.push(lineBlock(ctx, parts.weekday, caps(28, theme.accent, 10), W, 18));
      gap(18);
      blocks.push(lineBlock(ctx, `${parts.day} de ${parts.month}`, display(92, theme.date), W, 36));
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
          { font: (s) => `italic 400 ${s}px ${fonts.display}`, size: 56, color: theme.heading },
          W,
          24
        )
      );
    }
  }

  // Lugar
  const place = design.place.trim();
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
          font: (s) => `italic 400 ${s}px ${fonts.display}`,
          size: 36,
          color: theme.muted,
          lineHeight: 1.4,
        },
        Math.min(W, 640)
      )
    );
  }
  return blocks;
}

/**
 * Pinta la tarjeta en `canvas` (cuyo alto debe ser 1,4 × su ancho). Las
 * tipografías ya deben estar cargadas (ver `loadCardFonts`).
 */
export function drawSaveTheDate(canvas: HTMLCanvasElement, design: SaveTheDateDesign, fonts: CardFonts) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const theme = THEMES[design.template] ?? THEMES.jardin;
  const k = canvas.width / CARD_W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  theme.paintBackground(ctx);

  const blocks = buildBlocks(ctx, design, theme, fonts);
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
