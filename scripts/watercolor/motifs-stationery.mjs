// Motivos de acuarela de la papelería (invitación, tarjeta de agradecimiento y
// «Reserva la fecha»): limones, naranjas, olivo, eucalipto, flores silvestres,
// cítricos, lavanda y granadas. Mismo motor que motifs.mjs (Canvas + filtros de
// lib.mjs). Cada motivo tiene tres piezas con el mismo nombre base:
//
//   <motivo>-a   rama grande para una esquina (nace en la esquina superior izquierda)
//   <motivo>-b   rama más corta, distinta, para la esquina de enfrente
//   <motivo>-s   ramita horizontal pequeña: el adorno central de la invitación
//
//   node scripts/watercolor/generate.mjs --set stationery [--only a,b] [--sheet ruta.png]
import { Canvas, PAL, bez, blob, f, leaf, mix, rng, smooth, stemPath } from "./lib.mjs";
import { branch, flowerHead, paintLeaf } from "./motifs.mjs";
import { PARTY_MOTIFS } from "./motifs-party.mjs";

const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;

// [claro, hondo]
const SP = {
  lemon: ["#FBF1A6", "#E4B52B"],
  orange: ["#FCD4A2", "#E5832B"],
  pome: ["#F4B3B1", "#B5334A"],
  olive: ["#C6D08F", "#6D7D3B"],
  oliveDark: ["#A996C0", "#55416F"],
  poppy: ["#F8BDA9", "#DA4B30"],
  corn: ["#BFD2F4", "#4C70C6"],
  daisy: ["#FFFFFF", "#E9E1CE"],
  sun: ["#FBE592", "#E6B83F"],
  lav: ["#CDB8EC", "#7A5CB0"],
  blossom: ["#FFFFFF", "#F2DDE3"],
  blush: ["#F8D3D9", "#E58FA0"],
  leafLemon: ["#C5DB9B", "#5E914F"],
  leafOrange: ["#B7D08E", "#4F8447"],
  leafPome: ["#B4D08F", "#4F8A52"],
  grass: ["#BBD4A0", "#678F57"],
};

/* ------------------------------ frutas ------------------------------ */
const FRUIT = {
  lemon: { pal: SP.lemon, a: 1.22, b: 1, tip: 0.3, nip: 0.17, dots: 0 },
  orange: { pal: SP.orange, a: 1, b: 1, tip: 0, nip: 0, dots: 16 },
  pome: { pal: SP.pome, a: 1, b: 0.96, tip: 0, nip: 0, crown: true },
  olive: { pal: SP.olive, a: 1, b: 0.62, tip: 0.12, nip: 0 },
  oliveDark: { pal: SP.oliveDark, a: 1, b: 0.62, tip: 0.12, nip: 0 },
};

function bodyPath(cx, cy, a, b, rot, tip = 0, nip = 0) {
  const pts = [];
  const n = 32;
  const co = Math.cos(rot * DEG), si = Math.sin(rot * DEG);
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const ct = Math.cos(th), st = Math.sin(th);
    let x = a * ct;
    const y = b * st * (1 - tip * Math.abs(ct) ** 2.2);
    if (i === 0) x += nip;
    pts.push([cx + x * co - y * si, cy + x * si + y * co]);
  }
  return smooth(pts);
}

