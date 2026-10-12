// Compresión de fotos en el navegador: lado mayor ~400 px, WebP, ≤ ~30 KB.
// El resultado es un data URI que se guarda en el propio documento del proveedor.

export const PHOTO_MAX_SIDE = 400;
export const PHOTO_TARGET_BYTES = 30 * 1024;

const MIN_QUALITY = 0.35;
const QUALITY_STEP = 0.1;
const SHRINK_FACTOR = 0.85;
const MIN_SIDE = 160;

export class ImageCompressError extends Error {}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Cae al <img> (p. ej. formatos que createImageBitmap no abre).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } catch {
    throw new ImageCompressError("No se ha podido leer la imagen.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ImageCompressError("No se ha podido leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Reduce la imagen a ~400 px de lado mayor y la codifica en WebP bajando la
 * calidad (y, si hace falta, el tamaño) hasta que pese ≤ 30 KB.
 * Devuelve un data URI `data:image/webp;base64,…`.
 */
export async function compressImageToDataUri(
  file: Blob,
  { maxSide = PHOTO_MAX_SIDE, targetBytes = PHOTO_TARGET_BYTES }: { maxSide?: number; targetBytes?: number } = {}
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new ImageCompressError("El archivo no es una imagen.");
  const { source, width, height, close } = await decode(file);
  try {
    if (!width || !height) throw new ImageCompressError("No se ha podido leer la imagen.");
    let scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageCompressError("Tu navegador no puede procesar la imagen.");

    let best: Blob | null = null;
    for (;;) {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      ctx.fillStyle = "#ffffff"; // sin transparencias: evita fondos negros al pasar a WebP/JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

      for (let quality = 0.8; quality >= MIN_QUALITY - 1e-6; quality -= QUALITY_STEP) {
        // Si el navegador no sabe codificar WebP devuelve PNG: entonces se usa JPEG.
        let blob = await toBlob(canvas, "image/webp", quality);
        if (blob && blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
        if (!blob) throw new ImageCompressError("No se ha podido comprimir la imagen.");
        best = blob;
        if (blob.size <= targetBytes) return blobToDataUri(blob);
      }

      const longest = Math.max(canvas.width, canvas.height);
      if (longest <= MIN_SIDE) break;
      scale *= SHRINK_FACTOR;
    }
    if (!best) throw new ImageCompressError("No se ha podido comprimir la imagen.");
    return blobToDataUri(best);
  } finally {
    close();
  }
}
