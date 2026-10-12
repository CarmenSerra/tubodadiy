// Genera los motivos de acuarela de public/decor/*.webp y el manifiesto TS.
//
//   node scripts/watercolor/generate.mjs [--set main|travel] [--only nombre,nombre] [--sheet ruta.png] [--quality 55]
//
//   --set main    (por defecto) motivos de la boda -> public/decor + watercolor-assets.ts
//   --set travel  batería de viaje de la Luna de miel -> public/decor/travel + travel-assets.ts
//
// Pinta cada motivo como SVG con filtros (feTurbulence + feDisplacementMap para los
// bordes, pigmento acumulado, moteado y grano), lo rasteriza con Chromium sobre fondo
// transparente y lo comprime a WebP con sharp. La app solo sirve los WebP: nada de
// filtros SVG en tiempo de ejecución.
import { mkdir, writeFile, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import { MOTIFS } from "./motifs.mjs";
import { TRAVEL_MOTIFS } from "./motifs-travel.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const arg = (k) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const only = arg("only")?.split(",");
const sheetPath = arg("sheet");
const setName = arg("set") ?? "main";
const quality = Number(arg("quality") ?? 55);

const header = (what, kinds) => `// Generado por scripts/watercolor/generate.mjs: no editar a mano.
// Dimensiones (px) de los WebP de ${what} y su familia.
export type ${kinds.type} = ${kinds.union};
`;
const entries = (results) => results.map((r) => `  "${r.name}": { w: ${r.w}, h: ${r.h}, kind: "${r.kind}" },`).join("\n");

const SETS = {
  main: {
    motifs: MOTIFS,
    out: path.join(ROOT, "public/decor"),
    manifest: path.join(ROOT, "src/components/brand/watercolor-assets.ts"),
    sheetBg: [["#f4f1eb", "#2e3d34"], ["#38384d", "#e8e4f0"]],
    render: (results) => `${header("public/decor", { type: "WatercolorKind", union: '"branch" | "leaf" | "flower" | "ring" | "heart" | "wash" | "mini"' })}
export const WATERCOLOR = {
${entries(results)}
} as const satisfies Record<string, { w: number; h: number; kind: WatercolorKind }>;

export type WatercolorName = keyof typeof WATERCOLOR;
`,
  },
  travel: {
    motifs: TRAVEL_MOTIFS,
    out: path.join(ROOT, "public/decor/travel"),
    manifest: path.join(ROOT, "src/components/honeymoon/travel-assets.ts"),
    sheetBg: [["#f3f2ea", "#27464a"], ["#2f3f46", "#eef3ee"]],
    render: (results) => `${header("public/decor/travel", { type: "TravelKind", union: '"wash" | "tall" | "low" | "small"' })}
export const TRAVEL = {
${entries(results)}
} as const satisfies Record<string, { w: number; h: number; kind: TravelKind }>;

export type TravelName = keyof typeof TRAVEL;
`,
  },
};
const SET = SETS[setName];
if (!SET) throw new Error(`--set desconocido: ${setName} (main | travel)`);
const OUT = SET.out;
const MANIFEST = SET.manifest;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ deviceScaleFactor: 1 });

const results = [];
let total = 0;
for (const m of SET.motifs) {
  if (only && !only.includes(m.name)) continue;
  const c = m.build();
  await page.setViewportSize({ width: c.w, height: c.h });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${c.svg()}</body></html>`);
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: c.w, height: c.h } });
  const file = path.join(OUT, `${m.name}.webp`);
  const down = m.down ?? 1;
  const W = Math.round(c.w * down), H = Math.round(c.h * down);
  let img = sharp(png);
  if (down !== 1) img = img.resize(W, H, { kernel: "lanczos3" });
  await img.webp({ quality, alphaQuality: m.alpha ?? Math.max(30, quality - 15), effort: 6, smartSubsample: true }).toFile(file);
  const size = (await stat(file)).size;
  total += size;
  results.push({ name: m.name, kind: m.kind, w: W, h: H, size });
  console.log(`${m.name.padEnd(26)} ${W}x${H}  ${(size / 1024).toFixed(1)} KB`);
}
console.log(`total ${(total / 1024).toFixed(1)} KB`);

if (!only) await writeFile(MANIFEST, SET.render(results));

if (sheetPath) {
  const imgs = await Promise.all(results.map(async (r) => (await readFile(path.join(OUT, r.name + ".webp"))).toString("base64")));
  const items = results
    .map((r, i) => `<figure><img src="data:image/webp;base64,${imgs[i]}" width="${r.w}" height="${r.h}"><figcaption>${r.name} · ${(r.size / 1024).toFixed(1)} KB</figcaption></figure>`)
    .join("");
  const mk = (bg, fg, filter) => `<section style="background:${bg};color:${fg}"><div class="g" style="${filter}">${items}</div></section>`;
  const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:12px sans-serif}section{padding:16px}.g{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}
figure{margin:0;text-align:center}figcaption{margin-top:4px;opacity:.6}</style>
${mk(...SET.sheetBg[0], "")}${mk(...SET.sheetBg[1], "")}${mk(...SET.sheetBg[1], "filter:brightness(1.3) saturate(.9)")}`;
  const sp = await browser.newPage({ viewport: { width: 1500, height: 800 } });
  await sp.setContent(html, { waitUntil: "load" });
  await sp.screenshot({ path: sheetPath, fullPage: true });
}
await browser.close();
