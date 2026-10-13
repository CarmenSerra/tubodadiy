import { backdropImages, motifCornerUrls, type InvitationBackground } from "@/components/invitation/invitation-backgrounds";
import type { InvitationStyle } from "@/components/invitation/invitation-model";
import { LEGACY_COLORS, buildTheme, type InvitationTheme } from "@/components/invitation/invitation-theme";

// Fondos de la tarjeta (rayas, lunares, flores, motivos…) pintados en el lienzo de
// «Reserva la fecha». Las imágenes salen de los mismos generadores SVG que usa
// la invitación, con los colores de la paleta, así que se ven igual en las dos.

/** Escala de los motivos respecto a la página de la invitación (la tarjeta es más pequeña que una pantalla). */
const TILE_SCALE = 1.5;

const images = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  let cached = images.get(src);
  if (!cached) {
    cached = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    // La caché no crece sin límite: los colores cambian mucho al elegir paleta.
    if (images.size > 40) images.delete(images.keys().next().value as string);
    images.set(src, cached);
  }
  return cached;
}

const ready = new Map<string, HTMLImageElement>();

function themeOf(style: InvitationStyle): InvitationTheme {
  return buildTheme(style.palette?.colors ?? LEGACY_COLORS[style.template], style.template);
}

/** Descarga las imágenes del fondo elegido; hay que esperarla antes de `drawSaveTheDate`. */
export async function loadBackdrop(style: InvitationStyle): Promise<void> {
  const corners = motifCornerUrls(style.background);
  const urls = corners ? [corners.a, corners.b] : backdropImages(style.background, themeOf(style));
  const loaded = await Promise.all(urls.map(loadImage));
  urls.forEach((url, i) => {
    const img = loaded[i];
    if (img) ready.set(url, img);
  });
}

/** Pinta el fondo sobre el color base. Sin imágenes cargadas (o con fondo liso) no hace nada. */
export function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  kind: InvitationBackground | undefined,
  theme: InvitationTheme,
  width: number,
  height: number
) {
  if (!kind || kind === "plain") return;

  const corners = motifCornerUrls(kind);
  if (corners) {
    paintMotif(ctx, ready.get(corners.a), ready.get(corners.b), width, height);
    return;
  }

  const urls = backdropImages(kind, theme);
  const imgs = urls.map((u) => ready.get(u));
  ctx.save();

  if (kind === "floral") {
    // Una ramita a cada lado (la segunda está ya reflejada) y un marco fino.
    const [left, right] = imgs;
    const w = (left?.naturalWidth ?? 64) * TILE_SCALE;
    const h = (left?.naturalHeight ?? 360) * TILE_SCALE;
    for (let y = 0; y < height; y += h) {
      if (left) ctx.drawImage(left, -20 * TILE_SCALE, y, w, h);
      if (right) ctx.drawImage(right, width - w + 20 * TILE_SCALE, y, w, h);
    }
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(22, 22, width - 44, height - 44, 36);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Azulejos que se repiten (el de «papel» lleva además un degradado de CSS que aquí no hace falta).
  const tile = imgs[imgs.length - 1];
  if (tile) {
    const pattern = ctx.createPattern(tile, "repeat");
    if (pattern) {
      pattern.setTransform(new DOMMatrix().scale(kind === "paper" ? 1 : TILE_SCALE));
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
  }
  ctx.restore();
}

/**
 * Ramas de acuarela en las cuatro esquinas: la grande arriba a la izquierda y
 * abajo a la derecha, la corta (reflejada) en las otras dos, como en la invitación.
 */
function paintMotif(
  ctx: CanvasRenderingContext2D,
  a: HTMLImageElement | undefined,
  b: HTMLImageElement | undefined,
  width: number,
  height: number
) {
  const big = width * 0.42;
  const small = width * 0.36;
  const draw = (img: HTMLImageElement | undefined, w: number, x: number, y: number, sx: number, sy: number) => {
    if (!img) return;
    const h = (w * img.naturalHeight) / img.naturalWidth;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  };
  draw(a, big, 0, 0, 1, 1);
  draw(b, small, width, 0, -1, 1);
  draw(b, small, 0, height, 1, -1);
  draw(a, big, width, height, -1, -1);
}
