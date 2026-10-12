// Batería de acuarelas de viaje para la Luna de miel (public/decor/travel/*.webp).
// Mismo motor que motifs.mjs (Canvas + filtros de acuarela de lib.mjs), con una paleta
// propia más fría y desaturada: turquesa, arena, coral y verde palmera muy suaves.
//
//   node scripts/watercolor/generate.mjs --set travel [--sheet ruta.png]
import { Canvas, bez, blob, f, leaf, mix, rng, smooth, stemPath } from "./lib.mjs";
import { paintLeaf } from "./motifs.mjs";

const DEG = Math.PI / 180;

// [claro, hondo]. Todo pastel: ninguno baja de ~65 % de luminosidad en el tono claro.
const TP = {
  aqua: ["#C4E6E0", "#72B7B0"],
  aquaDeep: ["#A6D5D0", "#4F9592"],
  sky: ["#D3E5F0", "#8CB3CE"],
  sand: ["#F5EACF", "#DCC38F"],
  coral: ["#F9D2C6", "#E8A394"],
  coralDeep: ["#F4BEB0", "#D68576"],
  sun: ["#FCEBB6", "#EECB72"],
  palm: ["#C0D9B7", "#76A482"],
  palmDeep: ["#A5C9A8", "#52866C"],
  lilac: ["#E6DBF2", "#BBA6DA"],
  slate: ["#AFC5CE", "#6E8B99"],
  cream: ["#FCF7E8", "#ECE1C0"],
  brown: ["#DEC9AB", "#AA8A68"],
};
const INK = "#52727B";
const GOLD = "#F1DCA4";

/* ------------------------- geometría con marco girado ------------------------- */
/** Marco local: todo se dibuja en coordenadas propias y sale girado `deg` alrededor de (cx, cy). */
function frame(deg = 0, cx = 0, cy = 0) {
  const a = deg * DEG, co = Math.cos(a), si = Math.sin(a);
  const P = ([x, y]) => [cx + (x - cx) * co - (y - cy) * si, cy + (x - cx) * si + (y - cy) * co];
  const edge = (pts, x0, y0, x1, y1, step) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  const arc = (pts, ax, ay, r, a0, a1, rx = r, ry = r) => {
    for (let i = 0; i < 5; i++) {
      const t = (a0 + ((a1 - a0) * i) / 5) * DEG;
      pts.push([ax + rx * Math.cos(t), ay + ry * Math.sin(t)]);
    }
  };
  const rrPts = (x, y, w, h, r, step = 16) => {
    const q = [];
    edge(q, x + r, y, x + w - r, y, step); arc(q, x + w - r, y + r, r, -90, 0);
    edge(q, x + w, y + r, x + w, y + h - r, step); arc(q, x + w - r, y + h - r, r, 0, 90);
    edge(q, x + w - r, y + h, x + r, y + h, step); arc(q, x + r, y + h - r, r, 90, 180);
    edge(q, x, y + h - r, x, y + r, step); arc(q, x + r, y + r, r, 180, 270);
    return q;
  };
  return {
    P,
    pts: (arr) => arr.map(P),
    rr: (x, y, w, h, r) => smooth(rrPts(x, y, w, h, r).map(P)),
    ell: (ex, ey, rx, ry = rx, n = 36) =>
      smooth(Array.from({ length: n }, (_, i) => [ex + rx * Math.cos((i / n) * Math.PI * 2), ey + ry * Math.sin((i / n) * Math.PI * 2)]).map(P)),
    /** Media elipse superior (cúpula) cerrada con recta. */
    dome: (ex, ey, rx, ry, n = 24) =>
      smooth(Array.from({ length: n + 1 }, (_, i) => [ex - rx * Math.cos((i / n) * Math.PI), ey - ry * Math.sin((i / n) * Math.PI)]).map(P)),
    poly: (arr) => "M" + arr.map((p) => P(p)).map((p) => `${f(p[0])} ${f(p[1])}`).join("L") + "Z",
    open: (arr) => "M" + arr.map((p) => P(p)).map((p) => `${f(p[0])} ${f(p[1])}`).join("L"),
    curve: (arr) => smooth(arr.map(P), false),
    closed: (arr) => smooth(arr.map(P)),
    rrPts, edge, arc,
  };
}

const grad = (a, b) => [a, b];
const soft = (c, d, fill, o = {}) => c.shape(d, { op: 0.76, kind: "paper", seed: 1, fill, ...o });

/** Puntitos (estela, perforación, salpicaduras): un solo filtro para todo el grupo. */
function dots(c, list, color, op, seed = 3) {
  const inner = list.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${color}" fill-opacity="${op}"/>`).join("");
  c.group(inner, { kind: "tiny", seed, edge: false });
}

/** Avión visto desde arriba, con la nariz hacia +x. */
function plane(c, S, cx, cy, k, tone = TP.sky, seed = 1) {
  const T = (arr) => arr.map(([x, y]) => [cx + x * k, cy + y * k]);
  const wing = (m) => T([[14, 5 * m], [-14, 62 * m], [-30, 62 * m], [-12, 5 * m]]);
  const tail = (m) => T([[-46, 3 * m], [-62, 25 * m], [-72, 25 * m], [-60, 3 * m]]);
  const deep = mix(tone[0], tone[1], 0.8);
  for (const m of [1, -1]) {
    soft(c, S.poly(wing(m)), grad(tone[0], deep), { op: 0.72, seed });
    soft(c, S.poly(tail(m)), grad(tone[0], deep), { op: 0.7, seed: seed + 1 });
  }
  soft(c, S.ell(cx, cy, 66 * k, 10.5 * k), grad("#FFFFFF", tone[0]), { op: 0.9, seed: seed + 2 });
  soft(c, S.ell(cx - 6 * k, cy + 2 * k, 56 * k, 5 * k), grad(tone[0], tone[1]), { op: 0.22, seed: seed + 2, edge: false });
  // morro y ventanillas
  dots(c, Array.from({ length: 6 }, (_, i) => [...S.P([cx + (36 - i * 11) * k, cy - 1.5 * k]), 1.9 * k]), mix(tone[1], "#3C5866", 0.3), 0.6, seed + 4);
}

