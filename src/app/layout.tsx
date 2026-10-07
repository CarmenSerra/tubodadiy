import type { Metadata } from "next";
import { Birthstone, DM_Sans, Newsreader } from "next/font/google";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
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

export const metadata: Metadata = {
  title: "tubodadiy — Organiza tu boda paso a paso",
  description:
    "Centraliza toda la organización de tu boda: presupuesto, invitados, proveedores y timeline en un mismo lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${newsreader.variable} ${birthstone.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