function fruit(c, x, y, r, kind, rot, seed) {
  const k = FRUIT[kind];
  const rand = c.rand;
  const small = r < 16;
  const ft = small ? "tiny" : "petal";
  const a = r * k.a, b = r * k.b;
  c.shape(bodyPath(x, y, a, b, rot, k.tip, k.nip * r), {
    fill: k.pal,
    axis: [x - r, y - r, x + r, y + r * 1.25],
    op: 0.84,
    kind: ft,
    seed,
  });
  // Media sombra hacia abajo-derecha
  c.shape(bodyPath(x + r * 0.2, y + r * 0.22, a * 0.84, b * 0.78, rot, k.tip, 0), {
    fill: mix(k.pal[1], "#5a3a20", 0.2),
    op: 0.2,
    kind: ft,
    seed,
    edge: false,
  });
  if (k.dots) {
    let inner = "";
    for (let i = 0; i < k.dots; i++) {
      const ang = rand.range(0, Math.PI * 2);
      const d = Math.sqrt(rand()) * r * 0.78;
      inner += `<circle cx="${f(x + Math.cos(ang) * d)}" cy="${f(y + Math.sin(ang) * d)}" r="${f(rand.range(0.7, 1.5))}" fill="${k.pal[1]}" fill-opacity="0.55"/>`;
    }
    c.group(inner, { kind: "tiny", seed: seed + 2, edge: false });
  }
  if (k.crown) {
    for (let i = -2; i <= 2; i++) {
      const lf = leaf({ x, y: y - b * 0.86, ang: -90 + i * 30, len: r * 0.42, wid: r * 0.17, prof: "lance", n: 8 });
      c.shape(lf.d, { fill: mix(k.pal[1], "#6b1a28", 0.25), op: 0.8, kind: "tiny", seed: seed + 3 + i, edge: false });
    }
  }
  // Brillo
  c.shape(blob(x - r * 0.36, y - r * 0.36, r * 0.2, rand, { rough: 0.12, n: 12, sx: 1.5 }), {
    fill: "#ffffff",
    op: small ? 0.35 : 0.5,
    kind: "tiny",
    seed: seed + 1,
    edge: false,
  });
}

/** Fruta que cuelga de la rama con un pedúnculo corto. dx/dy: hacia dónde cuelga. */
function hangFruit(c, ctrl, { t, dx, dy, r, kind, rot, seed = 1 }) {
  const p = bez(ctrl, t);
  const ex = p.x + dx, ey = p.y + dy;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  const sc = [[p.x, p.y], [p.x + dx * 0.15, p.y + dy * 0.5], [ex - dx * 0.1, ey - dy * 0.25], [ex, ey]];
  c.shape(stemPath(sc, 3, 2.2), { fill: PAL.stem, op: 0.72, kind: "stem", seed });
  r *= kind.startsWith("olive") ? 1.4 : 1;
  const a = FRUIT[kind].a;
  const cx = ex + ux * r * (kind === "lemon" ? a * 0.95 : 0.9);
  const cy = ey + uy * r * (kind === "lemon" ? a * 0.95 : 0.9);
  fruit(c, cx, cy, r, kind, rot ?? Math.atan2(uy, ux) / DEG + c.rand.range(-12, 12), seed);
}

/* ------------------------------ ramas ------------------------------ */
function leafRun(r, o) {
  const { from = 0.14, to = 0.96, n = 9, len = [62, 36], wid = 0.36, rel = [44, 60], prof = "lance", pals, bend = 0.08, pet = 4, tip = true, tipPal } = o;
  const leaves = [];
  for (let k = 0; k < n; k++) {
    const t = from + ((to - from) * k) / Math.max(1, n - 1);
    const size = lerp(len[0], len[1], k / Math.max(1, n - 1));
    for (const side of [-1, 1]) {
      const L = size * r.range(0.9, 1.08);
      leaves.push({
        t: Math.min(0.99, t + (side > 0 ? 0.03 : 0)),
        side,
        rel: r.range(rel[0], rel[1]),
        len: L,
        wid: L * wid * r.range(0.92, 1.08),
        prof,
        bend: -side * r.range(0.03, bend),
        asym: r.range(-0.08, 0.08),
        pet,
        pal: r.pick(pals),
      });
    }
  }
  if (tip) leaves.push({ t: 1, ang: undefined, len: len[1] * 0.95, wid: len[1] * wid * 0.95, prof, pet: 1, pal: tipPal ?? pals[0], side: 0, rel: 0, tipLeaf: true });
  return leaves;
}

function spray({ seed, w, h, ctrl, L, fruits = [], stem = [5.5, 1.8], after }) {
  const r = rng(seed);
  const c = new Canvas(w, h, r);
  const leaves = leafRun(r, L).map((lf) => (lf.tipLeaf ? { ...lf, ang: bez(ctrl, 1).ang } : lf));
  branch(c, ctrl, leaves, { stem, seed, nVeins: L.nVeins ?? 2, vein: L.vein ?? true });
  fruits.forEach((fr, i) => hangFruit(c, ctrl, { ...fr, seed: 1 + ((seed + i) % 5) }));
  after?.(c, r);
  return c;
}

