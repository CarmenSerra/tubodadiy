import type { NextRequest } from "next/server";

import { DETAILS_MASK, GoogleError, googleFetch, toPlaceDetails, type RawPlace } from "@/lib/places/server/google";
import { json, jsonError, requireUser } from "@/lib/places/server/http";

const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/;
const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;

export async function GET(request: NextRequest) {
  const denied = await requireUser(request);
  if (denied) return denied;

  const placeId = request.nextUrl.searchParams.get("placeId") ?? "";
  const session = request.nextUrl.searchParams.get("session") ?? "";
  if (!PLACE_ID_RE.test(placeId)) return jsonError(400, "Identificador de lugar no válido.");
  if (session && !SESSION_RE.test(session)) return jsonError(400, "Sesión de búsqueda no válida.");

  const qs = new URLSearchParams({ languageCode: "es", regionCode: "ES" });
  if (session) qs.set("sessionToken", session);
  try {
    const raw = await googleFetch<RawPlace>(`/places/${placeId}?${qs.toString()}`, {
      method: "GET",
      mask: DETAILS_MASK,
    });
    const place = toPlaceDetails(raw);
    if (!place) return jsonError(404, "No encontramos ese lugar en Google Maps.");
    return json({ place });
  } catch (error) {
    if (error instanceof GoogleError) {
      // Un ID inexistente o caducado llega de Google como 400/404.
      if (error.status === 400) return jsonError(404, "No encontramos ese lugar en Google Maps.");
      return jsonError(error.status, error.message);
    }
    return jsonError(500, "No se pudo obtener el lugar.");
  }
}
