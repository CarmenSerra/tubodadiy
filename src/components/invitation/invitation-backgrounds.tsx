import type { CSSProperties, ReactNode } from "react";

import { mix, type InvitationTheme, type TemplateKind } from "@/components/invitation/invitation-theme";
import { STATIONERY, type StationeryName } from "@/components/stationery/stationery-assets";
import { cn } from "@/lib/utils";

/**
 * Fondos de la invitación. Todo es SVG/CSS generado con los colores de la
 * paleta (nada de imágenes externas): se ve igual en pantalla, en la vista
 * previa del editor y en la página que abren los invitados. Código sin estado
 * ni hooks, así que vale para servidor y cliente.
 */

export const BACKGROUND_IDS = [
  "plain",
  "stripes",
  "paper",
  "dots",
  "gingham",
  // "floral", // desactivado a petición, de momento (marco floral)
  "arches",
  // "confetti", // desactivado a petición, de momento
  // Motivos en acuarela (WebP en public/decor/stationery, colocados en bordes y esquinas)
  "lemons",
  "oranges",
  "olives",
  "eucalyptus",
  "wildflowers",
  "citrus",
  "lavender",
  "pomegranates",
  // Motivos de fiesta en acuarela
  "rings",
  "toast",
  // "cake", // desactivado a petición, de momento (tarta)
  "bouquet",
  // "polaroid", // desactivado a petición, de momento
  "loveletters",
] as const;
export type InvitationBackground = (typeof BACKGROUND_IDS)[number];

export const DEFAULT_BACKGROUND: InvitationBackground = "plain";

export function isBackground(value: unknown): value is InvitationBackground {
  return typeof value === "string" && (BACKGROUND_IDS as readonly string[]).includes(value);
}

/** Fondos que ya no se ofrecen (desactivados a petición, de momento): si están guardados, se ven como «liso». */
const DISABLED_BACKGROUNDS: readonly string[] = ["watercolor", "confetti", "floral", "cake", "polaroid"];

/**
 * Plantillas que ya llevan sus propios dibujos (esquinas, marco…): no admiten los motivos de
 * acuarela de fondo. Botánico, minimal, elegante e hilo sí.
 */
export const OWN_ART_TEMPLATES: readonly TemplateKind[] = ["retro", "doodle", "azulejo"];

/** ¿Esta plantilla admite motivos de acuarela de fondo? */
export function templateAllowsMotifs(template: TemplateKind | undefined): boolean {
  return !template || !OWN_ART_TEMPLATES.includes(template);
}

/**
 * Fondo guardado, saneado. «Manchas de acuarela» ya no existe, ni los fondos desactivados
 * a petición (confeti, marco floral, tarta, polaroid): lo que los tuviera guardado pasa a
 * «liso». Con `template`, un motivo de acuarela en una plantilla que ya lleva sus propios
 * dibujos también pasa a «liso». Un valor desconocido no se guarda.
 */
export function cleanBackground(value: unknown, template?: TemplateKind): InvitationBackground | undefined {
  if (typeof value === "string" && DISABLED_BACKGROUNDS.includes(value)) return "plain";
  if (!isBackground(value)) return undefined;
  return isMotif(value) && !templateAllowsMotifs(template) ? "plain" : value;
}

/** Los fondos con motivos de acuarela (los demás son SVG/CSS generados con la paleta). */
export const MOTIF_IDS = [
  "lemons",
  "oranges",
  "olives",
  "eucalyptus",
  "wildflowers",
  "citrus",
  "lavender",
  "pomegranates",
  "rings",
  "toast",
  // "cake", // desactivado a petición, de momento (tarta)
  "bouquet",
  // "polaroid", // desactivado a petición, de momento
  "loveletters",
] as const satisfies readonly InvitationBackground[];
export type InvitationMotif = (typeof MOTIF_IDS)[number];

export function isMotif(value: unknown): value is InvitationMotif {
  return typeof value === "string" && (MOTIF_IDS as readonly string[]).includes(value);
}

// ---- Motivos de acuarela ----

/** Las tres piezas de un motivo: rama grande (a), rama corta (b) y ramita pequeña (s). */
export function motifPiece(motif: InvitationMotif, piece: "a" | "b" | "s") {
  const name = `${motif}-${piece}` as StationeryName;
  const { w, h } = STATIONERY[name];
  return { src: `/decor/stationery/${name}.webp`, w, h };
}

/** URLs de las dos ramas de esquina (para pintarlas también en el lienzo de «Reserva la fecha»). */
export function motifCornerUrls(kind: InvitationBackground | undefined): { a: string; b: string } | null {
  return isMotif(kind) ? { a: motifPiece(kind, "a").src, b: motifPiece(kind, "b").src } : null;
}

