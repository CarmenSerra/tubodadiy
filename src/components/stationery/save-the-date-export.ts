import {
  CARD_H,
  CARD_W,
  drawSaveTheDate,
  loadCardFonts,
  readCardFonts,
} from "@/components/stationery/save-the-date-render";
import type { SaveTheDateDesign } from "@/lib/firebase/designs";

// Exportar la tarjeta: PNG (el canvas tal cual) y PDF (un PDF mínimo escrito a
// mano con la imagen a página completa). Sin dependencias.

/** 5 × 7 pulgadas a 300 ppp. */
export const EXPORT_WIDTH = 1500;
const EXPORT_HEIGHT = Math.round((EXPORT_WIDTH * CARD_H) / CARD_W);
/** Tamaño de la página del PDF en puntos (5 × 7 in). */
const PDF_W = 360;
const PDF_H = 504;

async function renderToCanvas(design: SaveTheDateDesign): Promise<HTMLCanvasElement> {
  const fonts = readCardFonts();
  await loadCardFonts(fonts, design);
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  drawSaveTheDate(canvas, design, fonts);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo crear la imagen"))), type, quality);
  });
}

export async function createPng(design: SaveTheDateDesign): Promise<Blob> {
  return toBlob(await renderToCanvas(design), "image/png");
}

/** PDF de una página de 5 × 7 in con la tarjeta como imagen JPEG de calidad alta. */
export async function createPdf(design: SaveTheDateDesign, title: string): Promise<Blob> {
  const canvas = await renderToCanvas(design);
  const jpeg = new Uint8Array(await (await toBlob(canvas, "image/jpeg", 0.95)).arrayBuffer());
  return buildPdf(jpeg, canvas.width, canvas.height, title);
}

function buildPdf(jpeg: Uint8Array, width: number, height: number, title: string): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: Uint8Array | string) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (n: number, body: () => void) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body();
    push("\nendobj\n");
  };

  // Título en UTF-16BE (PDFDocEncoding no cubre todos los acentos de forma segura).
  const hexTitle = title.split("")
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("")
    .toUpperCase();

  push("%PDF-1.4\n%âãÏÓ\n");
  object(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2, () => push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  object(3, () =>
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_W} ${PDF_H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
    )
  );
  object(4, () => {
    push(
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
    );
    push(jpeg);
    push("\nendstream");
  });
  const content = `q ${PDF_W} 0 0 ${PDF_H} 0 0 cm /Im0 Do Q`;
  object(5, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  object(6, () => push(`<< /Title <FEFF${hexTitle}> /Producer (tubodadiy) >>`));

  const xref = length;
  push(`xref\n0 7\n0000000000 65535 f \n`);
  for (let n = 1; n <= 6; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

/** Descarga un archivo generado en el navegador. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Margen para que el navegador empiece la descarga antes de liberar el objeto.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Enlace de WhatsApp con el texto ya escrito (abre la app o WhatsApp Web). */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
