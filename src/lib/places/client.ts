"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";

import type { PlaceDetails, PlaceSuggestion, VenueResult } from "./types";

/**
 * Error de las llamadas a /api/places. Los que vienen del servidor traen el mensaje ya traducido
 * (el servidor lee el idioma de la cookie). Los generados aquí llevan solo un `code`
 * (vendors:places.errors.<code>) y ningún componente los enseña tal cual: se traducen al mostrarlos.
 */
export class PlacesError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PlacesError";
    this.status = status;
    this.code = code;
  }
}

/** Token de sesión para agrupar el autocompletado y el detalle posterior (facturación de Google). */
export function newPlacesSession(): string {
  return crypto.randomUUID();
}

async function authHeader(): Promise<Record<string, string>> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new PlacesError("signIn", 401, "signIn");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

async function call<T>(path: string, params: Record<string, string | undefined>, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const headers = await authHeader();
  let res: Response;
  try {
    res = await fetch(`/api/places/${path}?${qs.toString()}`, { headers, cache: "no-store", signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new PlacesError("network", 0, "network");
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // cuerpo vacío o no JSON
  }
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : null;
    throw message ? new PlacesError(message, res.status) : new PlacesError("generic", res.status, "generic");
  }
  return body as T;
}

export async function placesAutocomplete(q: string, session: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const data = await call<{ suggestions: PlaceSuggestion[] }>("autocomplete", { q, session }, signal);
  return data.suggestions ?? [];
}

export async function placeDetails(placeId: string, session?: string): Promise<PlaceDetails> {
  const data = await call<{ place: PlaceDetails }>("details", { placeId, session });
  return data.place;
}

/** Email y foto (og:image) de la web del proveedor; vacío si no se pudo leer. */
export async function siteInfo(url: string, placeId?: string): Promise<{ email?: string; image?: string }> {
  try {
    // Con `placeId`, el servidor anota el email en la consulta guardada de ese lugar.
    return await call<{ email?: string; image?: string }>("site", { url, placeId });
  } catch {
    return {};
  }
}

/** Datos del lugar a partir de un enlace de Google Maps (también cortos); null si no se encuentra. */
export async function resolveMapsLink(url: string): Promise<PlaceDetails | null> {
  const data = await call<{ place: PlaceDetails | null }>("resolve", { url });
  return data.place ?? null;
}

export async function searchVenues(
  province: string,
  style?: string,
  pageToken?: string
): Promise<{ places: VenueResult[]; nextPageToken?: string }> {
  return call<{ places: VenueResult[]; nextPageToken?: string }>("search", { province, style, pageToken });
}

/** Enlace para abrir el lugar en Google Maps (sin guardar coordenadas). */
export function mapsUrlForPlace(placeId: string, name?: string): string {
  const query = encodeURIComponent(name?.trim() || "Google Maps");
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(placeId)}`;
}
