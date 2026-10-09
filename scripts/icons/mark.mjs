// Marca de tubodadiy para favicon / icono de app: un corazón lila con una ramita de
// eucalipto salvia que le cruza la base. Una sola definición; generate.mjs la
// vuelca a SVG/PNG/ICO. Cuadrícula de 64×64, formas grandes y pocos detalles para
// que se lea a 16 px.

export const PALETTE = {
  light: {
    tile: "#f8f5f1", // = --surface (claro)
    edge: "#d4c0ea", // borde fino para que el azulejo no se pierda en pestañas blancas
    heart: "#927aac", // = --cta
    stem: "#4e6a5a", // = --green
    leaf: "#8faf8a", // = --sage
    leafEdge: "#f8f5f1", // contorno de las hojas sobre el corazón
  },
  dark: {
    tile: "#38384d", // = --page (oscuro)
    edge: "#586c64",
    heart: "#d4c0ea", // = --cta (oscuro)
    stem: "#bcc7b5",
    leaf: "#8faf8a",
    leafEdge: "#38384d",
  },
};

const HEART =
  "M32 47 C18 37 12 29.5 12 22.5 C12 16.5 16.5 12.5 22 12.5 C26.3 12.5 29.8 15 32 18.8 C34.2 15 37.7 12.5 42 12.5 C47.5 12.5 52 16.5 52 22.5 C52 29.5 46 37 32 47 Z";

// Tallo en arco bajo el corazón (como una corona abierta) y hojas redondas de eucalipto
// a ambos lados. Se calculan sobre la curva para que queden regulares.
const STEM = [
  [9, 37],
  [13, 59],
  [51, 59],
  [55, 37],
];
const bez = (t) => {
  const u = 1 - t;
  return STEM[0].map(
    (_, i) => u * u * u * STEM[0][i] + 3 * u * u * t * STEM[1][i] + 3 * u * t * t * STEM[2][i] + t * t * t * STEM[3][i]
  );
};
const tangent = (t) => {
  const u = 1 - t;
  return [0, 1].map(
    (i) =>
      3 * u * u * (STEM[1][i] - STEM[0][i]) + 6 * u * t * (STEM[2][i] - STEM[1][i]) + 3 * t * t * (STEM[3][i] - STEM[2][i])
  );
};
const LEAVES = [0.08, 0.26, 0.74, 0.92].flatMap((t, k) => {
  const [x, y] = bez(t);
  const [tx, ty] = tangent(t);
  const len = Math.hypot(tx, ty);
  // normal hacia fuera del arco (abajo) en las hojas pares, hacia dentro en las impares
  const nx = ty / len;
  const ny = -tx / len;
  const side = k % 2 === 0 ? 1 : -1;
  const off = 3.6;
  const rot = (Math.atan2(ny * side, nx * side) * 180) / Math.PI;
  return [{ cx: +(x + nx * side * off).toFixed(2), cy: +(y + ny * side * off).toFixed(2), rx: 6.2, ry: 3.9, rot: +rot.toFixed(1) }];
});

/** Cuerpo del icono (sin <svg>), con los colores de una variante. */
export function markBody(c, { tile = "round" } = {}) {
  const leaves = LEAVES.map(
    (l) =>
      `<ellipse cx="${l.cx}" cy="${l.cy}" rx="${l.rx}" ry="${l.ry}" transform="rotate(${l.rot} ${l.cx} ${l.cy})" fill="${c.leaf}"/>`
  ).join("");
  return (
    (tile === "round"
      ? `<rect x="1" y="1" width="62" height="62" rx="15" fill="${c.tile}" stroke="${c.edge}" stroke-width="2"/>`
      : tile === "full"
        ? `<rect width="64" height="64" fill="${c.tile}"/>`
        : "") +
    `<path d="M${STEM[0]} C${STEM[1]} ${STEM[2]} ${STEM[3]}" fill="none" stroke="${c.stem}" stroke-width="2.8" stroke-linecap="round"/>` +
    leaves +
    `<path d="${HEART}" transform="translate(32 25) scale(1.1) translate(-32 -28)" fill="${c.heart}" stroke="${c.tile}" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/>`
  );
}

/** SVG fijo de una variante ("light" | "dark"); `tile` como en markBody. */
export function svgFor(variant, opts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${markBody(PALETTE[variant], opts)}</svg>\n`;
}

/**
 * SVG que cambia solo con prefers-color-scheme (la pestaña del navegador sigue al
 * sistema). Los colores van en clases para que el modo oscuro los reemplace.
 */
export function svgAdaptive() {
  const l = PALETTE.light;
  const d = PALETTE.dark;
  const keys = ["tile", "edge", "heart", "stem", "leaf"];
  const body = markBody(
    Object.fromEntries(keys.map((k) => [k, `var(--${k})`]).concat([["leafEdge", "var(--tile)"]]))
  );
  const decl = (c) => keys.map((k) => `--${k}:${c[k]}`).join(";");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><style>:root{${decl(l)}}@media (prefers-color-scheme:dark){:root{${decl(d)}}}</style>${body}</svg>\n`;
}
