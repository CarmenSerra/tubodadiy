import type { NextRequest } from "next/server";

import { normalizeProvince } from "@/lib/places/spain";
import { geoFromComponents, GoogleError, googleFetch, type RawPlace } from "@/lib/places/server/google";
import { json, jsonError, requireUser } from "@/lib/places/server/http";
import type { VenueResult } from "@/lib/places/types";

/**
 * Máscara de lista: solo campos de Text Search Pro (5.000 gratis al mes). `types` y `primaryType`
 * son Pro; `rating` es Enterprise y haría pasar TODA la petición a Enterprise (1.000 gratis),
 * por eso no se pide. Sin teléfono ni web.
 */
const SEARCH_MASK =
  "places.id,places.displayName,places.addressComponents,places.primaryType,places.types,nextPageToken";

const VENUE_TYPES = new Set(["wedding_venue", "event_venue", "banquet_hall"]);
const LODGING_PRIMARY = new Set([
  "hotel",
  "lodging",
  "resort_hotel",
  "bed_and_breakfast",
  "guest_house",
  "hostel",
  "motel",
  "inn",
  "extended_stay_hotel",
  "farmstay",
  "cottage",
  "campground",
  "apartment_building",
  "apartment_complex",
  "spa",
]);
const OUTDOOR_PRIMARY = new Set(["garden", "farm", "park", "ranch", "vineyard", "winery", "historical_landmark", "castle"]);

/** Descarta hoteles, almacenes, etc.; conserva fincas, salones y espacios de eventos. */
function isRelevantVenue(place: RawPlace): boolean {
  const types = place.types ?? [];
  const primary = place.primaryType ?? "";
  const isVenue = types.some((t) => VENUE_TYPES.has(t));
  if (LODGING_PRIMARY.has(primary)) return types.includes("wedding_venue");
  return isVenue || OUTDOOR_PRIMARY.has(primary);
}

const GENERIC_TYPES = new Set(["service", "point_of_interest", "establishment"]);

/** Tipo para la ilustración: el principal, salvo que sea genérico ("service") y haya uno de recinto. */
function venueKind(place: RawPlace): string {
  const primary = place.primaryType ?? "";
  if (primary && !GENERIC_TYPES.has(primary)) return primary;
  return (place.types ?? []).find((t) => VENUE_TYPES.has(t)) ?? primary;
}

interface SearchResponse {
  places?: RawPlace[];
  nextPageToken?: string;
}

export async function GET(request: NextRequest) {
  const denied = await requireUser(request);
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const province = normalizeProvince(params.get("province") ?? "");
  if (!province) return jsonError(400, "chooseProvince");
  const style = (params.get("style") ?? "").replace(/[^\p{L}\p{N} ,'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  const pageToken = (params.get("pageToken") ?? "").trim();
  if (pageToken && !/^[A-Za-z0-9_=+/-]{10,4000}$/.test(pageToken)) return jsonError(400, "invalidPage");

  const textQuery = `finca para bodas en ${province}${style ? ` ${style}` : ""}`;
  try {
    const data = await googleFetch<SearchResponse>("/places:searchText", {
      method: "POST",
      mask: SEARCH_MASK,
      body: {
        textQuery,
        languageCode: "es",
        regionCode: "ES",
        pageSize: 20,
        ...(pageToken ? { pageToken } : {}),
      },
    });
    const places: VenueResult[] = [];
    for (const raw of data.places ?? []) {
      if (!raw.id || !isRelevantVenue(raw)) continue;
      const geo = geoFromComponents(raw.addressComponents);
      places.push({
        placeId: raw.id,
        name: raw.displayName?.text?.trim() ?? "",
        municipality: geo.municipality,
        province: geo.province || province,
        primaryType: venueKind(raw),
      });
    }
    return json({ places, ...(data.nextPageToken ? { nextPageToken: data.nextPageToken } : {}) });
  } catch (error) {
    if (error instanceof GoogleError) return jsonError(error.status, error.code);
    return jsonError(500, "searchFailed");
  }
}
