import type { CSSProperties, ReactNode } from "react";

import { mix, type InvitationTheme } from "@/components/invitation/invitation-theme";

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
  "floral",
  "watercolor",
  "arches",
  "confetti",
] as const;
export type InvitationBackground = (typeof BACKGROUND_IDS)[number];

export const DEFAULT_BACKGROUND: InvitationBackground = "plain";

export function isBackground(value: unknown): value is InvitationBackground {
  return typeof value === "string" && (BACKGROUND_IDS as readonly string[]).includes(value);
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

// ---- Manchas de acuarela en las esquinas ----

function Wash({ className, a, b }: { className: string; a: string; b: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} focusable="false" aria-hidden="true">
      <path
        d="M-20 -20 H172 C184 30 152 60 120 80 C86 100 70 130 46 152 C30 166 8 172 -20 170 Z"
        fill={a}
        fillOpacity=".34"
        stroke={a}
        strokeOpacity=".4"
        strokeWidth="1.6"
      />
      <path
        d="M-20 -20 H112 C116 28 92 52 68 66 C46 80 34 104 10 116 C-4 122 -12 122 -20 120 Z"
        fill={b}
        fillOpacity=".34"
        stroke={b}
        strokeOpacity=".4"
        strokeWidth="1.4"
      />
      <circle cx="152" cy="22" r="15" fill={b} fillOpacity=".26" />
      <circle cx="26" cy="146" r="11" fill={a} fillOpacity=".3" />
      <circle cx="104" cy="104" r="6" fill={b} fillOpacity=".22" />
    </svg>
  );
}

function watercolor(t: InvitationTheme): Spec {
  return {
    style: {},
    children: (
      <>
        <Wash className="inv-wash inv-washTL" a={t.primary} b={t.leaf} />
        <Wash className="inv-wash inv-washTR" a={t.leaf} b={t.primary} />
        <Wash className="inv-wash inv-washBL" a={t.leaf} b={t.primary} />
        <Wash className="inv-wash inv-washBR" a={t.primary} b={t.leaf} />
      </>
    ),
  };
}

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

// ---- Montaje ----

const BUILDERS: Record<Exclude<InvitationBackground, "plain">, (t: InvitationTheme) => Spec> = {
  stripes,
  paper,
  dots,
  gingham,
  floral,
  watercolor,
  arches,
  confetti,
};

/**
 * Capa de fondo (detrás del contenido). `scale` encoge los motivos para las
 * miniaturas del editor. El liso no lleva capa.
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
  const spec = BUILDERS[kind](theme);
  const style = { ...spec.style, ...(scale ? { "--bg-k": scale } : {}) } as CSSProperties;
  return (
    <div className="inv-bgLayer" data-bg={kind} aria-hidden="true" style={style}>
      {spec.children}
    </div>
  );
}