/* -------------------------------- documentos -------------------------------- */
function passport() {
  const r = rng(201);
  const c = new Canvas(270, 350, r);
  const S = frame(-9, 135, 175);
  soft(c, S.rr(52, 48, 176, 250, 8), grad(TP.cream[0], TP.cream[1]), { op: 0.85, seed: 2 });
  soft(c, S.rr(38, 40, 176, 250, 12), grad("#9CC3CD", "#5F94A6"), { op: 0.8, seed: 1 });
  soft(c, S.rr(38, 40, 18, 250, 9), "#3E6E80", { op: 0.2, seed: 1, edge: false });
  // escudo: globo dorado
  const G = { stroke: GOLD, op: 0.95, seed: 4 };
  c.line(S.ell(130, 124, 40), { ...G, w: 3 });
  c.line(S.ell(130, 124, 17, 40), { ...G, w: 2 });
  c.line(S.open([[90, 124], [170, 124]]), { ...G, w: 2 });
  c.line(S.open([[98, 100], [162, 100]]) + S.open([[98, 148], [162, 148]]), { ...G, w: 1.6 });
  c.line(S.open([[84, 204], [176, 204]]), { stroke: GOLD, w: 6, op: 0.9, seed: 5 });
  c.line(S.open([[102, 222], [158, 222]]), { stroke: GOLD, w: 4, op: 0.8, seed: 6 });
  soft(c, S.rr(112, 256, 36, 14, 3), GOLD, { op: 0.7, seed: 3, kind: "tiny" });
  return c;
}

function idCard() {
  const r = rng(207);
  const c = new Canvas(340, 240, r);
  const S = frame(6, 170, 120);
  soft(c, S.rr(24, 28, 292, 182, 16), grad("#FCF7EA", "#CBE6E1"), { op: 0.88, seed: 2 });
  soft(c, S.rr(24, 28, 292, 32, 14), grad(TP.aquaDeep[0], TP.aquaDeep[1]), { op: 0.5, seed: 3, edge: false });
  soft(c, S.ell(284, 44, 10), grad(TP.sun[0], TP.sun[1]), { op: 0.85, seed: 4, kind: "tiny" });
  c.line(S.open([[44, 44], [110, 44]]), { stroke: "#FFFFFF", w: 5, op: 0.8, seed: 5 });
  // foto
  soft(c, S.rr(44, 80, 86, 106, 8), grad(TP.lilac[0], TP.lilac[1]), { op: 0.8, seed: 5 });
  soft(c, S.ell(87, 119, 16, 18), "#7F7AA5", { op: 0.5, seed: 6, kind: "tiny" });
  soft(c, S.dome(87, 186, 32, 30), "#7F7AA5", { op: 0.5, seed: 7, kind: "tiny" });
  // chip y líneas de texto
  soft(c, S.rr(146, 86, 32, 26, 5), grad(GOLD, "#D9BC72"), { op: 0.85, seed: 8, kind: "tiny" });
  c.line(S.open([[146, 99], [178, 99]]) + S.open([[162, 86], [162, 112]]), { stroke: "#9C8142", w: 1, op: 0.5, seed: 9 });
  for (const [y, x2, w] of [[132, 280, 6], [150, 250, 6], [168, 268, 6]]) {
    c.line(S.open([[146, y], [x2, y]]), { stroke: INK, w, op: 0.3, seed: y });
  }
  c.line(S.open([[146, 182], [200, 182]]), { stroke: INK, w: 3, op: 0.25, seed: 11 });
  return c;
}

/** Contorno de billete con muescas semicirculares arriba y abajo, en x = nx. */
function ticketPts(x, y, w, h, r, nx, nr) {
  const S = frame();
  const q = [];
  S.edge(q, x + r, y, nx - nr, y, 14);
  for (let i = 0; i < 8; i++) { const a = (180 - (180 * i) / 7) * DEG; q.push([nx + nr * Math.cos(a), y + nr * Math.sin(a)]); }
  S.edge(q, nx + nr, y, x + w - r, y, 14); S.arc(q, x + w - r, y + r, r, -90, 0);
  S.edge(q, x + w, y + r, x + w, y + h - r, 14); S.arc(q, x + w - r, y + h - r, r, 0, 90);
  S.edge(q, x + w - r, y + h, nx + nr, y + h, 14);
  for (let i = 0; i < 8; i++) { const a = (0 - (180 * i) / 7) * DEG; q.push([nx + nr * Math.cos(a), y + h + nr * Math.sin(a)]); }
  S.edge(q, nx - nr, y + h, x + r, y + h, 14); S.arc(q, x + r, y + h - r, r, 90, 180);
  S.edge(q, x, y + h - r, x, y + r, 14); S.arc(q, x + r, y + r, r, 180, 270);
  return q;
}

