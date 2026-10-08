import type { PlanGift } from "@/lib/types";

/** Texto de ejemplo para el mensaje a invitados (sin género). */
export const GIFT_MESSAGE_EXAMPLE =
  "Vuestra presencia es el mejor regalo. Si queréis tener un detalle con nosotros, lo recibiremos con mucho cariño en forma de aportación para estrenar esta nueva etapa.";

export const GIFT_MESSAGE_MAX = 280;

/** IBAN sin espacios y en mayúsculas. */
export function normalizeIban(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** IBAN en grupos de cuatro: «ES91 2100 0418 4502 0005 1332». */
export function formatIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})(?=.)/g, "$1 ");
}

/**
 * IBAN con todo oculto salvo el país, el dígito de control y los cuatro
 * últimos: «ES91 •••• •••• •••• •••• 1332».
 */
export function maskIban(value: string): string {
  const iban = normalizeIban(value);
  if (iban.length <= 8) return formatIban(iban);
  const masked = iban
    .split("")
    .map((char, i) => (i < 4 || i >= iban.length - 4 ? char : "•"))
    .join("");
  return masked.replace(/(.{4})(?=.)/g, "$1 ");
}

/** Resto de dividir el IBAN reordenado entre 97 (debe ser 1), sin números enormes. */
function mod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder;
}

/** Mensaje de error de un IBAN, o `null` si es válido (o está vacío). */
export function ibanError(value: string): string | null {
  const iban = normalizeIban(value);
  if (!iban) return null;
  if (!/^[A-Z]{2}\d{2}/.test(iban)) {
    return "El IBAN empieza por dos letras y dos números, por ejemplo ES91 2100…";
  }
  if (iban.startsWith("ES") && iban.length !== 24) {
    return "Un IBAN español tiene 24 caracteres: ES y 22 números.";
  }
  if (iban.length < 15 || iban.length > 34 || !/^[A-Z0-9]+$/.test(iban)) {
    return "Este IBAN no tiene la longitud habitual. Revísalo.";
  }
  if (mod97(iban) !== 1) return "Revisa el IBAN: algún número no cuadra.";
  return null;
}

/** Bizum: nueve cifras de móvil (6 o 7 al inicio), con o sin prefijo +34. */
export function normalizeBizum(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("34")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("0034")) return digits.slice(4);
  return digits;
}

export function formatBizum(value: string): string {
  const digits = normalizeBizum(value);
  return digits.length === 9 ? digits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : digits;
}

export function bizumError(value: string): string | null {
  const digits = normalizeBizum(value);
  if (!digits) return null;
  if (!/^[67]\d{8}$/.test(digits)) {
    return "Escribe un móvil español de 9 cifras que empiece por 6 o 7.";
  }
  return null;
}

/** ¿Hay forma de recibir dinero (IBAN o Bizum)? Lo que marca la tarea del paso. */
export function giftHasPaymentData(gift: Pick<PlanGift, "iban" | "bizum"> | null | undefined): boolean {
  return Boolean(gift && (gift.iban.trim() || gift.bizum.trim()));
}
