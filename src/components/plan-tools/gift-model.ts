import type { GiftMode, PlanGift } from "@/lib/types";

/** Texto de ejemplo para el mensaje a invitados (sin género). */
export const GIFT_MESSAGE_EXAMPLE =
  "Vuestra presencia es el mejor regalo. Si queréis tener un detalle con nosotros, lo recibiremos con mucho cariño en forma de aportación para estrenar esta nueva etapa.";

/** Texto de ejemplo para el mensaje cuando el regalo es una lista de cosas. */
export const GIFT_LIST_MESSAGE_EXAMPLE =
  "Lo que más ilusión nos hace es compartir este día con vosotros. Si queréis tener un detalle, hemos preparado una lista con cosas que nos vendrán muy bien en casa; no hace falta regalar nada de ella.";

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

// ---- Modo de regalo (dinero o lista) ----

export const GIFT_MODES: GiftMode[] = ["money", "list"];

/** Regalo vacío del modo elegido: lo que se guarda al decidir cómo recibirlo. */
export function emptyGift(mode: GiftMode): PlanGift {
  return { mode, iban: "", bizum: "", message: "", listMessage: "", showOnInvitation: false };
}

/** Lee el regalo guardado en el plan. Sin `mode` (regalos anteriores a la lista) es dinero. */
export function mapGift(raw: unknown): PlanGift | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    mode: data.mode === "list" ? "list" : "money",
    iban: text(data.iban),
    bizum: text(data.bizum),
    message: text(data.message),
    listMessage: text(data.listMessage),
    showOnInvitation: data.showOnInvitation === true,
  };
}

/** ¿Ya han elegido cómo recibir el regalo? Marca «Decidir cómo recibir el regalo». */
export function giftDecided(gift: PlanGift | null | undefined): boolean {
  return Boolean(gift);
}

/**
 * ¿Hay ya algo que dar a los invitados? Dinero: IBAN o Bizum. Lista: al menos
 * una cosa. Lo que marca «Añadir los datos para el regalo».
 */
export function giftHasData(gift: PlanGift | null | undefined, itemCount: number): boolean {
  if (!gift) return false;
  return gift.mode === "list" ? itemCount > 0 : giftHasPaymentData(gift);
}

// ---- Lista de cosas ----

export type GiftPriority = "high" | "medium" | "low";

export const GIFT_PRIORITIES: { id: GiftPriority; label: string; hint: string }[] = [
  { id: "high", label: "Imprescindible", hint: "Lo necesitamos pronto" },
  { id: "medium", label: "Nos vendría bien", hint: "Útil, sin prisa" },
  { id: "low", label: "Capricho", hint: "Un extra que nos haría ilusión" },
];

export const isGiftPriority = (value: unknown): value is GiftPriority =>
  value === "high" || value === "medium" || value === "low";

export const giftPriorityLabel = (priority: GiftPriority) =>
  GIFT_PRIORITIES.find((p) => p.id === priority)?.label ?? "";

/** Una cosa de la lista de regalos: `weddingPlans/{planId}/giftItems/{id}`. */
export interface GiftItem {
  id: string;
  name: string;
  /** Enlace http(s) a la tienda o al producto; vacío si no hay. */
  link: string;
  /** Precio aproximado en euros. */
  price: number | null;
  note: string;
  priority: GiftPriority | null;
  /** «Ya lo tenemos»: conseguido (no se enseña a los invitados). */
  achieved: boolean;
  createdAt: number | null;
}

export type GiftItemInput = Omit<GiftItem, "id" | "createdAt" | "achieved">;

export const GIFT_ITEM_LIMITS = { name: 100, link: 400, note: 200, price: 1_000_000 } as const;

/** Orden de la lista: pendientes primero, por prioridad y luego por antigüedad; lo conseguido al final. */
export function sortGiftItems<T extends Pick<GiftItem, "achieved" | "priority" | "createdAt">>(items: T[]): T[] {
  const rank = (p: GiftPriority | null) => (p === "high" ? 0 : p === "medium" ? 1 : p === "low" ? 2 : 3);
  return [...items].sort(
    (a, b) =>
      Number(a.achieved) - Number(b.achieved) ||
      rank(a.priority) - rank(b.priority) ||
      (a.createdAt ?? Number.MAX_SAFE_INTEGER) - (b.createdAt ?? Number.MAX_SAFE_INTEGER)
  );
}

/** Cuántas quedan por conseguir y cuánto sumarían, de forma aproximada. */
export function giftListSummary(items: Pick<GiftItem, "achieved" | "price">[]) {
  const pending = items.filter((i) => !i.achieved);
  return {
    total: items.length,
    achieved: items.length - pending.length,
    pending: pending.length,
    pendingPrice: pending.reduce((sum, i) => sum + (i.price ?? 0), 0),
  };
}

/** Ideas para empezar una lista vacía (rellenan el nombre al añadir). */
export const GIFT_ITEM_SUGGESTIONS = [
  "Juego de sábanas",
  "Set de toallas",
  "Robot de cocina",
  "Vajilla",
  "Cafetera",
  "Aspirador robot",
];
