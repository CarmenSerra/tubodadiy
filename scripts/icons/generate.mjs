// Genera los iconos de la app a partir de scripts/icons/mark.mjs.
//
//   node scripts/icons/generate.mjs [--sheet ruta.png]
//
// Salida:
//   src/app/icon1.svg          SVG que cambia con prefers-color-scheme (pestaña)
//   src/app/icon2.png          32×32 claro (alternativa para navegadores sin SVG)
//   src/app/apple-icon.png     180×180 claro, a sangre (iOS aplica su propia máscara)
//   src/app/favicon.ico        16/32/48 claro
//   public/icons/…             variantes fijas clara/oscura que usa ThemeFavicon
//                              (src/components/theme-favicon.tsx) para seguir el
//                              tema de la app, no solo el del sistema
// Cada tamaño se rasteriza directamente desde el SVG con Chromium (no se reduce
// uno grande), así los trazos finos quedan nítidos a 16 y 32 px.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { svgAdaptive, svgFor } from "./mark.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = path.join(ROOT, "src/app");
const PUB = path.join(ROOT, "public/icons");
const sheetArg = process.argv.indexOf("--sheet");
const sheetPath = sheetArg > -1 ? process.argv[sheetArg + 1] : undefined;

await mkdir(PUB, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ deviceScaleFactor: 1 });

const dataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** PNG transparente de `svg` a `size` px. */
async function png(svg, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}img{display:block}</style><img src="${dataUrl(svg)}" width="${size}" height="${size}">`
  );
  return page.screenshot({ type: "png", omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

/** ICO con PNG incrustados (válido desde Windows Vista y en todos los navegadores). */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const o = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, o);
    head.writeUInt8(size >= 256 ? 0 : size, o + 1);
    head.writeUInt16LE(1, o + 4); // planos
    head.writeUInt16LE(32, o + 6); // bits por píxel
    head.writeUInt32LE(data.length, o + 8);
    head.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.data)]);
}

const out = {};
for (const variant of ["light", "dark"]) {
  const svg = svgFor(variant);
  out[variant] = { svg, p16: await png(svg, 16), p32: await png(svg, 32), p48: await png(svg, 48) };
  await writeFile(path.join(PUB, `icon-${variant}.svg`), svg);
  await writeFile(path.join(PUB, `icon-${variant}-32.png`), out[variant].p32);
  await writeFile(
    path.join(PUB, `favicon-${variant}.ico`),
    ico([
      { size: 16, data: out[variant].p16 },
      { size: 32, data: out[variant].p32 },
      { size: 48, data: out[variant].p48 },
    ])
  );
}

await writeFile(path.join(APP, "icon1.svg"), svgAdaptive());
await writeFile(path.join(APP, "icon2.png"), out.light.p32);
await writeFile(path.join(APP, "favicon.ico"), await readIco("light"));
await writeFile(path.join(APP, "apple-icon.png"), await png(svgFor("light", { tile: "full" }), 180));

async function readIco(variant) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path.join(PUB, `favicon-${variant}.ico`));
}

if (sheetPath) {
  // Hoja de prueba: 16/32/64/180 sobre fondos tipo pestaña clara y oscura, y el SVG adaptativo
  // bajo prefers-color-scheme claro y oscuro.
  const sizes = [16, 32, 64, 180];
  const row = (label, bg, fg, svg) => `
    <section style="background:${bg};color:${fg}">
      <h2>${label}</h2>
      <div class="r">${sizes.map((s) => `<figure><img src="${dataUrl(svg)}" width="${s}" height="${s}"><figcaption>${s}</figcaption></figure>`).join("")}
        <div class="tab" style="background:${bg === "#ffffff" ? "#f1f3f4" : "#35363a"}"><img src="${dataUrl(svg)}" width="16" height="16"><span>tubodadiy — Organiza tu boda</span></div>
      </div>
    </section>`;
  const html = `<style>
    body{margin:0;font:13px system-ui,sans-serif;width:900px}
    section{padding:14px 20px}h2{margin:0 0 10px;font-size:13px;font-weight:600}
    .r{display:flex;gap:28px;align-items:flex-end}figure{margin:0;text-align:center}figcaption{margin-top:6px;opacity:.7}
    .tab{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px 8px 0 0;font-size:12px;margin-left:12px;align-self:flex-end}
    img{image-rendering:auto}
  </style>
  ${row("Claro — pestaña clara", "#ffffff", "#202124", out.light.svg)}
  ${row("Oscuro — pestaña oscura", "#202124", "#e8eaed", out.dark.svg)}
  ${row("Claro sobre pestaña oscura (tema app claro, sistema oscuro)", "#202124", "#e8eaed", out.light.svg)}
  ${row("Oscuro sobre pestaña clara (tema app oscuro, sistema claro)", "#ffffff", "#202124", out.dark.svg)}`;
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.setContent(html);
  await page.screenshot({ path: sheetPath, fullPage: true });
}

await browser.close();
console.log("Iconos generados.");