/**
 * Dos ramas de acuarela en la diagonal de una tarjeta (arriba a la izquierda y
 * abajo a la derecha). Son imágenes decorativas, siempre detrás del texto, y
 * van DENTRO de la tarjeta: la mesa de detrás de las tarjetas es siempre lisa.
 */
export function MotifCorners({ motif }: { motif: InvitationMotif }) {
  const a = motifPiece(motif, "a");
  const b = motifPiece(motif, "b");
  const img = (piece: typeof a, className: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={piece.src}
      alt=""
      aria-hidden="true"
      width={piece.w}
      height={piece.h}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn("inv-motifPiece", className)}
    />
  );
  return (
    <div className="inv-motif inv-motifCard" aria-hidden="true">
      {img(a, "inv-mTL")}
      {img(b, "inv-mBR")}
    </div>
  );
}

/** Ramita pequeña del motivo: el adorno central de la tarjeta de la invitación. */
export function MotifSprig({ motif, className }: { motif: InvitationMotif; className?: string }) {
  const s = motifPiece(motif, "s");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={s.src}
      alt=""
      aria-hidden="true"
      width={s.w}
      height={s.h}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn("inv-motifSprig", className)}
    />
  );
}

// ---- Utilidades ----

const n = (v: number) => Math.round(v * 10) / 10;

/** Aleatorio determinista (mismo resultado en servidor y cliente). */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function svgUrl(width: number, height: number, body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

interface Spec {
  style: CSSProperties;
  children?: ReactNode;
}

// ---- Rayas verticales efecto acuarela ----

const STRIPE_W = 264;
const STRIPE_H = 600;

/** Ondulación periódica en `y` (período = alto del azulejo): las juntas no se notan. */
function wobble(y: number, seed: number, amp: number) {
  const t = (2 * Math.PI * y) / STRIPE_H;
  return amp * (0.62 * Math.sin(t + seed) + 0.28 * Math.sin(3 * t + seed * 2.3) + 0.14 * Math.sin(7 * t + seed * 4.1));
}

function stripePath(cx: number, half: number, seed: number, amp: number) {
  const left: string[] = [];
  const right: string[] = [];
  for (let y = 0; y <= STRIPE_H; y += 10) {
    left.push(`${n(cx - half + wobble(y, seed, amp))} ${y}`);
    right.push(`${n(cx + half + wobble(y, seed + 1.7, amp))} ${y}`);
  }
  return `M${left.join(" L")} L${right.reverse().join(" L")} Z`;
}

function stripes(t: InvitationTheme): Spec {
  const k = t.isDark ? 0.8 : 1;
  const core = mix(t.primary, t.isDark ? "#ffffff" : t.ink, 0.22);
  const defs = `<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${t.primary}" stop-opacity="1"/><stop offset=".14" stop-color="${t.primary}" stop-opacity=".66"/><stop offset=".86" stop-color="${t.primary}" stop-opacity=".66"/><stop offset="1" stop-color="${t.primary}" stop-opacity="1"/></linearGradient></defs>`;
  const bands = [
    { cx: 44, half: 21, seed: 0.4 },
    { cx: 132, half: 15, seed: 2.1 },
    { cx: 220, half: 24, seed: 4.3 },
  ];
  const body = bands
    .map(
      ({ cx, half, seed }) =>
        `<path d="${stripePath(cx, half + 6, seed + 0.9, 3.4)}" fill="${t.primary}" fill-opacity="${n(0.12 * k)}"/>` +
        `<path d="${stripePath(cx, half, seed, 2.6)}" fill="url(#g)" fill-opacity="${n(0.3 * k)}"/>` +
        `<path d="${stripePath(cx, half * 0.42, seed + 2.2, 2)}" fill="${core}" fill-opacity="${n(0.1 * k)}"/>`
    )
    .join("");
  return { style: { backgroundImage: svgUrl(STRIPE_W, STRIPE_H, defs + body) } };
}

// ---- Papel con textura sutil ----

function paper(t: InvitationTheme): Spec {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(t.ink.slice(i, i + 2), 16) / 255);
  const grain = t.isDark ? 0.2 : 0.26;
  const off = (-grain * 0.24).toFixed(3);
  const fibers = Array.from({ length: 16 }, (_, i) => {
    const rnd = seeded(40 + i);
    const x = 10 + rnd() * 200;
    const y = 10 + rnd() * 200;
    const len = 10 + rnd() * 16;
    const a = rnd() * Math.PI;
    return `<path d="M${n(x)} ${n(y)} q${n(Math.cos(a) * len * 0.5 + 3)} ${n(Math.sin(a) * len * 0.5 - 3)} ${n(Math.cos(a) * len)} ${n(Math.sin(a) * len)}" stroke="${t.ink}" stroke-opacity=".07" stroke-width=".6" fill="none"/>`;
  }).join("");
  const body =
    `<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="11" stitchTiles="stitch"/>` +
    `<feColorMatrix type="matrix" values="0 0 0 0 ${r.toFixed(2)} 0 0 0 0 ${g.toFixed(2)} 0 0 0 0 ${b.toFixed(2)} 0 0 0 ${grain} ${off}"/></filter>` +
    `<rect width="220" height="220" filter="url(#n)"/>${fibers}`;
  const edge = t.isDark ? "rgb(255 255 255 / 0.05)" : "rgb(60 40 20 / 0.06)";
  return {
    style: {
      backgroundImage: `radial-gradient(ellipse 120% 85% at 50% 40%, transparent 55%, ${edge} 100%), ${svgUrl(220, 220, body)}`,
    },
  };
}

