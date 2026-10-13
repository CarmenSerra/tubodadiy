import i18next, { type i18n } from "i18next";

import { DEFAULT_LANG, LANGUAGES, NAMESPACES, type Lang } from "./config";
import { RESOURCES } from "./resources";

/**
 * Crea una instancia de i18next NUEVA (nunca un singleton: en el servidor un
 * singleton se compartiría entre peticiones de distintos idiomas). Los textos
 * son estáticos, así que se inicializa de forma síncrona.
 *
 * Reglas: español = idioma por defecto y de reserva; interpolación {{name}}
 * sin escape (React ya escapa); plurales con _one/_other (JSON v4).
 */
export function createI18n(lang: Lang = DEFAULT_LANG): i18n {
  const instance = i18next.createInstance();
  void instance.init({
    resources: RESOURCES,
    lng: lang,
    fallbackLng: DEFAULT_LANG,
    supportedLngs: LANGUAGES.map((l) => l.code),
    ns: [...NAMESPACES],
    defaultNS: "common",
    fallbackNS: "common",
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });
  return instance;
}