/** Flor de cinco pétalos blancos con centro amarillo (azahar / flor de limonero). */
function blossom(c, x, y, R, rot, seed) {
  flowerHead(c, x, y, R, rot, { petals: 5, pal: SP.blossom, wid: 0.85, seed, deepCenter: false });
  c.shape(blob(x, y, R * 0.15, c.rand, { rough: 0.1, n: 10 }), { fill: SP.sun[1], op: 0.85, kind: "tiny", seed, edge: false });
}

const TL = (w, h) => [[-18, 34], [w * 0.34, 26], [w * 0.6, h * 0.34], [w * 0.9, h * 0.88]];
const TLb = (w, h) => [[-16, h * 0.16], [w * 0.3, h * 0.12], [w * 0.55, h * 0.4], [w * 0.88, h * 0.84]];

/* ------------------------------ limones ------------------------------ */
function lemonsA() {
  const W = 360, H = 360;
  return spray({
    seed: 211, w: W, h: H, ctrl: TL(W, H),
    L: { pals: [SP.leafLemon, PAL.sage, SP.leafOrange], len: [66, 38], wid: 0.36, n: 9 },
    fruits: [
      { t: 0.4, dx: 16, dy: 46, r: 31, kind: "lemon" },
      { t: 0.62, dx: 30, dy: 38, r: 27, kind: "lemon" },
      { t: 0.8, dx: -22, dy: 40, r: 23, kind: "lemon" },
    ],
  });
}
function lemonsB() {
  // Ramita de olivo con aceitunas (la otra mitad de la tarjeta de la referencia)
  const W = 300, H = 300;
  return spray({
    seed: 223, w: W, h: H, ctrl: TLb(W, H),
    L: { pals: [PAL.olive, PAL.sageDeep, PAL.sage], len: [58, 36], wid: 0.26, n: 8, rel: [40, 52] },
    fruits: [
      { t: 0.45, dx: 6, dy: 28, r: 11, kind: "olive" },
      { t: 0.52, dx: 22, dy: 22, r: 10, kind: "olive" },
      { t: 0.7, dx: -6, dy: 30, r: 10, kind: "oliveDark" },
    ],
    stem: [4.6, 1.6],
  });
}
function lemonsS() {
  const W = 320, H = 118;
  return spray({
    seed: 227, w: W, h: H, ctrl: [[10, 58], [90, 78], [200, 30], [310, 54]],
    L: { from: 0.14, to: 0.92, n: 6, pals: [SP.leafLemon, PAL.sage], len: [34, 22], wid: 0.36, pet: 2, nVeins: 0, vein: false },
    fruits: [
      { t: 0.4, dx: 4, dy: 20, r: 17, kind: "lemon" },
      { t: 0.64, dx: 14, dy: 16, r: 15, kind: "lemon" },
    ],
    stem: [3.4, 1.2],
  });
}

/* ------------------------------ naranjas ------------------------------ */
function orangesA() {
  const W = 360, H = 360;
  return spray({
    seed: 233, w: W, h: H, ctrl: TL(W, H),
    L: { pals: [SP.leafOrange, PAL.sageDeep, PAL.sage], len: [62, 36], wid: 0.42, n: 9, prof: "ovate" },
    fruits: [
      { t: 0.4, dx: 10, dy: 44, r: 31, kind: "orange" },
      { t: 0.62, dx: 30, dy: 38, r: 28, kind: "orange" },
      { t: 0.8, dx: -20, dy: 38, r: 22, kind: "orange" },
    ],
  });
}
function orangesB() {
  const W = 300, H = 300;
  return spray({
    seed: 239, w: W, h: H, ctrl: TLb(W, H),
    L: { pals: [SP.leafOrange, PAL.sage], len: [54, 32], wid: 0.42, n: 8, prof: "ovate" },
    fruits: [{ t: 0.55, dx: 12, dy: 40, r: 27, kind: "orange" }],
    after: (c) => {
      const ctrl = TLb(W, H);
      for (const [t, dx, dy, R, rot] of [[0.3, -18, -20, 16, 20], [0.76, 22, -26, 14, 80]]) {
        const p = bez(ctrl, t);
        blossom(c, p.x + dx, p.y + dy, R, rot, 2);
      }
    },
  });
}
function orangesS() {
  const W = 320, H = 118;
  return spray({
    seed: 241, w: W, h: H, ctrl: [[10, 58], [90, 80], [200, 30], [310, 52]],
    L: { from: 0.14, to: 0.92, n: 6, pals: [SP.leafOrange, PAL.sage], len: [34, 22], wid: 0.42, prof: "ovate", pet: 2, nVeins: 0, vein: false },
    fruits: [
      { t: 0.42, dx: 4, dy: 18, r: 16, kind: "orange" },
      { t: 0.66, dx: 12, dy: 16, r: 14, kind: "orange" },
    ],
    stem: [3.4, 1.2],
  });
}