function boardingPass() {
  const r = rng(211);
  const c = new Canvas(380, 200, r);
  const S = frame(-6, 190, 100);
  const nx = 268;
  soft(c, smooth(S.pts(ticketPts(22, 30, 336, 140, 14, nx, 10))), grad("#FCF7EA", "#D5E8EE"), { op: 0.88, seed: 2 });
  soft(c, S.rr(22, 30, nx - 22 - 12, 34, 12), grad(TP.coral[0], TP.coral[1]), { op: 0.62, seed: 3, edge: false });
  soft(c, S.rr(nx + 12, 30, 358 - nx - 12, 140, 8), grad(TP.sun[0], TP.sun[1]), { op: 0.28, seed: 4, edge: false });
  plane(c, S, 70, 112, 0.46, TP.sky, 5);
  c.line(S.open([[44, 46], [130, 46]]), { stroke: "#FFFFFF", w: 6, op: 0.85, seed: 6 });
  for (const [y, x2] of [[96, 230], [118, 200], [140, 222]]) {
    c.line(S.open([[116, y], [x2, y]]), { stroke: INK, w: 6, op: 0.28, seed: y });
  }
  dots(c, Array.from({ length: 9 }, (_, i) => [...S.P([nx, 46 + i * 12.5]), 1.8]), INK, 0.45, 7);
  // código de barras en la matriz
  let x = nx + 22;
  for (let i = 0; i < 16; i++) {
    const wd = 1.2 + ((i * 7) % 4);
    c.line(S.open([[x, 70], [x, 142]]), { stroke: INK, w: wd, op: 0.5, seed: 20 + i });
    x += wd + 2.6;
  }
  return c;
}

function stamp() {
  const r = rng(217);
  const c = new Canvas(280, 320, r);
  const S = frame(7, 140, 160);
  // contorno dentado
  const X = 36, Y = 34, W = 196, H = 236, step = 17, br = 6;
  const q = [];
  const bites = (x0, y0, x1, y1, inward) => {
    const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / step);
    const dx = (x1 - x0) / n, dy = (y1 - y0) / n;
    for (let i = 0; i < n; i++) {
      const mx = x0 + dx * (i + 0.5), my = y0 + dy * (i + 0.5);
      for (let k = 0; k <= 6; k++) {
        const t = (k / 6) * Math.PI; // 0..π: de un diente al siguiente
        const along = Math.cos(Math.PI - t) * br; // -br..br
        const depth = Math.sin(t) * br;
        q.push([mx + (dx / Math.hypot(dx, dy)) * along + inward[0] * depth, my + (dy / Math.hypot(dx, dy)) * along + inward[1] * depth]);
      }
    }
  };
  bites(X, Y, X + W, Y, [0, 1]);
  bites(X + W, Y, X + W, Y + H, [-1, 0]);
  bites(X + W, Y + H, X, Y + H, [0, -1]);
  bites(X, Y + H, X, Y, [1, 0]);
  soft(c, smooth(S.pts(q)), grad("#FCF7EA", "#EFE2BE"), { op: 0.9, seed: 2, kind: "paper" });
  soft(c, S.rr(56, 54, 156, 196, 2), grad("#DCEBF4", "#B9D6E6"), { op: 0.78, seed: 3, kind: "tiny" });
  soft(c, S.ell(134, 118, 26), grad(TP.sun[0], TP.sun[1]), { op: 0.85, seed: 4, kind: "tiny" });
  // mar con ondas
  const sea = [[56, 188]];
  for (let i = 0; i <= 24; i++) sea.push([56 + (156 * i) / 24, 186 + Math.sin(i * 1.1) * 5]);
  sea.push([212, 250], [56, 250]);
  soft(c, smooth(S.pts(sea)), grad("#B2DDD7", "#5FA8A5"), { op: 0.72, seed: 5, kind: "tiny" });
  // palmera
  const trunk = [[84, 200], [88, 170], [96, 150], [100, 132]].map(S.P);
  c.shape(stemPath(trunk, 5, 3), { fill: TP.brown, op: 0.8, kind: "stem", seed: 6 });
  const crown = S.P([100, 132]);
  [[-160, 26], [-120, 28], [-60, 26], [-20, 24]].forEach(([ang, len], i) => {
    const lf = leaf({ x: crown[0], y: crown[1], ang: ang + 7, len, wid: 11, bend: ang < -90 ? -0.25 : 0.25, prof: "lance", n: 10 });
    c.shape(lf.d, { fill: TP.palmDeep, op: 0.8, kind: "tiny", seed: 7 + i });
  });
  c.line(S.open([[66, 66], [96, 66]]), { stroke: INK, w: 4, op: 0.3, seed: 12 });
  // matasellos: círculo y ondas
  c.line(S.ell(196, 222, 40), { stroke: INK, w: 2.4, op: 0.42, seed: 13 });
  for (let k = 0; k < 4; k++) {
    const y = 206 + k * 12;
    const w = Array.from({ length: 16 }, (_, i) => [160 + i * 8.4, y + Math.sin(i * 1.2) * 3.2]);
    c.line(S.curve(w), { stroke: INK, w: 1.8, op: 0.4, seed: 14 + k });
  }
  return c;
}

