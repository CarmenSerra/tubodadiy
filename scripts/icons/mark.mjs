// Marca de tubodadiy para favicon / icono de app: un círculo blanco con el monograma «tb»
// en los colores del tema (violeta profundo y lila, en la tipografía de títulos, Newsreader)
// y una pequeña hoja salvia. Una sola definición; generate.mjs la vuelca a SVG/PNG/ICO.
// Cuadrícula de 64×64, formas grandes y pocos detalles para que se lea a 16 px.
//
// Las letras son trazados (monogram-glyphs.mjs), no texto: se ven igual en cualquier sitio.

import { ROMAN } from "./monogram-glyphs.mjs";

export const PALETTE = {
  light: {
    disc: "#ffffff", // círculo blanco
    ring: "#d4c0ea", // = --lilac-edge: aro fino para que el blanco no se pierda en pestañas blancas
    t: "#927aac", // = --cta (lila)
    b: "#68538a", // violeta profundo (familia de --cta)
    leaf: "#8faf8a", // = --sage
    bg: "#efe8f6", // fondo del icono de iOS (a sangre); no se usa en el favicon
  },
  // Noche: el mismo círculo claro (sobre pestañas oscuras se ve mejor que uno oscuro), con las
  // letras más profundas y un aro lila más marcado.
  dark: {
    disc: "#fbf9fe",
    ring: "#a38ed2", // = --lilac-bright
    t: "#7a62a0",
    b: "#4d3b73",
    leaf: "#7fa37b",
    bg: "#38384d", // = --page (oscuro)
  },
};

const RING = 2;
const FONT = ROMAN;
/** Alto del monograma (de la base a lo alto de la «b») en la cuadrícula de 64. */
const LETTER_H = 34;

/** Letras «t» y «b» centradas en el círculo: devuelve los dos trazados ya colocados. */
function monogram(c) {
  const { t, b } = FONT;
  const yMin = Math.min(t.bounds[1], b.bounds[1]);
  const yMax = Math.max(t.bounds[3], b.bounds[3]);
  const s = LETTER_H / (yMax - yMin);
  const left = t.bounds[0];
  const right = t.adv + b.bounds[2];
  const width = (right - left) * s;
  const x0 = 32 - width / 2 - left * s;
  // Se centra el cuerpo de las letras (no el asta de la «b») un poco por debajo del centro
  // para dejar sitio a la hoja, que va arriba a la derecha.
  const baseline = 32 + (yMax - yMin) * s * 0.5 + yMin * s + 1;
  const place = (g, dx) =>
    `transform="translate(${(x0 + dx * s).toFixed(2)} ${baseline.toFixed(2)}) scale(${s.toFixed(5)} ${(-s).toFixed(5)})"`;
  return (
    `<path ${place(t, 0)} d="${t.d}" fill="${c.t}"/>` + `<path ${place(b, t.adv)} d="${b.d}" fill="${c.b}"/>`
  );
}

/** Hoja de eucalipto (almendra) en el hueco de arriba a la derecha, con un nervio. */
function leaf(c) {
  const body = "M0 0C2.6 -4.4 8 -5.2 12 -1.4C8.6 3.6 3 4.2 0 0Z";
  return (
    `<g transform="translate(42.2 20.8) rotate(-40) scale(.88)">` +
    `<path d="${body}" fill="${c.leaf}"/>` +
    `<path d="M0.8 -0.2C4 -0.9 7.4 -1.1 10.2 -1" fill="none" stroke="${c.disc}" stroke-opacity=".7" stroke-width=".7" stroke-linecap="round"/>` +
    `</g>`
  );
}

/**
 * Cuerpo del icono (sin <svg>), con los colores de una variante.
 * `tile`: "round" (círculo con transparencia alrededor, favicon) o "full" (cuadrado a sangre
 * con el círculo dentro, para el icono de iOS, que aplica su propia máscara).
 */
export function markBody(c, { tile = "round" } = {}) {
  const full = tile === "full";
  const scale = full ? 25 / (32 - RING / 2) : 1;
  const art =
    `<circle cx="32" cy="32" r="${32 - RING / 2}" fill="${c.disc}" stroke="${c.ring}" stroke-width="${RING}"/>` +
    monogram(c) +
    leaf(c);
  return full
    ? `<rect width="64" height="64" fill="${c.bg}"/><g transform="translate(32 32) scale(${scale.toFixed(4)}) translate(-32 -32)">${art}</g>`
    : art;
}

/** SVG fijo de una variante ("light" | "dark"); `tile` como en markBody. */
export function svgFor(variant, opts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${markBody(PALETTE[variant], opts)}</svg>\n`;
}

/**
 * SVG que cambia solo con prefers-color-scheme (la pestaña del navegador sigue al
 * sistema). Los colores van en variables CSS para que el modo oscuro las reemplace.
 */
export function svgAdaptive() {
  const l = PALETTE.light;
  const d = PALETTE.dark;
  const keys = ["disc", "ring", "t", "b", "leaf"];
  const body = markBody(Object.fromEntries(keys.map((k) => [k, `var(--${k})`])));
  const decl = (c) => keys.map((k) => `--${k}:${c[k]}`).join(";");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><style>:root{${decl(l)}}@media (prefers-color-scheme:dark){:root{${decl(d)}}}</style>${body}</svg>\n`;
}