/* ------------------------------ olivo ------------------------------ */
function olivesA() {
  const W = 360, H = 360;
  return spray({
    seed: 251, w: W, h: H, ctrl: TL(W, H),
    L: { pals: [PAL.olive, PAL.sageDeep, PAL.sage], len: [70, 40], wid: 0.25, n: 10, rel: [40, 54] },
    fruits: [
      { t: 0.36, dx: 8, dy: 34, r: 13, kind: "olive" },
      { t: 0.42, dx: 26, dy: 30, r: 12, kind: "olive" },
      { t: 0.56, dx: -8, dy: 36, r: 13, kind: "oliveDark" },
      { t: 0.7, dx: 18, dy: 32, r: 12, kind: "olive" },
      { t: 0.78, dx: 36, dy: 24, r: 11, kind: "oliveDark" },
      { t: 0.86, dx: -10, dy: 32, r: 11, kind: "olive" },
    ],
    stem: [6, 2],
  });
}
function olivesB() {
  const W = 300, H = 300;
  return spray({
    seed: 257, w: W, h: H, ctrl: TLb(W, H),
    L: { pals: [PAL.olive, PAL.sage, PAL.sageDeep], len: [60, 38], wid: 0.24, n: 8, rel: [38, 52] },
    fruits: [
      { t: 0.5, dx: 4, dy: 32, r: 12, kind: "olive" },
      { t: 0.58, dx: 22, dy: 26, r: 11, kind: "oliveDark" },
    ],
    stem: [5, 1.8],
  });
}
function olivesS() {
  const W = 320, H = 118;
  return spray({
    seed: 261, w: W, h: H, ctrl: [[10, 62], [90, 86], [200, 30], [310, 56]],
    L: { from: 0.12, to: 0.94, n: 7, pals: [PAL.olive, PAL.sageDeep], len: [38, 24], wid: 0.25, pet: 2, nVeins: 0, vein: false },
    fruits: [
      { t: 0.4, dx: 2, dy: 20, r: 9, kind: "olive" },
      { t: 0.46, dx: 14, dy: 17, r: 9, kind: "oliveDark" },
      { t: 0.66, dx: 0, dy: 20, r: 9, kind: "olive" },
    ],
    stem: [3.4, 1.2],
  });
}

/* ------------------------------ eucalipto ------------------------------ */
function eucalyptusA() {
  const W = 360, H = 360;
  return spray({
    seed: 271, w: W, h: H, ctrl: TL(W, H),
    L: { pals: [PAL.eucal, PAL.sage, PAL.teal], len: [54, 24], wid: 1, n: 8, prof: "round", rel: [52, 72], from: 0.16, nVeins: 0 },
    stem: [6, 2.2],
  });
}
function eucalyptusB() {
  const W = 300, H = 300;
  return spray({
    seed: 277, w: W, h: H, ctrl: TLb(W, H),
    L: { pals: [PAL.eucal, PAL.sageDeep, PAL.sage], len: [84, 52], wid: 0.22, n: 7, prof: "lance", rel: [32, 48], pet: 3, nVeins: 0 },
    stem: [5.4, 1.8],
  });
}
function eucalyptusS() {
  const W = 320, H = 118;
  return spray({
    seed: 281, w: W, h: H, ctrl: [[10, 60], [90, 84], [200, 32], [310, 56]],
    L: { from: 0.14, to: 0.94, n: 6, pals: [PAL.eucal, PAL.sage, PAL.teal], len: [28, 18], wid: 1, prof: "round", rel: [52, 70], pet: 2, nVeins: 0, vein: false },
    stem: [3.4, 1.2],
  });
}

