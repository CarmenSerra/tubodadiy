import type { Metadata } from "next";
import { Birthstone, Caprasimo, Delicious_Handrawn, DM_Sans, Newsreader } from "next/font/google";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { ThemeFavicon } from "@/components/theme-favicon";
import { Toaster } from "@/components/ui/sonner";
import { LANG_INIT_SCRIPT } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/provider";
import { getRequestLang } from "@/lib/i18n/request";
import { getServerT } from "@/lib/i18n/server";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Body & UI text. Variable font, so every Tailwind font-weight utility
// (400-700) resolves to a real instance instead of synthetic bolding.
const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

// Headings (h1-h4) and card/section titles. Variable font with an optical
// size axis: loading it means text at display sizes gets the slightly
// different, more display-ish cut automatically (via font-optical-sizing:
// auto in globals.css), instead of the text-size cut scaled up.
//
// This is the ONE place to swap the display typeface (e.g. for
// Young_Serif): change this import + call, keep the --font-display
// variable name, and update the italic/weight usage below to match the
// new font's capabilities (Young Serif only ships weight 400, no italic).
const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
  fallback: ["Georgia", "serif"],
});

// Decorative script accent only — couple's names, the landing hero, an
// occasional section opener. Single static weight, never used for UI
// copy. See docs/design-tokens.md for the usage rules.
const birthstone = Birthstone({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  fallback: ["cursive"],
});

// Plantillas de invitación «Hilo» (letra a mano tipo rotulador, siempre en mayúsculas)
// y «Retro» (título redondeado y grueso, tipo Cooper). Solo para los títulos de la
// tarjeta; el canvas de «Reserva la fecha» las lee de estas mismas variables.
const handrawn = Delicious_Handrawn({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false, // solo la usan las tarjetas «Hilo»: se descarga cuando hace falta
  fallback: ["cursive"],
});

const caprasimo = Caprasimo({
  variable: "--font-chunky",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false, // idem, solo «Retro»
  fallback: ["Georgia", "serif"],
});

// Título y descripción en el idioma de la cookie `tubodadiy-lang` (ver docs/i18n.md).
export async function generateMetadata(): Promise<Metadata> {
  const t = getServerT(await getRequestLang(), "common");
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getRequestLang();
  return (
    // data-theme lo fija THEME_INIT_SCRIPT antes del primer pintado
    // (según la elección guardada), por eso suppressHydrationWarning. El idioma
    // sale de la cookie en el servidor (no hay parpadeo); LANG_INIT_SCRIPT solo
    // cubre el caso de cookie borrada con localStorage intacto.
    <html
      lang={lang}
      data-theme="light"
      suppressHydrationWarning
      className={`${dmSans.variable} ${newsreader.variable} ${birthstone.variable} ${handrawn.variable} ${caprasimo.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: LANG_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider initialLang={lang}>
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-center" />
          <ThemeFavicon />
        </I18nProvider>
      </body>
    </html>
  );
}
