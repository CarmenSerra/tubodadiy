// Foto de perfil ligera: recorte cuadrado centrado, 128 px, WebP ≤ 15 KB.
// Se guarda como data URL en users/{uid}.avatarUrl (sin Firebase Storage).

export const AVATAR_SIZE = 128;
export const AVATAR_MAX_BYTES = 15 * 1024;
export class AvatarError extends Error {}

const MIN_QUALITY = 0.3;
const MIN_SIZE = 64;

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Cae al <img> (formatos que createImageBitmap no abre).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } catch {
    throw new AvatarError("decode");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new AvatarError("read"));
    reader.readAsDataURL(blob);
  });
}

/** Recorta al cuadrado central, reduce a 128 px y codifica en WebP ≤ 15 KB. */
export async function compressAvatar(file: Blob): Promise<string> {
  if (!file.type.startsWith("image/")) throw new AvatarError("not-image");
  const { source, width, height, close } = await decode(file);
  try {
    if (!width || !height) throw new AvatarError("decode");
    const side = Math.min(width, height);
    const sx = (width - side) / 2;
    const sy = (height - side) / 2;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new AvatarError("canvas");

    let best: Blob | null = null;
    for (let size = AVATAR_SIZE; size >= MIN_SIZE; size = Math.round(size * 0.8)) {
      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = "#ffffff"; // sin transparencias: evita fondos negros
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
      for (let quality = 0.85; quality >= MIN_QUALITY - 1e-6; quality -= 0.15) {
        // Si el navegador no codifica WebP devuelve PNG: entonces JPEG.
        let blob = await toBlob(canvas, "image/webp", quality);
        if (blob && blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
        if (!blob) throw new AvatarError("encode");
        best = blob;
        if (blob.size <= AVATAR_MAX_BYTES) return toDataUrl(blob);
      }
    }
    if (!best) throw new AvatarError("encode");
    return toDataUrl(best);
  } finally {
    close();
  }
}
