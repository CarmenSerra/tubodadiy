import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { RESOURCES } from "@/lib/i18n/resources";
import { getServerT } from "@/lib/i18n/server";

// Los textos viven en src/locales/<lang>/errors.json (clave `firebase.<código>`).
const KNOWN_CODES = RESOURCES[DEFAULT_LANG].errors.firebase;

/**
 * Mensaje (en el idioma pedido, por defecto español) para un error de
 * Firebase. Nunca se devuelve el texto original del SDK (viene en inglés): lo
 * no reconocido cae en un mensaje genérico.
 */
export function getFirebaseErrorMessage(error: unknown, lang: Lang = DEFAULT_LANG): string {
  const t = getServerT(lang, "errors");
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    // Los códigos de Firestore llegan a veces como "firestore/unavailable".
    const bare = code.replace(/^firestore\//, "");
    for (const candidate of [code, bare]) {
      if (candidate in KNOWN_CODES) return t(`firebase.${candidate}`);
    }
  }
  return t("firebase.unknown");
}
