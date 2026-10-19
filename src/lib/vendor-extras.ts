import type { Vendor, VendorContact, VendorDocument, VendorDocumentType } from "@/lib/types";

// Campos opcionales de la ficha de proveedor (contactos, documentos, qué incluye, valoración,
// pros y contras). Lógica pura, sin React ni Firebase: la comparten el mapeo de Firestore y la UI.

export const VENDOR_DOCUMENT_TYPES: readonly VendorDocumentType[] = ["contract", "quote", "invoice", "other"];

const MAX_ITEMS = 30;

function str(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Id corto para contactos y documentos nuevos. */
export function newExtraId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function mapContacts(raw: unknown): VendorContact[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .slice(0, MAX_ITEMS)
    .map((r, i) => ({
      id: str(r.id, 40) || `c${i}`,
      name: str(r.name, 120),
      role: str(r.role, 120),
      phone: str(r.phone, 60),
      email: str(r.email, 200),
    }))
    .filter((c) => c.name || c.phone || c.email);
  return list.length > 0 ? list : undefined;
}

function mapDocuments(raw: unknown): VendorDocument[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .slice(0, MAX_ITEMS)
    .map((r, i): VendorDocument => ({
      id: str(r.id, 40) || `d${i}`,
      type: (VENDOR_DOCUMENT_TYPES as readonly unknown[]).includes(r.type) ? (r.type as VendorDocumentType) : "other",
      title: str(r.title, 160),
      url: str(r.url, 2048),
      date: typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : "",
      signed: r.signed === true,
      notes: str(r.notes, 1000),
    }))
    .filter((d) => d.title || d.url);
  return list.length > 0 ? list : undefined;
}

/**
 * Campos nuevos de un proveedor guardado → modelo. Solo se incluyen los que tienen valor (nunca
 * `undefined`, que Firestore rechaza al volver a guardar, p. ej. al deshacer un borrado), así que
 * los proveedores anteriores a esta ficha se leen igual que siempre.
 */
export function mapVendorExtras(
  data: Record<string, unknown>
): Partial<Pick<Vendor, "contacts" | "documents" | "includes" | "rating" | "pros" | "cons">> {
  const out: Partial<Pick<Vendor, "contacts" | "documents" | "includes" | "rating" | "pros" | "cons">> = {};
  const contacts = mapContacts(data.contacts);
  if (contacts) out.contacts = contacts;
  const documents = mapDocuments(data.documents);
  if (documents) out.documents = documents;
  for (const key of ["includes", "pros", "cons"] as const) {
    const value = typeof data[key] === "string" ? (data[key] as string).trim().slice(0, 2000) : "";
    if (value) out[key] = value;
  }
  const rating = data.rating;
  if (typeof rating === "number" && Number.isInteger(rating) && rating >= 1 && rating <= 5) out.rating = rating;
  return out;
}

/** Líneas no vacías de un texto (una cosa por línea; admite viñetas «-», «•» o «*» al inicio). */
export function splitLines(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*·]\s*/, "").trim())
    .filter(Boolean);
}
