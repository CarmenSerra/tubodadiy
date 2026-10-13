import "server-only";

import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { getRequestLang } from "@/lib/i18n/request";
import { getServerT } from "@/lib/i18n/server";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/**
 * Respuesta de error con el texto ya traducido al idioma de la petición (cookie del
 * idioma). `code` es una clave de vendors:places.errors.<code>.
 */
export async function jsonError(status: number, code: string): Promise<Response> {
  const t = getServerT(await getRequestLang(), "vendors");
  return json({ error: t(`places.errors.${code}`) }, status);
}

/**
 * Exige un ID token de Firebase válido en `Authorization: Bearer`.
 * Devuelve `null` si todo va bien o la respuesta de error lista para devolver.
 */
export async function requireUser(request: Request): Promise<Response | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return jsonError(401, "signInRequired");
  if (!isFirebaseAdminConfigured) {
    return jsonError(503, "verifyUnavailable");
  }
  try {
    await getAdminAuth().verifyIdToken(match[1]);
    return null;
  } catch {
    return jsonError(401, "sessionExpired");
  }
}