/* ------------------------------ flores silvestres ------------------------------ */
function poppy(c, x, y, R, rot, seed) {
  flowerHead(c, x, y, R, rot, { petals: 5, pal: SP.poppy, wid: 1.08, seed, deepCenter: false });
  c.shape(blob(x, y, R * 0.17, c.rand, { rough: 0.1, n: 10 }), { fill: "#4a3b3a", op: 0.8, kind: "tiny", seed, edge: false });
}
function cornflower(c, x, y, R, rot, seed) {
  flowerHead(c, x, y, R, rot, { petals: 9, pal: SP.corn, wid: 0.42, seed, deepCenter: false });
  c.shape(blob(x, y, R * 0.16, c.rand, { rough: 0.1, n: 10 }), { fill: "#3f3a79", op: 0.78, kind: "tiny", seed, edge: false });
}
function daisy(c, x, y, R, rot, seed) {
  flowerHead(c, x, y, R, rot, { petals: 12, pal: SP.daisy, wid: 0.3, seed, deepCenter: false });
  c.shape(blob(x, y, R * 0.2, c.rand, { rough: 0.1, n: 10 }), { fill: SP.sun, axis: [x - R * 0.2, y - R * 0.2, x + R * 0.2, y + R * 0.2], op: 0.9, kind: "tiny", seed, edge: false });
}
const HEADS = { poppy, cornflower, daisy };

/** Tallos finos con una flor al final y algún capullo/hoja. */
function wildflowers(seed, W, H, stems) {
  const r = rng(seed);
  const c = new Canvas(W, H, r);
  stems.forEach(({ ctrl, head, R, rot }, i) => {
    const leaves = [
      { t: 0.34, side: i % 2 ? 1 : -1, rel: 38, len: 52, wid: 13, prof: "lance", bend: 0.1, pet: 1, pal: SP.grass },
      { t: 0.56, side: i % 2 ? -1 : 1, rel: 42, len: 44, wid: 11, prof: "lance", bend: -0.1, pet: 1, pal: SP.grass },
    ];
    branch(c, ctrl, leaves, { stem: [3.6, 1.8], seed: 1 + i, nVeins: 0, vein: false });
    const end = bez(ctrl, 1);
    HEADS[head](c, end.x, end.y, R, rot, 1 + i);
  });
  return c;
}
function wildflowersA() {
  return wildflowers(291, 360, 360, [
    { ctrl: [[-14, 42], [110, 34], [196, 90], [262, 214]], head: "poppy", R: 40, rot: 20 },
    { ctrl: [[-14, 84], [60, 150], [120, 210], [150, 316]], head: "cornflower", R: 29, rot: -30 },
    { ctrl: [[24, -14], [130, 46], [250, 62], [326, 128]], head: "daisy", R: 30, rot: 0 },
    { ctrl: [[-14, 20], [60, 70], [96, 128], [92, 196]], head: "daisy", R: 21, rot: 15 },
  ]);
}
function wildflowersB() {
  return wildflowers(293, 300, 300, [
    { ctrl: [[-14, 50], [100, 40], [168, 100], [214, 214]], head: "cornflower", R: 31, rot: 10 },
    { ctrl: [[22, -14], [96, 60], [176, 60], [250, 94]], head: "poppy", R: 33, rot: -10 },
    { ctrl: [[-14, 100], [40, 150], [60, 200], [58, 262]], head: "daisy", R: 22, rot: 30 },
  ]);
}
function wildflowersS() {
  return wildflowers(297, 320, 118, [
    { ctrl: [[10, 100], [60, 80], [90, 50], [120, 30]], head: "cornflower", R: 18, rot: 0 },
    { ctrl: [[160, 112], [160, 80], [160, 50], [162, 26]], head: "poppy", R: 22, rot: 15 },
    { ctrl: [[310, 100], [260, 82], [230, 56], [204, 34]], head: "daisy", R: 18, rot: 0 },
  ]);
}

