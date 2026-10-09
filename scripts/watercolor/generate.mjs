// Genera los motivos de acuarela de public/decor/*.webp y el manifiesto TS.
//
//   node scripts/watercolor/generate.mjs [--only nombre,nombre] [--sheet ruta.png] [--quality 74]
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "public/decor");
const MANIFEST = path.join(ROOT, "src/components/brand/watercolor-assets.ts");

const arg = (k) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const only = arg("only")?.split(",");
const sheetPath = arg("sheet");
const quality = Number(arg("quality") ?? 55);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ deviceScaleFactor: 1 });

const results = [];
let total = 0;
for (const m of MOTIFS) {
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

if (!only) {
  const body = results
    .map((r) => `  "${r.name}": { w: ${r.w}, h: ${r.h}, kind: "${r.kind}" },`)
    .join("\n");
  await writeFile(
    MANIFEST,
    `// Generado por scripts/watercolor/generate.mjs: no editar a mano.
// Dimensiones (px) de los WebP de public/decor y su familia.
export type WatercolorKind = "branch" | "leaf" | "flower" | "ring" | "heart" | "wash" | "mini";

export const WATERCOLOR = {
${body}
} as const satisfies Record<string, { w: number; h: number; kind: WatercolorKind }>;

export type WatercolorName = keyof typeof WATERCOLOR;
`,
  );
}

if (sheetPath) {
  const imgs = await Promise.all(results.map(async (r) => (await readFile(path.join(OUT, r.name + ".webp"))).toString("base64")));
  const items = results
    .map((r, i) => `<figure><img src="data:image/webp;base64,${imgs[i]}" width="${r.w}" height="${r.h}"><figcaption>${r.name} · ${(r.size / 1024).toFixed(1)} KB</figcaption></figure>`)
    .join("");
  const mk = (bg, fg, filter) => `<section style="background:${bg};color:${fg}"><div class="g" style="${filter}">${items}</div></section>`;
  const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:12px sans-serif}section{padding:16px}.g{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}
figure{margin:0;text-align:center}figcaption{margin-top:4px;opacity:.6}</style>
${mk("#f4f1eb", "#2e3d34", "")}${mk("#38384d", "#e8e4f0", "")}${mk("#38384d", "#e8e4f0", "filter:brightness(1.35) saturate(.9)")}`;
  const sp = await browser.newPage({ viewport: { width: 1500, height: 800 } });
  await sp.setContent(html, { waitUntil: "load" });
  await sp.screenshot({ path: sheetPath, fullPage: true });
}
await browser.close();
