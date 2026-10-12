import "server-only";

const GOOGLE_HOST_RE = /(^|\.)google\.(com|es|[a-z]{2,3}|com\.[a-z]{2}|co\.[a-z]{2})$/i;
const SHORT_HOST_RE = /(^|\.)goo\.gl$/i;
const MAX_HOPS = 6;
const HOP_TIMEOUT_MS = 4000;

/** Solo hosts de Google/goo.gl: así el servidor nunca sigue enlaces a sitios arbitrarios (SSRF). */
export function isGoogleMapsHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return GOOGLE_HOST_RE.test(h) || SHORT_HOST_RE.test(h);
}

export interface MapsTarget {
  /** ID de lugar si el enlace lo trae explícito. */
  placeId?: string;
  name?: string;
  lat?: number;
  lng?: number;
}

function validCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function cleanName(raw: string): string | undefined {
  let value = raw.replace(/\+/g, " ");
  try {
    value = decodeURIComponent(value);
  } catch {
    // tal cual
  }
  value = value.replace(/\s+/g, " ").trim();
  if (!value || value.length > 200) return undefined;
  // Un par de coordenadas no es un nombre.
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value)) return undefined;
  return value;
}

/** Saca nombre, coordenadas o placeId de una URL de Google Maps ya resuelta. */
export function parseMapsUrl(url: URL): MapsTarget {
  const target: MapsTarget = {};
  const sp = url.searchParams;

  const qpid = sp.get("query_place_id") ?? sp.get("place_id");
  if (qpid && /^[A-Za-z0-9_-]{10,300}$/.test(qpid)) target.placeId = qpid;
  const q = sp.get("q") ?? sp.get("query") ?? sp.get("destination");
  if (q) {
    const m = /^place_id:([A-Za-z0-9_-]{10,300})$/.exec(q);
    if (m) target.placeId ??= m[1];
    else target.name = cleanName(q);
  }

  const path = url.pathname;
  const place = /\/maps\/place\/([^/]+)/.exec(path) ?? /\/maps\/search\/([^/]+)/.exec(path);
  if (place && !target.name) target.name = cleanName(place[1]);

  // !3d<lat>!4d<lng> es el punto exacto del lugar; @lat,lng es solo el centro de la vista.
  const exact = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(path + url.hash);
  const view = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(path);
  const ll = sp.get("ll") ?? sp.get("center");
  const pair = exact
    ? [Number(exact[1]), Number(exact[2])]
    : view
      ? [Number(view[1]), Number(view[2])]
      : ll && /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(ll)
        ? ll.split(",").map(Number)
        : null;
  if (pair && validCoord(pair[0], pair[1])) {
    target.lat = pair[0];
    target.lng = pair[1];
  }
  return target;
}

/**
 * Sigue manualmente (máx. 6 saltos) un enlace de Maps, también corto, comprobando en cada salto
 * que el host sea de Google. Devuelve la URL final o null si no se puede resolver.
 */
export async function followMapsLink(rawUrl: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    if (!isGoogleMapsHost(url.hostname)) return null;
    // Página de consentimiento de cookies (UE): el destino real va en `continue`.
    if (url.hostname === "consent.google.com" || url.hostname === "consent.google.es") {
      const next = url.searchParams.get("continue");
      if (!next) return null;
      try {
        url = new URL(next);
      } catch {
        return null;
      }
      continue;
    }
    if (!SHORT_HOST_RE.test(url.hostname)) {
      // Si la URL ya trae el nombre o el ID del lugar no hace falta pedirla a Google.
      const info = parseMapsUrl(url);
      if (info.placeId || info.name) return url;
    }

    let res: Response;
    try {
      res = await fetch(url.href, {
        method: "GET",
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TuBodaDIYBot/1.0)", "Accept-Language": "es-ES,es;q=0.9" },
        signal: AbortSignal.timeout(HOP_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      return null;
    }
    const location = res.headers.get("location");
    void res.body?.cancel().catch(() => {});
    if (res.status >= 300 && res.status < 400 && location) {
      try {
        url = new URL(location, url);
      } catch {
        return null;
      }
      continue;
    }
    // Sin más redirecciones: esta es la URL final.
    return url;
  }
  return null;
}
