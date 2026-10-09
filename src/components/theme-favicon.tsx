"use client";

import * as React from "react";

import type { Theme } from "@/lib/theme";

/**
 * Variantes fijas del icono (generadas por scripts/icons/generate.mjs). El SVG de
 * src/app/icon1.svg cambia con el tema del SISTEMA; la app, en cambio, solo
 * obedece al botón (ver lib/theme.ts), así que aquí se reapuntan los <link rel="icon">
 * a la variante del tema de la app.
 */
const VARIANT: Record<string, (theme: Theme) => string> = {
  svg: (t) => `/icons/icon-${t}.svg`,
  png: (t) => `/icons/icon-${t}-32.png`,
  ico: (t) => `/icons/favicon-${t}.ico`,
};

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function syncIcons() {
  const theme = currentTheme();
  document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]').forEach((link) => {
    const path = new URL(link.href, location.href).pathname;
    const ext = /\.(svg|png|ico)$/.exec(path)?.[1];
    const next = ext ? VARIANT[ext](theme) : undefined;
    if (next && path !== next) link.href = next;
  });
}

/** Sin interfaz: mantiene el favicon en la variante clara u oscura del tema de la app. */
export function ThemeFavicon() {
  React.useEffect(() => {
    syncIcons();
    const onTheme = new MutationObserver(syncIcons);
    onTheme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // Next puede volver a pintar los <link> del <head> al navegar: se reaplica la variante.
    const onHead = new MutationObserver(syncIcons);
    onHead.observe(document.head, { childList: true });
    return () => {
      onTheme.disconnect();
      onHead.disconnect();
    };
  }, []);
  return null;
}