/* ------------------------------ cítricos ------------------------------ */
function citrusA() {
  const W = 360, H = 360;
  return spray({
    seed: 301, w: W, h: H, ctrl: TL(W, H),
    L: { pals: [SP.leafLemon, SP.leafOrange, PAL.sage], len: [64, 36], wid: 0.38, n: 9 },
    fruits: [
      { t: 0.38, dx: 14, dy: 44, r: 30, kind: "orange" },
      { t: 0.6, dx: 32, dy: 36, r: 26, kind: "lemon" },
      { t: 0.8, dx: -20, dy: 38, r: 22, kind: "lemon" },
    ],
  });
}
function citrusB() {
  const W = 300, H = 300;
  return spray({
    seed: 307, w: W, h: H, ctrl: TLb(W, H),
    L: { pals: [SP.leafOrange, SP.leafLemon], len: [54, 32], wid: 0.4, n: 8 },
    fruits: [
      { t: 0.5, dx: 6, dy: 38, r: 24, kind: "lemon" },
      { t: 0.74, dx: 20, dy: 30, r: 20, kind: "orange" },
    ],
    after: (c) => {
      const ctrl = TLb(W, H);
      for (const [t, dx, dy, R, rot] of [[0.28, -16, -22, 15, 10], [0.62, 20, -26, 13, 70]]) {
        const p = bez(ctrl, t);
        blossom(c, p.x + dx, p.y + dy, R, rot, 3);
      }
    },
  });
}
function citrusS() {
  const W = 320, H = 118;
  return spray({
    seed: 311, w: W, h: H, ctrl: [[10, 58], [90, 80], [200, 30], [310, 54]],
    L: { from: 0.14, to: 0.92, n: 6, pals: [SP.leafLemon, SP.leafOrange], len: [34, 22], wid: 0.38, pet: 2, nVeins: 0, vein: false },
    fruits: [
      { t: 0.38, dx: 4, dy: 18, r: 16, kind: "orange" },
      { t: 0.62, dx: 14, dy: 16, r: 15, kind: "lemon" },
    ],
    stem: [3.4, 1.2],
  });
}

/* ------------------------------ lavanda ------------------------------ */
function lavSpike(c, ctrl, seed, florets = 11, size = 21) {
  const r = c.rand;
  c.shape(stemPath(ctrl, 3.4, 1.8), { fill: PAL.stem, axis: [ctrl[0][0], ctrl[0][1], ctrl[3][0], ctrl[3][1]], op: 0.7, kind: "stem", seed });
  for (let k = 0; k < florets; k++) {
    const t = 0.52 + 0.48 * (k / florets);
    const p = bez(ctrl, t);
    const len = lerp(size, size * 0.57, k / florets);
    for (const side of [-1, 1]) {
      const ang = p.ang + side * r.range(28, 46);
      const lf = leaf({ x: p.x, y: p.y, ang, len: len * r.range(0.9, 1.1), wid: len * 0.55, prof: "floret", n: 10 });
      const pal = r.pick([PAL.violet, PAL.lilacDeep, PAL.lilacDeep]);
      c.shape(lf.d, { fill: [mix(pal[0], pal[1], 0.2), mix(pal[0], pal[1], 0.85)], axis: [lf.base[0], lf.base[1], lf.tip[0], lf.tip[1]], op: 0.68, kind: "tiny", seed: 1 + ((seed + k) % 5) });
    }
  }
  const tip = bez(ctrl, 1);
  const lf = leaf({ x: tip.x, y: tip.y, ang: tip.ang, len: size * 0.62, wid: size * 0.33, prof: "floret", n: 8 });
  c.shape(lf.d, { fill: PAL.violet[1], op: 0.7, kind: "tiny", seed: seed + 2 });
}
function lavender(seed, W, H, spikes, basal, size = 21) {
  const r = rng(seed);
  const c = new Canvas(W, H, r);
  for (const [x, y, ang, len, bend] of basal) {
    const lf = leaf({ x, y, ang, len, wid: 14, prof: "needle", bend });
    paintLeaf(c, lf, { pal: PAL.eucal, op: 0.6, seed: 2, nVeins: 0 });
  }
  spikes.forEach((s, i) => lavSpike(c, s, 1 + i, 11, size));
  return c;
}
function lavenderA() {
  return lavender(
    321, 360, 360,
    [
      [[-14, 40], [120, 40], [210, 100], [290, 220]],
      [[-14, 76], [80, 110], [150, 190], [200, 320]],
      [[30, -14], [140, 36], [250, 60], [340, 120]],
      [[-14, 8], [70, 60], [110, 130], [108, 230]],
    ],
    [[-8, 24, 18, 150, 0.1], [-8, 40, 40, 140, -0.1]]
  );
}
function lavenderB() {
  return lavender(
    323, 300, 300,
    [
      [[-14, 52], [100, 52], [180, 110], [236, 232]],
      [[-14, 104], [56, 140], [100, 200], [112, 280]],
      [[26, -14], [110, 50], [190, 70], [270, 110]],
    ],
    [[-8, 36, 22, 130, 0.1]]
  );
}
function lavenderS() {
  return lavender(
    327, 320, 118,
    [
      [[20, 108], [60, 80], [100, 54], [128, 24]],
      [[160, 114], [160, 80], [162, 50], [164, 12]],
      [[300, 108], [260, 82], [226, 56], [198, 26]],
    ],
    [],
    16
  );
}

