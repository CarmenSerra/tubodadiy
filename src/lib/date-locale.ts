import type { Locale } from "date-fns";
import { enGB, es } from "date-fns/locale";

import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";

/**
 * Locale de date-fns para cada idioma de la app (calendarios, nombres de mes y
 * de día). Al añadir un idioma, añade aquí su locale de `date-fns/locale`.
 */
const DATE_FNS_LOCALES: Record<Lang, Locale> = { es, en: enGB };

export function dateFnsLocale(lang: Lang = DEFAULT_LANG): Locale {
  return DATE_FNS_LOCALES[lang] ?? es;
}