/* ---------------------------------- equipaje ---------------------------------- */
function suitcase() {
  const r = rng(223);
  const c = new Canvas(270, 330, r);
  const S = frame(5, 135, 200);
  const handle = [[96, 104], [96, 40], [176, 40], [176, 104]].map(S.P);
  c.shape(stemPath(handle, 11, 11), { fill: TP.brown, op: 0.8, kind: "stem", seed: 1 });
  soft(c, S.rr(30, 100, 212, 192, 24), grad(TP.coral[0], TP.coral[1]), { op: 0.8, seed: 2 });
  soft(c, S.rr(70, 100, 16, 192, 4), TP.coralDeep[1], { op: 0.22, seed: 3, edge: false });
  soft(c, S.rr(186, 100, 16, 192, 4), TP.coralDeep[1], { op: 0.22, seed: 4, edge: false });
  soft(c, S.rr(46, 112, 8, 168, 3), "#FFFFFF", { op: 0.3, seed: 5, edge: false, kind: "tiny" });
  soft(c, S.rr(30, 178, 212, 18, 2), grad(TP.sand[0], TP.sand[1]), { op: 0.72, seed: 6, kind: "band" });
  soft(c, S.rr(120, 170, 32, 34, 5), grad(GOLD, "#D9BC72"), { op: 0.85, seed: 7, kind: "tiny" });
  c.line(S.open([[30, 150], [242, 150]]), { stroke: INK, w: 1.5, op: 0.22, seed: 8 });
  // pegatinas de viaje
  soft(c, S.ell(96, 238, 17), grad(TP.lilac[0], TP.lilac[1]), { op: 0.85, seed: 9, kind: "tiny" });
  soft(c, S.ell(172, 246, 13), grad(TP.sun[0], TP.sun[1]), { op: 0.9, seed: 10, kind: "tiny" });
  soft(c, S.ell(208, 224, 10), grad(TP.aqua[0], TP.aqua[1]), { op: 0.9, seed: 11, kind: "tiny" });
  soft(c, S.ell(60, 262, 9), grad(TP.palm[0], TP.palm[1]), { op: 0.9, seed: 12, kind: "tiny" });
  soft(c, S.ell(72, 304, 13), grad(TP.slate[0], TP.slate[1]), { op: 0.75, seed: 13, kind: "tiny" });
  soft(c, S.ell(200, 304, 13), grad(TP.slate[0], TP.slate[1]), { op: 0.75, seed: 14, kind: "tiny" });
  return c;
}

function airplane() {
  const r = rng(227);
  const c = new Canvas(360, 280, r);
  const S = frame(-26, 236, 98);
  plane(c, S, 236, 98, 1.45, TP.sky, 1);
  // estela punteada
  const trail = [[18, 252], [92, 238], [150, 206], [176, 160]];
  const list = [];
  for (let i = 0; i <= 22; i++) {
    const p = bez(trail, i / 22);
    list.push([p.x, p.y, 1.4 + (i / 22) * 2.6]);
  }
  dots(c, list, TP.aquaDeep[1], 0.7, 5);
  // nubecitas
  soft(c, blob(290, 232, 28, r, { rough: 0.12, sx: 1.7, sy: 0.7 }), "#FFFFFF", { op: 0.75, seed: 3, kind: "wash", edge: false });
  soft(c, blob(316, 222, 16, r, { rough: 0.12, sx: 1.4, sy: 0.8 }), "#FFFFFF", { op: 0.75, seed: 4, kind: "wash", edge: false });
  soft(c, blob(54, 70, 22, r, { rough: 0.12, sx: 1.8, sy: 0.65 }), TP.sky[0], { op: 0.7, seed: 4, kind: "wash", edge: false });
  return c;
}

function camera() {
  const r = rng(229);
  const c = new Canvas(310, 250, r);
  const S = frame(-5, 155, 125);
  const strap = (m) => [[155 + m * 116, 84], [155 + m * 140, 40], [155 + m * 96, 14], [155 + m * 40, 22]].map(S.P);
  for (const m of [-1, 1]) c.shape(stemPath(strap(m), 9, 9), { fill: TP.coral, op: 0.72, kind: "stem", seed: 2 });
  soft(c, S.rr(100, 46, 72, 40, 9), grad("#C4B4E0", "#9B86C8"), { op: 0.78, seed: 2 });
  soft(c, S.rr(32, 70, 246, 146, 20), grad("#DCD0EE", "#A894CC"), { op: 0.82, seed: 3 });
  soft(c, S.rr(38, 136, 234, 74, 14), grad(TP.cream[0], TP.cream[1]), { op: 0.72, seed: 4, edge: false });
  soft(c, S.rr(208, 52, 30, 22, 6), grad(TP.coral[0], TP.coral[1]), { op: 0.85, seed: 5, kind: "tiny" });
  soft(c, S.rr(54, 86, 36, 22, 6), grad("#FFFFFF", TP.cream[1]), { op: 0.9, seed: 6, kind: "tiny" });
  // objetivo
  soft(c, S.ell(155, 146, 56), grad(TP.slate[0], TP.slate[1]), { op: 0.85, seed: 7 });
  soft(c, S.ell(155, 146, 43), grad("#EAF2F6", "#A9C6D6"), { op: 0.9, seed: 8, kind: "tiny" });
  soft(c, S.ell(155, 146, 29), grad("#92B4C9", "#4F7D96"), { op: 0.85, seed: 9, kind: "tiny" });
  soft(c, S.ell(155, 146, 12), "#3F6379", { op: 0.55, seed: 10, kind: "tiny" });
  soft(c, S.ell(141, 131, 9, 5.5), "#FFFFFF", { op: 0.75, seed: 11, kind: "tiny", edge: false });
  return c;
}