/* ------------------------------ granadas ------------------------------ */
function pomegranatesA() {
  const W = 360, H = 360;
  return spray({
    seed: 331, w: W, h: H, ctrl: TL(W, H),
    L: { pals: [SP.leafPome, PAL.sageDeep, PAL.sage], len: [56, 32], wid: 0.34, n: 9 },
    fruits: [
      { t: 0.42, dx: 14, dy: 46, r: 33, kind: "pome", rot: 0 },
      { t: 0.7, dx: 26, dy: 34, r: 27, kind: "pome", rot: 0 },
    ],
    after: (c) => {
      const ctrl = TL(W, H);
      for (const [t, dx, dy, R, rot] of [[0.26, -10, -24, 15, 0], [0.84, 14, -28, 13, 40]]) {
        const p = bez(ctrl, t);
        flowerHead(c, p.x + dx, p.y + dy, R, rot, { petals: 5, pal: SP.poppy, wid: 0.95, seed: 3, deepCenter: false });
      }
    },
  });
}
function pomegranatesB() {
  const W = 300, H = 300;
  return spray({
    seed: 337, w: W, h: H, ctrl: TLb(W, H),
    L: { pals: [SP.leafPome, PAL.sage], len: [52, 30], wid: 0.34, n: 8 },
    fruits: [{ t: 0.55, dx: 10, dy: 40, r: 28, kind: "pome", rot: 0 }],
    after: (c) => {
      const p = bez(TLb(W, H), 0.3);
      flowerHead(c, p.x - 14, p.y - 22, 14, 10, { petals: 5, pal: SP.poppy, wid: 0.95, seed: 4, deepCenter: false });
    },
  });
}
function pomegranatesS() {
  const W = 320, H = 118;
  return spray({
    seed: 341, w: W, h: H, ctrl: [[10, 58], [90, 80], [200, 30], [310, 54]],
    L: { from: 0.14, to: 0.92, n: 6, pals: [SP.leafPome, PAL.sage], len: [34, 22], wid: 0.34, pet: 2, nVeins: 0, vein: false },
    fruits: [
      { t: 0.42, dx: 4, dy: 16, r: 17, kind: "pome", rot: 0 },
      { t: 0.68, dx: 12, dy: 14, r: 14, kind: "pome", rot: 0 },
    ],
    stem: [3.4, 1.2],
  });
}

const piece = (motif, key, build, kind) => ({ name: `${motif}-${key}`, kind, alpha: 55, build });
const trio = (motif, a, b, s) => [piece(motif, "a", a, "corner"), piece(motif, "b", b, "corner"), piece(motif, "s", s, "sprig")];

export const STATIONERY_MOTIFS = [
  ...trio("lemons", lemonsA, lemonsB, lemonsS),
  ...trio("oranges", orangesA, orangesB, orangesS),
  ...trio("olives", olivesA, olivesB, olivesS),
  ...trio("eucalyptus", eucalyptusA, eucalyptusB, eucalyptusS),
  ...trio("wildflowers", wildflowersA, wildflowersB, wildflowersS),
  ...trio("citrus", citrusA, citrusB, citrusS),
  ...trio("lavender", lavenderA, lavenderB, lavenderS),
  ...trio("pomegranates", pomegranatesA, pomegranatesB, pomegranatesS),
  // Fiesta: alianzas, brindis, tarta, ramo, fotos instantáneas y cartas de amor
  ...PARTY_MOTIFS,
];
