import "server-only";

import { cookies } from "next/headers";

import { LANG_KEY, normalizeLang, type Lang } from "./config";

/**
 * Idioma de la petición actual (cookie `tubodadiy-lang`, por defecto español).
 * Solo para server components, generateMetadata y route handlers. Leer cookies
 * hace dinámica la ruta (el layout raíz ya lo hace, así que toda la app lo es).
 */
export async function getRequestLang(): Promise<Lang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_KEY)?.value);
}