/* ------------------------------- orientarse ------------------------------- */
function compass() {
  const r = rng(233);
  const c = new Canvas(290, 300, r);
  const S = frame(0, 145, 165);
  const ring = (cx, cy, ro, ri) => S.ell(cx, cy, ro, ro, 40) + S.ell(cx, cy, ri, ri, 40);
  // anilla
  soft(c, ring(145, 46, 17, 9), grad("#F5E4B0", "#D6B76C"), { op: 0.9, seed: 1, kind: "tiny", extra: 'fill-rule="evenodd"' });
  soft(c, S.rr(136, 58, 18, 20, 4), grad("#F5E4B0", "#D6B76C"), { op: 0.9, seed: 2, kind: "tiny" });
  soft(c, S.ell(145, 168, 104), grad("#F5E4B0", "#D6B76C"), { op: 0.88, seed: 3 });
  soft(c, S.ell(145, 168, 86), grad("#FCF7E8", "#EBE0BE"), { op: 0.95, seed: 4, edge: false });
  c.line(S.ell(145, 168, 86), { stroke: "#B89B52", w: 1.6, op: 0.5, seed: 5 });
  // marcas
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const long = i % 9 === 0, mid = i % 3 === 0;
    const r0 = long ? 56 : mid ? 66 : 71, r1 = 78;
    c.line(S.open([[145 + Math.cos(a) * r0, 168 + Math.sin(a) * r0], [145 + Math.cos(a) * r1, 168 + Math.sin(a) * r1]]), { stroke: INK, w: long ? 2.4 : 1.3, op: long ? 0.55 : 0.35, seed: 6 + i });
  }
  // aguja
  const N = frame(38, 145, 168);
  soft(c, N.poly([[145, 168 - 64], [145 + 11, 168], [145 - 11, 168]]), grad(TP.coral[0], TP.coralDeep[1]), { op: 0.88, seed: 7, kind: "tiny" });
  soft(c, N.poly([[145, 168 + 64], [145 + 11, 168], [145 - 11, 168]]), grad(TP.slate[0], TP.slate[1]), { op: 0.8, seed: 8, kind: "tiny" });
  soft(c, S.ell(145, 168, 7), grad("#F5E4B0", "#C9A858"), { op: 0.95, seed: 9, kind: "tiny" });
  return c;
}

function map() {
  const r = rng(239);
  const c = new Canvas(350, 280, r);
  const S = frame(-5, 175, 140);
  const panels = [
    { q: [[18, 70], [118, 46], [118, 212], [18, 236]], g: ["#FCF7E8", "#E9F1EA"] },
    { q: [[118, 46], [220, 70], [220, 236], [118, 212]], g: ["#F6EBCC", "#F0E1B8"] },
    { q: [[220, 70], [322, 46], [322, 212], [220, 236]], g: ["#EAF3EE", "#CFE6E1"] },
  ];
  panels.forEach((p, i) => soft(c, S.poly(p.q), p.g, { op: 0.88, seed: 2 + i, kind: "leaf" }));
  // mar, tierra y río
  soft(c, S.closed([[34, 150], [60, 124], [92, 138], [98, 180], [74, 216], [40, 204]]), grad("#B5DED8", "#64AEAA"), { op: 0.62, seed: 5, kind: "tiny", edge: false });
  soft(c, S.closed([[138, 96], [186, 90], [204, 130], [190, 176], [150, 190], [132, 150]]), grad(TP.palm[0], TP.palm[1]), { op: 0.62, seed: 6, kind: "tiny", edge: false });
  soft(c, S.closed([[246, 150], [290, 124], [304, 166], [276, 206], [244, 196]]), grad(TP.palm[0], TP.palm[1]), { op: 0.55, seed: 7, kind: "tiny", edge: false });
  c.line(S.curve([[150, 52], [158, 100], [138, 150], [164, 200]]), { stroke: TP.aquaDeep[1], w: 2.4, op: 0.55, seed: 8 });
  // pliegues
  c.line(S.open([[118, 46], [118, 212]]) + S.open([[220, 70], [220, 236]]), { stroke: INK, w: 1.3, op: 0.3, seed: 9 });
  // ruta punteada y marca final
  const route = [[38, 190], [100, 130], [150, 156], [220, 98], [286, 120]];
  const list = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26 * (route.length - 1);
    const a = Math.min(route.length - 2, Math.floor(t)), u = t - a;
    const p = [route[a][0] + (route[a + 1][0] - route[a][0]) * u, route[a][1] + (route[a + 1][1] - route[a][1]) * u];
    list.push([...S.P(p), 2.4]);
  }
  dots(c, list, TP.coralDeep[1], 0.8, 10);
  c.line(S.open([[278, 112], [296, 130]]) + S.open([[296, 112], [278, 130]]), { stroke: "#D4756B", w: 4, op: 0.85, seed: 11 });
  return c;
}

