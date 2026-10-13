import type { TFunction } from "i18next";

import { createI18n } from "./create";
import { DEFAULT_LANG, type Lang, type Namespace } from "./config";

const cache = new Map<Lang, ReturnType<typeof createI18n>>();

/**
 * `t` fijo a un idioma y un namespace, leyendo los MISMOS JSON que el cliente.
 * Sirve en server components, route handlers, generateMetadata y también en
 * funciones puras de cliente (formateadores…) que reciban `lang` por parámetro.
 * No depende de React ni de next/headers; para saber el idioma de la petición
 * usa getRequestLang() de "@/lib/i18n/request".
 *
 *   const t = getServerT(lang, "auth");
 *   t("login.title");
 */
export function getServerT(lang: Lang = DEFAULT_LANG, ns: Namespace = "common"): TFunction {
  let instance = cache.get(lang);
  if (!instance) {
    instance = createI18n(lang);
    cache.set(lang, instance);
  }
  // getFixedT no cambia el idioma de la instancia compartida.
  return instance.getFixedT(lang, ns) as TFunction;
}