// ---- Lunares pequeños ----

function dots(t: InvitationTheme): Spec {
  const k = t.isDark ? 1.4 : 1;
  const body =
    `<circle cx="9" cy="9" r="2.3" fill="${t.primary}" fill-opacity="${n(0.5 * k)}"/>` +
    `<circle cx="27" cy="27" r="1.7" fill="${t.leaf}" fill-opacity="${n(0.5 * k)}"/>`;
  return { style: { backgroundImage: svgUrl(36, 36, body) } };
}

// ---- Cuadros vichy suave ----

function gingham(t: InvitationTheme): Spec {
  const k = t.isDark ? 1.5 : 1;
  const a = n(0.12 * k);
  const body =
    `<rect x="0" y="0" width="16" height="32" fill="${t.primary}" fill-opacity="${a}"/>` +
    `<rect x="0" y="0" width="32" height="16" fill="${t.primary}" fill-opacity="${a}"/>`;
  return { style: { backgroundImage: svgUrl(32, 32, body) } };
}

/* desactivado a petición, de momento: marco floral
// ---- Marco floral de ramitas finas ----

const VINE_W = 64;
const VINE_H = 360;

function vineTile(t: InvitationTheme, mirror: boolean): string {
  const stemX = (y: number) => 32 + 8 * Math.sin((2 * Math.PI * y) / VINE_H);
  const stemColor = mix(t.leaf, t.ink, 0.35);
  let stem = "";
  for (let y = 0; y <= VINE_H; y += 10) stem += `${y === 0 ? "M" : " L"}${n(stemX(y))} ${y}`;
  const k = t.isDark ? 1.2 : 1;
  const leaves = Array.from({ length: 8 }, (_, i) => {
    const y = 22 + i * 40;
    const side = i % 2 === 0 ? 1 : -1;
    const x = stemX(y);
    const rot = side === 1 ? -28 : 180 + 28;
    return `<path d="M0 0 C4 -6.5 13 -7.5 19 0 C13 7.5 4 6.5 0 0Z" transform="translate(${n(x)} ${y}) rotate(${rot})" fill="${t.leaf}" fill-opacity="${n(0.85 * k)}"/>`;
  }).join("");
  const flower = (y: number, s: number) => {
    const x = stemX(y);
    const petals = [0, 72, 144, 216, 288]
      .map((a) => `<ellipse cx="0" cy="-3.6" rx="2.2" ry="3.6" transform="rotate(${a})" fill="${t.primary}" fill-opacity="${n(0.92)}"/>`)
      .join("");
    return `<g transform="translate(${n(x)} ${y}) scale(${s})">${petals}<circle r="1.7" fill="${t.paper}"/></g>`;
  };
  const buds = [200, 340]
    .map((y) => `<circle cx="${n(stemX(y) + (y === 200 ? 7 : -7))}" cy="${y}" r="2.1" fill="${t.primary}" fill-opacity=".8"/>`)
    .join("");
  const inner =
    `<path d="${stem}" fill="none" stroke="${stemColor}" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round"/>` +
    leaves +
    flower(112, 1.15) +
    flower(292, 0.95) +
    buds;
  return mirror ? `<g transform="translate(${VINE_W} 0) scale(-1 1)">${inner}</g>` : inner;
}

function floral(t: InvitationTheme): Spec {
  return {
    style: {
      backgroundImage: `${svgUrl(VINE_W, VINE_H, vineTile(t, false))}, ${svgUrl(VINE_W, VINE_H, vineTile(t, true))}`,
      "--bg-frame": t.line,
    } as CSSProperties,
    children: <span className="inv-bgFrame" />,
  };
}
*/