/* ------------------------------ playa y trópico ------------------------------ */
function palm() {
  const r = rng(241);
  const c = new Canvas(290, 410, r);
  soft(c, blob(125, 394, 78, r, { rough: 0.05, sy: 0.16 }), grad(TP.sand[0], TP.sand[1]), { op: 0.78, seed: 1, kind: "wash", edge: false });
  const ctrl = [[116, 394], [140, 300], [158, 196], [136, 118]];
  c.shape(stemPath(ctrl, 24, 13), { fill: TP.brown, axis: [116, 394, 136, 118], op: 0.82, kind: "stem", seed: 2 });
  for (let i = 1; i < 12; i++) {
    const p = bez(ctrl, 0.06 + i * 0.075);
    const w = 11 - i * 0.35;
    c.line(`M${f(p.x - p.ty * w)} ${f(p.y + p.tx * w)}Q${f(p.x)} ${f(p.y + 4)} ${f(p.x + p.ty * w)} ${f(p.y - p.tx * w)}`, { stroke: "#8E6F4E", w: 1.6, op: 0.32, seed: 3 + i });
  }
  const top = [136, 114];
  const fronds = [[-176, 128, 0.2], [-148, 138, 0.3], [-116, 120, 0.2], [-78, 110, -0.14], [-42, 134, -0.26], [-12, 138, -0.3], [18, 110, -0.2]];
  fronds.forEach(([ang, len, bend], i) => {
    const lf = leaf({ x: top[0], y: top[1], ang, len, wid: 38, bend, prof: "lance", n: 18 });
    paintLeaf(c, lf, { pal: i % 2 ? TP.palmDeep : TP.palm, op: 0.74, seed: 1 + (i % 5), nVeins: 8, tone: 0.1 + (i % 3) * 0.12 });
  });
  for (const [dx, dy, rr] of [[-11, 12, 12], [10, 14, 12], [0, 24, 11]]) {
    soft(c, blob(top[0] + dx, top[1] + dy, rr, r, { rough: 0.05, n: 14 }), grad(TP.brown[0], "#8E6F4E"), { op: 0.88, seed: 7, kind: "tiny" });
  }
  return c;
}

function coconut() {
  const r = rng(243);
  const c = new Canvas(280, 250, r);
  // coco entero
  soft(c, blob(98, 122, 64, r, { rough: 0.04, n: 30 }), grad("#CDB08E", "#8F6E4E"), { op: 0.86, seed: 1 });
  for (let i = 0; i < 7; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(14, 48);
    const x = 98 + Math.cos(a) * d, y = 122 + Math.sin(a) * d;
    c.line(`M${f(x)} ${f(y)}q${f(Math.cos(a + 1.5) * 12)} ${f(Math.sin(a + 1.5) * 12)} ${f(Math.cos(a + 1.2) * 20)} ${f(Math.sin(a + 1.2) * 20)}`, { stroke: "#7A5C3F", w: 1.2, op: 0.3, seed: 2 + i });
  }
  for (const [x, y] of [[74, 88], [96, 82], [84, 108]]) soft(c, blob(x, y, 6.5, r, { rough: 0.05, n: 10 }), "#6B4F37", { op: 0.62, seed: 3, kind: "tiny" });
  soft(c, blob(66, 100, 10, r, { rough: 0.15, n: 12, sx: 0.7, sy: 1.5 }), "#FFFFFF", { op: 0.3, seed: 4, kind: "tiny", edge: false });
  // mitad abierta con pajita
  const straw = [[206, 150], [212, 110], [226, 68], [246, 28]];
  soft(c, S0(194, 168, 66, 44, r), grad("#C9AB88", "#8F6E4E"), { op: 0.85, seed: 5 });
  soft(c, S0(194, 166, 55, 34, r), grad("#FFFFFF", "#F2EBD6"), { op: 0.92, seed: 6, kind: "tiny" });
  soft(c, S0(194, 170, 41, 23, r), grad("#E9F4F0", "#CBE6DF"), { op: 0.9, seed: 7, kind: "tiny", edge: false });
  soft(c, S0(186, 164, 14, 6, r), "#FFFFFF", { op: 0.6, seed: 8, kind: "tiny", edge: false });
  c.shape(stemPath(straw, 8, 7), { fill: TP.coral, op: 0.85, kind: "stem", seed: 9 });
  for (let i = 1; i < 6; i++) {
    const p = bez(straw, i * 0.16);
    c.line(`M${f(p.x - p.ty * 4)} ${f(p.y + p.tx * 4)}L${f(p.x + p.ty * 4)} ${f(p.y - p.tx * 4)}`, { stroke: "#FFFFFF", w: 3, op: 0.7, seed: 10 + i });
  }
  return c;
}
const S0 = (cx, cy, rx, ry, r) => blob(cx, cy, rx, r, { rough: 0.02, n: 30, sy: ry / rx });

function shell() {
  const r = rng(247);
  const c = new Canvas(270, 240, r);
  const O = [135, 214], R = 176, N = 9, a0 = -166, a1 = -14;
  const edgeR = (u) => R * (0.9 + 0.1 * Math.abs(Math.sin(N * Math.PI * u)));
  const pts = [[O[0] - 14, O[1] + 2]];
  for (let i = 0; i <= 90; i++) {
    const u = i / 90, a = (a0 + (a1 - a0) * u) * DEG;
    pts.push([O[0] + Math.cos(a) * edgeR(u), O[1] + Math.sin(a) * edgeR(u) * 0.78]);
  }
  pts.push([O[0] + 14, O[1] + 2]);
  soft(c, smooth(pts), grad("#FCE6DA", "#E9AB9C"), { op: 0.82, seed: 1, axis: [O[0], O[1], O[0], O[1] - 150] });
  for (let k = 0; k <= N; k++) {
    const u = k / N, a = (a0 + (a1 - a0) * u) * DEG;
    const er = R * 0.9 * 0.99;
    c.line(`M${f(O[0] + Math.cos(a) * 16)} ${f(O[1] + Math.sin(a) * 12)}L${f(O[0] + Math.cos(a) * er)} ${f(O[1] + Math.sin(a) * er * 0.78)}`, { stroke: "#CF8575", w: 1.8, op: 0.42, seed: 2 + k });
  }
  for (const k of [0.42, 0.68]) {
    const arc = Array.from({ length: 24 }, (_, i) => {
      const a = (a0 + 8 + ((a1 - a0 - 16) * i) / 23) * DEG;
      return [O[0] + Math.cos(a) * R * k, O[1] + Math.sin(a) * R * k * 0.78];
    });
    c.line(smooth(arc, false), { stroke: "#CF8575", w: 1.3, op: 0.28, seed: 20 + Math.round(k * 10) });
  }
  soft(c, smooth([[104, 198], [166, 198], [158, 226], [112, 226]]), grad("#F5E7C9", "#D3B27C"), { op: 0.85, seed: 3, kind: "tiny" });
  soft(c, blob(112, 124, 18, r, { rough: 0.12, n: 14, sx: 0.5, sy: 1.5 }), "#FFFFFF", { op: 0.3, seed: 4, kind: "tiny", edge: false });
  return c;
}

