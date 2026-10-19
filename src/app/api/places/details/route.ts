import type { NextRequest } from "next/server";

import { DETAILS_MASK, GoogleError, googleFetch, toPlaceDetails, type RawPlace } from "@/lib/places/server/google";
import { authenticate, json, jsonError } from "@/lib/places/server/http";
import { lookupPlace } from "@/lib/places/server/lookups";

const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/;
const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ("denied" in auth) return auth.denied;

  const placeId = request.nextUrl.searchParams.get("placeId") ?? "";
  const session = request.nextUrl.searchParams.get("session") ?? "";
  if (!PLACE_ID_RE.test(placeId)) return jsonError(400, "invalidPlaceId");
  if (session && !SESSION_RE.test(session)) return jsonError(400, "invalidSession");

  const qs = new URLSearchParams({ languageCode: "es", regionCode: "ES" });
  if (session) qs.set("sessionToken", session);
  try {
    // Una consulta a Google por persona y lugar cada 30 días; el resto sale de lo guardado.
    const place = await lookupPlace(auth.uid, placeId, async () => {
      const raw = await googleFetch<RawPlace>(`/places/${placeId}?${qs.toString()}`, {
        method: "GET",
        mask: DETAILS_MASK,
      });
      return toPlaceDetails(raw);
    });
    if (!place) return jsonError(404, "placeNotFound");
    return json({ place });
  } catch (error) {
    if (error instanceof GoogleError) {
      // Un ID inexistente o caducado llega de Google como 400/404.
      if (error.status === 400) return jsonError(404, "placeNotFound");
      return jsonError(error.status, error.code);
    }
    return jsonError(500, "placeFailed");
  }
}
