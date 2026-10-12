import "server-only";

import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function jsonError(status: number, message: string): Response {
  return json({ error: message }, status);
}

/**
 * Exige un ID token de Firebase válido en `Authorization: Bearer`.
 * Devuelve `null` si todo va bien o la respuesta de error lista para devolver.
 */
export async function requireUser(request: Request): Promise<Response | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return jsonError(401, "Inicia sesión para usar la búsqueda de Google Maps.");
  if (!isFirebaseAdminConfigured) {
    return jsonError(503, "El servidor no puede verificar tu sesión en este momento.");
  }
  try {
    await getAdminAuth().verifyIdToken(match[1]);
    return null;
  } catch {
    return jsonError(401, "Tu sesión ha caducado. Vuelve a iniciar sesión e inténtalo de nuevo.");
  }
}
