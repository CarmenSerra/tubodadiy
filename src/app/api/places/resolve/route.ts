import type { NextRequest } from "next/server";

import { followMapsLink, isGoogleMapsHost, parseMapsUrl } from "@/lib/places/server/maps-link";
import {
  DETAILS_MASK,
  GoogleError,
  googleFetch,
  toPlaceDetails,
  type RawPlace,
} from "@/lib/places/server/google";
import { json, jsonError, requireUser } from "@/lib/places/server/http";
import type { PlaceDetails } from "@/lib/places/types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function GET(request: NextRequest) {
  const denied = await requireUser(request);
  if (denied) return denied;

  const raw = (request.nextUrl.searchParams.get("url") ?? "").trim();
  let start: URL;
  try {
    start = new URL(raw);
  } catch {
    return jsonError(400, "El enlace no es válido.");
  }
  if (raw.length > 2048 || (start.protocol !== "https:" && start.protocol !== "http:") || !isGoogleMapsHost(start.hostname)) {
    return jsonError(400, "Pega un enlace de Google Maps (por ejemplo, de «Compartir» en la app).");
  }

  try {
    const finalUrl = await followMapsLink(start.href);
    if (!finalUrl) return json({ place: null });
    const target = parseMapsUrl(finalUrl);

    let place: PlaceDetails | null = null;
    if (target.placeId) {
      const raw = await googleFetch<RawPlace>(`/places/${target.placeId}?languageCode=es&regionCode=ES`, {
        method: "GET",
        mask: DETAILS_MASK,
      }).catch((error) => {
        if (error instanceof GoogleError && (error.status === 404 || error.status === 400)) return null;
        throw error;
      });
      place = raw ? toPlaceDetails(raw) : null;
    }
    if (!place && target.name) {
      const data = await googleFetch<{ places?: RawPlace[] }>("/places:searchText", {
        method: "POST",
        mask: DETAILS_MASK.split(",").map((f) => `places.${f}`).join(","),
        body: {
          textQuery: target.name,
          languageCode: "es",
          regionCode: "ES",
          pageSize: 3,
          ...(target.lat !== undefined && target.lng !== undefined
            ? { locationBias: { circle: { center: { latitude: target.lat, longitude: target.lng }, radius: 500 } } }
            : {}),
        },
      });
      const candidates = data.places ?? [];
      const wanted = normalize(target.name);
      const best =
        candidates.find((p) => {
          const n = normalize(p.displayName?.text ?? "");
          return n && (n === wanted || n.includes(wanted) || wanted.includes(n));
        }) ?? (target.lat !== undefined ? candidates[0] : undefined);
      place = best ? toPlaceDetails(best) : null;
    }
    return json({ place });
  } catch (error) {
    if (error instanceof GoogleError) return jsonError(error.status, error.message);
    return jsonError(500, "No se pudo leer el enlace.");
  }
}