function umbrella() {
  const r = rng(251);
  const c = new Canvas(350, 420, r);
  const S = frame(-11, 170, 384);
  const cx = 170, apex = [cx, 62], R = 124, N = 6;
  const by = (x) => 172 + 9 * ((x - cx) / R) ** 2;
  // palo
  c.shape(stemPath([[cx, 168], [cx, 260], [cx, 330], [cx, 392]].map(S.P), 8, 6), { fill: TP.brown, op: 0.85, kind: "stem", seed: 1 });
  const ex = (k) => cx - R + (2 * R * k) / N;
  const rib = (k, t) => {
    const E = [ex(k), by(ex(k))];
    const out = Math.sign(E[0] - cx) * 0.2 * Math.abs(E[0] - cx) * Math.sin(Math.PI * t);
    return [apex[0] + (E[0] - apex[0]) * t + out, apex[1] + (E[1] - apex[1]) * t ** 0.85];
  };
  for (let k = 0; k < N; k++) {
    const q = [];
    for (let i = 0; i <= 8; i++) q.push(rib(k, i / 8));
    const A = [ex(k), by(ex(k))], B = [ex(k + 1), by(ex(k + 1))];
    for (let i = 1; i < 8; i++) {
      const u = i / 8;
      q.push([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - 11 * Math.sin(Math.PI * u)]);
    }
    for (let i = 8; i >= 0; i--) q.push(rib(k + 1, i / 8));
    const odd = k % 2;
    soft(c, smooth(S.pts(q)), odd ? grad("#FCF3DE", "#F0E0BA") : grad(TP.coral[0], TP.coralDeep[1]), { op: odd ? 0.8 : 0.76, seed: 2 + k, kind: "paper" });
  }
  soft(c, S.ell(cx, 56, 5, 11), TP.brown[1], { op: 0.8, seed: 9, kind: "tiny" });
  // duna con conchitas
  soft(c, blob(172, 396, 80, r, { rough: 0.05, sy: 0.15 }), grad(TP.sand[0], TP.sand[1]), { op: 0.82, seed: 3, kind: "wash", edge: false });
  dots(c, [[120, 392, 2.6], [214, 400, 2.2], [236, 392, 3]], TP.coral[1], 0.7, 6);
  return c;
}

function wave() {
  const r = rng(257);
  const c = new Canvas(340, 250, r);
  // ola menor, detrás
  soft(c, smooth([[170, 236], [196, 196], [236, 176], [278, 184], [320, 214], [330, 238]]), grad("#CBE9E3", "#86C2BC"), { op: 0.7, seed: 1, kind: "heart", edge: true });
  // cuerpo principal
  const body = [[8, 238], [14, 176], [40, 112], [90, 64], [150, 42], [206, 46], [248, 72], [262, 106], [244, 128], [222, 118], [200, 100], [172, 98], [152, 118], [156, 156], [182, 196], [230, 216], [290, 238]];
  soft(c, smooth(body), grad("#A9DAD3", "#4C9693"), { op: 0.8, seed: 2, axis: [20, 240, 250, 60], kind: "heart" });
  // vetas
  for (const [a, b, d] of [[[24, 220], [52, 140], [118, 82]], [[40, 232], [84, 156], [160, 100]]]) {
    c.line(smooth([a, b, d], false), { stroke: "#2F7C7C", w: 2, op: 0.3, seed: 5 });
  }
  c.line(smooth([[70, 222], [118, 170], [166, 150]], false), { stroke: "#FFFFFF", w: 2.4, op: 0.5, seed: 7 });
  // espuma de la cresta
  const foam = [[262, 108, 16], [240, 82, 20], [214, 62, 17], [182, 52, 15], [150, 50, 14], [250, 130, 9], [226, 112, 10]];
  foam.forEach(([x, y, rr], i) => soft(c, blob(x, y, rr, r, { rough: 0.2, n: 14 }), "#FFFFFF", { op: 0.88, seed: 8 + i, kind: "tiny", edge: false }));
  dots(c, [[290, 70, 3.4], [276, 54, 2.6], [302, 94, 2.4], [262, 40, 2.4], [284, 118, 2], [312, 80, 2]], "#FFFFFF", 0.9, 4);
  // espuma al pie
  soft(c, blob(210, 232, 40, r, { rough: 0.1, n: 16, sy: 0.18 }), "#FFFFFF", { op: 0.7, seed: 9, kind: "wash", edge: false });
  return c;
}

