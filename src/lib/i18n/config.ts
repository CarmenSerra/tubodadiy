// Configuración común de idiomas (sin dependencias de React ni de Next: sirve
// igual en cliente, servidor y scripts). Para añadir un idioma nuevo, ver
// docs/i18n.md: carpeta en src/locales/<código>/, registro en resources.ts y
// una entrada en LANGUAGES.

export interface LanguageInfo {
  /** Código corto que se guarda y se usa como carpeta de src/locales. */
  code: string;
  /** Nombre en su propio idioma (para listas y lectores de pantalla). */
  name: string;
  /** Etiqueta corta del selector. */
  short: string;
  /** Locale BCP-47 que se pasa a Intl (fechas, moneda, números). */
  locale: string;
}

/** Idiomas disponibles. El primero es el idioma por defecto y de reserva. */
export const LANGUAGES = [
  { code: "es", name: "Español", short: "ES", locale: "es-ES" },
  { code: "en", name: "English", short: "EN", locale: "en-GB" },
] as const satisfies readonly LanguageInfo[];

export type Lang = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANG: Lang = "es";

/** Clave de localStorage Y nombre de la cookie (misma cadena en ambos). */
export const LANG_KEY = "tubodadiy-lang";

/** Un año, en segundos. */
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Namespaces = ficheros src/locales/<lang>/<ns>.json. Cada agente/feature es
 * dueño de los suyos (ver docs/i18n.md).
 */
export const NAMESPACES = [
  "common",
  "landing",
  "auth",
  "dashboard",
  "onboarding",
  "plan",
  "steps",
  "vendors",
  "guests",
  "budget",
  "timeline",
  "ceremony",
  "tools",
  "honeymoon",
  "invitation",
  "errors",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && LANGUAGES.some((l) => l.code === value);
}

/** Devuelve un idioma válido: el valor si lo es y, si no, el idioma por defecto. */
export function normalizeLang(value: unknown): Lang {
  return isLang(value) ? value : DEFAULT_LANG;
}

/** Locale de Intl ("es-ES", "en-GB"…) de un idioma de la app. */
export function localeOf(lang: Lang = DEFAULT_LANG): string {
  return LANGUAGES.find((l) => l.code === lang)?.locale ?? LANGUAGES[0].locale;
}

/**
 * Script en línea del <head> (como el del tema): corre mientras se analiza el
 * HTML, antes de pintar. El servidor ya fija <html lang> desde la cookie; esto
 * solo cubre el caso en que la cookie falta pero localStorage guarda el idioma
 * (cookies borradas): corrige <html lang> y repone la cookie.
 */
export const LANG_INIT_SCRIPT = `(function(){try{var l=localStorage.getItem("${LANG_KEY}"),ok=${JSON.stringify(
  LANGUAGES.map((x) => x.code)
)};if(l&&ok.indexOf(l)>-1){document.documentElement.setAttribute("lang",l);if(document.cookie.indexOf("${LANG_KEY}="+l)<0)document.cookie="${LANG_KEY}="+l+"; path=/; max-age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax"}}catch(e){}})()`;
