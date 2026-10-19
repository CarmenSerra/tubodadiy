// Descarga de ficheros generados en el navegador. Solo cliente.

import { DEFAULT_LANG, normalizeLang, type Lang } from "@/lib/i18n/config";

/** Descarga `data` como fichero. No hace nada en el servidor. */
export function downloadBlob(filename: string, data: BlobPart, mime: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Margen para que el navegador empiece a descargar antes de soltar la URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Hoy como `yyyy-MM-dd` (hora local), para los nombres de fichero. */
export function dateStamp(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** `base-2027-06-12.ext`: nombre de fichero seguro (sin tildes ni espacios). */
export function exportFileName(base: string, ext: string, now: Date = new Date()): string {
  const safe = base
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safe || "tubodadiy"}-${dateStamp(now)}.${ext}`;
}

/**
 * Idioma de la interfaz leído de `<html lang>` (lo fija el servidor desde la
 * cookie). Sirve para que las funciones de exportar funcionen sin pasar `lang`.
 */
export function currentLang(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  return normalizeLang(document.documentElement.lang);
}