function sun() {
  const r = rng(259);
  const c = new Canvas(300, 300, r);
  soft(c, blob(150, 150, 124, r, { rough: 0.1, n: 30 }), grad(TP.sun[0], TP.coral[0]), { op: 0.34, seed: 1, kind: "wash", edge: false });
  const N = 14;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * 360 - 90 + 5;
    const a = ang * DEG;
    const len = i % 2 ? 36 : 54;
    const lf = leaf({ x: 150 + Math.cos(a) * 80, y: 150 + Math.sin(a) * 80, ang, len, wid: 17, prof: "lance", n: 10 });
    soft(c, lf.d, grad(TP.sun[0], "#EBB868"), { op: 0.7, seed: 2 + (i % 5), kind: "petal", axis: [lf.base[0], lf.base[1], lf.tip[0], lf.tip[1]] });
  }
  soft(c, blob(150, 150, 68, r, { rough: 0.03, n: 30 }), grad("#FDEFC0", "#F0C768"), { op: 0.86, seed: 3, axis: [96, 96, 204, 204] });
  soft(c, blob(138, 134, 40, r, { rough: 0.06, n: 20 }), "#FFFFFF", { op: 0.34, seed: 4, kind: "wash", edge: false });
  return c;
}

function hibiscus() {
  const r = rng(263);
  const c = new Canvas(310, 310, r);
  const cx = 154, cy = 158, R = 118;
  for (const ang of [58, 122]) {
    const lf = leaf({ x: cx, y: cy + 10, ang, len: 112, wid: 52, prof: "ovate", bend: ang < 90 ? -0.12 : 0.12, n: 16 });
    paintLeaf(c, lf, { pal: TP.palm, op: 0.7, seed: ang, nVeins: 5, tone: 0.2 });
  }
  for (let i = 0; i < 5; i++) {
    const ang = -90 + i * 72 + r.range(-4, 4);
    const lf = leaf({ x: cx, y: cy, ang, len: R * r.range(0.92, 1.04), wid: R * r.range(0.78, 0.88), bend: r.range(-0.05, 0.05), prof: "petal", asym: r.range(-0.08, 0.08), n: 16 });
    soft(c, lf.d, grad("#E2877A", "#F9D5CB"), { op: 0.78, kind: "petal", seed: 1 + i, axis: [lf.base[0], lf.base[1], lf.tip[0], lf.tip[1]] });
    c.line(lf.mid, { stroke: "#C9685E", w: 1.1, op: 0.3, seed: 6 + i });
  }
  soft(c, blob(cx, cy, 26, r, { rough: 0.12, n: 18 }), "#D96D67", { op: 0.55, seed: 4, kind: "tiny" });
  // columna de estambres
  const col = [[cx, cy], [cx + 16, cy - 20], [cx + 34, cy - 40], [cx + 50, cy - 56]];
  c.shape(stemPath(col, 5, 3.4), { fill: ["#E58F82", "#D6766B"], op: 0.85, kind: "stem", seed: 8, axis: [cx, cy, cx + 50, cy - 56] });
  const p1 = bez(col, 1);
  const pol = [];
  for (let i = 0; i < 9; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(2, 10);
    pol.push([p1.x + Math.cos(a) * d, p1.y + Math.sin(a) * d, r.range(2, 3.4)]);
  }
  dots(c, pol, "#E9BF62", 0.9, 9);
  return c;
}

/* --------------------------------- manchas --------------------------------- */
function wash(seed, w, h, layers) {
  const r = rng(seed);
  const c = new Canvas(w, h, r);
  layers.forEach(([cx, cy, rad, pal, op, rough, sx = 1, sy = 1], i) => {
    c.shape(blob(cx, cy, rad, r, { rough, n: 30, sx, sy }), { fill: pal, axis: [cx - rad, cy - rad, cx + rad, cy + rad], op, kind: "wash", seed: 1 + ((seed + i) % 5) });
  });
  return c;
}
const washAqua = () => wash(271, 400, 340, [[200, 170, 125, TP.aqua, 0.66, 0.3, 1.15, 0.92], [225, 190, 86, TP.aquaDeep, 0.3, 0.28], [150, 140, 60, TP.sky, 0.34, 0.3]]);
const washSand = () => wash(277, 400, 340, [[200, 170, 125, TP.sand, 0.7, 0.3, 1.1, 0.95], [170, 160, 85, TP.coral, 0.28, 0.26], [240, 210, 58, TP.sun, 0.34, 0.3]]);

// kind: wash (manchas), tall (se anclan a los bordes laterales), low (esquinas de abajo) y
// small (detalles sueltos). Lo usa src/components/honeymoon/travel-layout.ts.
export const TRAVEL_MOTIFS = [
  { name: "wash-aqua", alpha: 70, kind: "wash", down: 0.7, build: washAqua },
  { name: "wash-sand", alpha: 70, kind: "wash", down: 0.7, build: washSand },
  { name: "palm", kind: "tall", down: 0.9, build: palm },
  { name: "umbrella", kind: "tall", down: 0.9, build: umbrella },
  { name: "suitcase", kind: "tall", down: 0.9, build: suitcase },
  { name: "sun", alpha: 55, kind: "low", build: sun },
  { name: "wave", kind: "low", build: wave },
  { name: "shell", kind: "low", build: shell },
  { name: "coconut", kind: "low", build: coconut },
  { name: "hibiscus", kind: "low", down: 0.92, build: hibiscus },
  { name: "passport", kind: "small", build: passport },
  { name: "id-card", kind: "small", build: idCard },
  { name: "boarding-pass", kind: "small", build: boardingPass },
  { name: "stamp", kind: "small", build: stamp },
  { name: "compass", kind: "small", build: compass },
  { name: "camera", kind: "small", build: camera },
  { name: "map", kind: "small", build: map },
  { name: "airplane", kind: "small", build: airplane },
];
