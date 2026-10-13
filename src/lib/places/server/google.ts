import "server-only";

import { communityOf, normalizeProvince } from "../spain";
import type { PlaceDetails } from "../types";

const BASE = "https://places.googleapis.com/v1";
const TIMEOUT_MS = 8000;

/** Máscara de Place Details: Essentials + Pro + Enterprise (teléfono y web). */
export const DETAILS_MASK =
  "id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,websiteUri,primaryType";

export class GoogleError extends Error {
  /** Estado HTTP que devolvemos nosotros al cliente. */
  status: number;
  /** Clave de vendors:places.errors.<code>; el idioma lo pone quien responde (jsonError). */
  code: string;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export interface RawAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

export interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: RawAddressComponent[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  primaryType?: string;
  types?: string[];
}

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new GoogleError("notConfigured", 503);
  return key;
}

/** Llamada a Places API (New). Nunca registra ni devuelve la clave. */
export async function googleFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; mask: string; body?: unknown }
): Promise<T> {
  const key = apiKey();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": init.mask,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new GoogleError("googleTimeout", 504);
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: { status?: string; message?: string } };
      detail = `${body.error?.status ?? ""} ${body.error?.message ?? ""}`.trim();
    } catch {
      // sin cuerpo
    }
    console.error(`Places API ${init.method} ${path.split("?")[0]} -> ${res.status} ${detail}`.replaceAll(key, "***"));
    if (res.status === 404) throw new GoogleError("placeNotFound", 404);
    if (res.status === 400) throw new GoogleError("googleBadRequest", 400);
    if (res.status === 429) throw new GoogleError("tooManyRequests", 429);
    throw new GoogleError("googleUnavailable", 502);
  }
  return (await res.json()) as T;
}

function comp(components: RawAddressComponent[], type: string): string {
  return components.find((c) => c.types?.includes(type))?.longText?.trim() ?? "";
}

/** Municipio y provincia/comunidad/país a partir de los componentes de dirección. */
export function geoFromComponents(components: RawAddressComponent[] = []): {
  municipality: string;
  province: string;
  community: string;
  country: string;
} {
  const municipality =
    comp(components, "locality") ||
    comp(components, "postal_town") ||
    comp(components, "administrative_area_level_3") ||
    comp(components, "sublocality") ||
    "";
  const level1 = comp(components, "administrative_area_level_1");
  const level2 = comp(components, "administrative_area_level_2");
  const country = comp(components, "country");

  // Provincia: nivel 2 (Granada, Madrid…). Si no hay, p. ej. comunidades uniprovinciales en nivel 1.
  const province = (level2 && normalizeProvince(level2)) || (level1 && normalizeProvince(level1)) || level2;
  const community = (province && communityOf(province)) || level1 || "";
  return { municipality, province: province || "", community, country };
}

export function toPlaceDetails(raw: RawPlace): PlaceDetails | null {
  if (!raw.id) return null;
  const geo = geoFromComponents(raw.addressComponents);
  return {
    placeId: raw.id,
    name: raw.displayName?.text?.trim() ?? "",
    address: raw.formattedAddress?.trim() ?? "",
    phone: raw.nationalPhoneNumber?.trim() ?? "",
    website: raw.websiteUri?.trim() ?? "",
    ...geo,
    primaryType: raw.primaryType ?? "",
  };
}