// ---- Arcos minimalistas ----

function arches(t: InvitationTheme): Spec {
  const k = t.isDark ? 1.4 : 1;
  const arch = (cx: number, oy: number) =>
    [
      { r: 22, c: t.primary, o: 0.42 },
      { r: 15, c: t.leaf, o: 0.42 },
      { r: 8, c: t.primary, o: 0.42 },
    ]
      .map(
        ({ r, c, o }) =>
          `<path d="M${cx - r} ${oy + 72} V${oy + 36} A${r} ${r} 0 0 1 ${cx + r} ${oy + 36} V${oy + 72}" fill="none" stroke="${c}" stroke-opacity="${n(Math.min(1, o * k))}" stroke-width="1.3" stroke-linecap="round"/>`
      )
      .join("");
  const body = arch(30, 0) + arch(0, 72) + arch(60, 72);
  return { style: { backgroundImage: svgUrl(60, 144, body) } };
}

/* desactivado a petición, de momento: confeti
// ---- Confeti delicado ----

function confetti(t: InvitationTheme): Spec {
  const rnd = seeded(2024);
  const colors = [t.primary, t.leaf, mix(t.primary, t.leaf, 0.5), mix(t.primary, t.ink, 0.35)];
  const k = t.isDark ? 1.2 : 1;
  const pieces: string[] = [];
  for (let i = 0; i < 24; i++) {
    const x = 10 + rnd() * 200;
    const y = 10 + rnd() * 200;
    const c = colors[i % colors.length];
    const o = n(Math.min(1, (0.38 + rnd() * 0.25) * k));
    const kind = i % 4;
    if (kind === 0) pieces.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(1.8 + rnd() * 1.6)}" fill="${c}" fill-opacity="${o}"/>`);
    else if (kind === 1)
      pieces.push(`<rect x="${n(x - 5)}" y="${n(y - 1.2)}" width="10" height="2.4" rx="1.2" fill="${c}" fill-opacity="${o}" transform="rotate(${n(rnd() * 180)} ${n(x)} ${n(y)})"/>`);
    else if (kind === 2)
      pieces.push(`<path d="M0 -4 L3.6 3 L-3.6 3 Z" fill="${c}" fill-opacity="${o}" transform="translate(${n(x)} ${n(y)}) rotate(${n(rnd() * 360)})"/>`);
    else pieces.push(`<circle cx="${n(x)}" cy="${n(y)}" r="3" fill="none" stroke="${c}" stroke-opacity="${o}" stroke-width="1.3"/>`);
  }
  return { style: { backgroundImage: svgUrl(220, 220, pieces.join("")) } };
}
*/

// ---- Montaje ----

const BUILDERS: Record<Exclude<InvitationBackground, "plain" | InvitationMotif>, (t: InvitationTheme) => Spec> = {
  stripes,
  paper,
  dots,
  gingham,
  // floral, // desactivado a petición, de momento
  arches,
  // confetti, // desactivado a petición, de momento
};

/**
 * Las imágenes de un fondo de azulejo o de ramitas (SVG en data URI, en el orden
 * de CSS: la primera va encima). Los motivos de acuarela y el liso devuelven
 * una lista vacía. «Reserva la fecha» las dibuja
 * en su lienzo para verse igual que la invitación.
 */
export function backdropImages(kind: InvitationBackground | undefined, theme: InvitationTheme): string[] {
  if (!kind || kind === "plain" || isMotif(kind)) return [];
  const image = BUILDERS[kind](theme).style.backgroundImage;
  return typeof image === "string" ? [...image.matchAll(/url\("(data:[^"]+)"\)/g)].map((m) => m[1]) : [];
}

/**
 * Capa de fondo de la TARJETA (detrás de su contenido; la tarjeta recorta lo que
 * se sale). `scale` ajusta el tamaño de los azulejos. El liso no lleva capa.
 */
export function InvitationBackdrop({
  kind,
  theme,
  scale,
}: {
  kind: InvitationBackground | undefined;
  theme: InvitationTheme;
  scale?: number;
}) {
  if (!kind || kind === "plain") return null;
  if (isMotif(kind)) return <MotifCorners motif={kind} />;
  const spec = BUILDERS[kind](theme);
  const style = { ...spec.style, ...(scale ? { "--bg-k": scale } : {}) } as CSSProperties;
  return (
    <div className="inv-bgLayer" data-bg={kind} aria-hidden="true" style={style}>
      {spec.children}
    </div>
  );
}
