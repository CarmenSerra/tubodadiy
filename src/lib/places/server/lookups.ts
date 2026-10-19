import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import type { PlaceDetails } from "@/lib/places/types";

/**
 * «Una consulta por persona y guardar el resultado»: cada consulta de detalles de Google queda en
 * `placeLookups/{uid}/items/{placeId}` (solo Admin SDK; las reglas lo cierran al cliente). Si la
 * misma persona vuelve a pedir el mismo lugar antes de 30 días se devuelve lo guardado sin llamar
 * a Google. Nunca se guardan coordenadas ni fotos de Google.
 */

/** Cuánto vale lo guardado antes de volver a preguntar a Google. */
export const LOOKUP_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/;

function itemRef(uid: string, placeId: string) {
  return getAdminDb().collection("placeLookups").doc(uid).collection("items").doc(placeId);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Los fallos de Firestore nunca rompen la consulta: se registra solo el código, sin datos. */
function warn(action: string, error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "error";
  console.warn(`placeLookups ${action} failed (${code})`);
}

interface SavedLookup {
  place: PlaceDetails;
  /** ¿Sigue dentro de los 30 días? */
  fresh: boolean;
}

/** Lo guardado de esta persona para este lugar, o null (no hay, o no se pudo leer). */
export async function readLookup(uid: string, placeId: string): Promise<SavedLookup | null> {
  if (!PLACE_ID_RE.test(placeId)) return null;
  try {
    const snap = await itemRef(uid, placeId).get();
    const data = snap.data();
    if (!data) return null;
    const fetchedAt = data.fetchedAt instanceof Timestamp ? data.fetchedAt.toMillis() : 0;
    const email = text(data.email);
    const place: PlaceDetails = {
      placeId: text(data.placeId) || placeId,
      name: text(data.name),
      address: text(data.address),
      phone: text(data.phone),
      website: text(data.website),
      municipality: text(data.municipality),
      province: text(data.province),
      community: text(data.community),
      country: text(data.country),
      primaryType: text(data.primaryType),
      ...(email ? { email } : {}),
    };
    return { place, fresh: fetchedAt > 0 && Date.now() - fetchedAt < LOOKUP_TTL_MS };
  } catch (error) {
    warn("read", error);
    return null;
  }
}

/**
 * Guarda el resultado de una consulta a Google. Si la web no ha cambiado se conserva el email
 * extraído antes (`previous`).
 */
export async function saveLookup(
  uid: string,
  key: string,
  place: PlaceDetails,
  previous?: PlaceDetails | null
): Promise<void> {
  if (!PLACE_ID_RE.test(key)) return;
  const email = place.email || (previous && previous.website === place.website ? previous.email : "") || "";
  try {
    await itemRef(uid, key).set({
      placeId: place.placeId,
      name: place.name,
      address: place.address,
      phone: place.phone,
      website: place.website,
      email,
      municipality: place.municipality,
      province: place.province,
      community: place.community,
      country: place.country,
      primaryType: place.primaryType,
      fetchedAt: Timestamp.now(),
    });
  } catch (error) {
    warn("save", error);
  }
}

/** Anota el email extraído de la web del lugar, solo si esta persona ya consultó ese lugar. */
export async function saveLookupEmail(uid: string, placeId: string, email: string): Promise<void> {
  if (!PLACE_ID_RE.test(placeId) || !email) return;
  try {
    await itemRef(uid, placeId).update({ email });
  } catch (error) {
    // NOT_FOUND (5): no hay consulta guardada; no es un error.
    if (!(error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === 5)) {
      warn("email", error);
    }
  }
}

/**
 * Detalles de un lugar para esta persona: lo guardado si tiene menos de 30 días; si no, se llama
 * a Google (`fetchFromGoogle`) y se guarda el resultado.
 */
export async function lookupPlace(
  uid: string,
  placeId: string,
  fetchFromGoogle: () => Promise<PlaceDetails | null>
): Promise<PlaceDetails | null> {
  const saved = await readLookup(uid, placeId);
  if (saved?.fresh) return saved.place;
  const place = await fetchFromGoogle();
  // Se guarda con el ID pedido (Google puede devolver uno renovado): así la próxima vez acierta.
  if (place) await saveLookup(uid, placeId, place, saved?.place);
  return place;
}
