"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { I18nextProvider } from "react-i18next";

import { createI18n } from "./create";
import {
  LANGUAGES,
  LANG_COOKIE_MAX_AGE,
  LANG_KEY,
  isLang,
  localeOf,
  type Lang,
} from "./config";

interface LanguageContextValue {
  /** Idioma activo. */
  lang: Lang;
  /** Locale de Intl del idioma activo ("es-ES"…). */
  locale: string;
  /** Cambia el idioma: re-renderiza los textos, guarda localStorage + cookie y actualiza <html lang>. */
  setLang: (lang: Lang) => void;
  languages: typeof LANGUAGES;
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

function persist(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Sin almacenamiento: vale la cookie (o solo esta visita).
  }
  try {
    document.cookie = `${LANG_KEY}=${lang}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    // Cookies bloqueadas.
  }
}

function readStored(): Lang | null {
  try {
    const value = localStorage.getItem(LANG_KEY);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Proveedor de idioma (cliente). El layout raíz lee la cookie en el servidor y
 * pasa `initialLang`, así el HTML ya sale en el idioma correcto (sin
 * parpadeo ni desajuste de hidratación). Cada proveedor tiene su propia
 * instancia de i18next.
 */
export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const router = useRouter();
  const [i18n] = React.useState(() => createI18n(initialLang));

  const lang = React.useSyncExternalStore(
    React.useCallback(
      (onChange: () => void) => {
        i18n.on("languageChanged", onChange);
        return () => i18n.off("languageChanged", onChange);
      },
      [i18n]
    ),
    () => (isLang(i18n.language) ? i18n.language : initialLang),
    () => initialLang
  );

  const setLang = React.useCallback(
    (next: Lang) => {
      if (!isLang(next) || next === i18n.language) return;
      void i18n.changeLanguage(next);
      document.documentElement.setAttribute("lang", next);
      persist(next);
      // Los server components (metadata, getRequestLang) leen la cookie: se re-renderizan.
      router.refresh();
    },
    [i18n, router]
  );

  // Antes de pintar: si localStorage guarda un idioma distinto del que dio el
  // servidor (cookie borrada) se aplica; y se repone <html lang>, que el modo
  // estricto de desarrollo restablece al remontar.
  React.useLayoutEffect(() => {
    const stored = readStored();
    if (stored && stored !== i18n.language) {
      void i18n.changeLanguage(stored);
      persist(stored);
      router.refresh();
    }
    document.documentElement.setAttribute("lang", stored ?? i18n.language);
  }, [i18n, router]);

  const value = React.useMemo<LanguageContextValue>(
    () => ({ lang, locale: localeOf(lang), setLang, languages: LANGUAGES }),
    [lang, setLang]
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
    </I18nextProvider>
  );
}

/** Idioma activo y cambiador. Para los textos usa `useTranslation('ns')` de react-i18next. */
export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage debe usarse dentro de <I18nProvider>");
  return ctx;
}
