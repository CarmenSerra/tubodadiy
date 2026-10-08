"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { AppBackdrop } from "@/components/brand/app-backdrop";
import { HoneymoonBackdrop } from "@/components/honeymoon/honeymoon-backdrop";
import { isHoneymoonPath } from "@/lib/honeymoon-model";
import { cn } from "@/lib/utils";

const THEME_CLASS = "theme-honeymoon";

/**
 * Marco de las páginas autenticadas: fondo de página + decoración fija. En la ruta de la
 * Luna de miel cambia al tema tropical (`.theme-honeymoon`, que redefine los tokens de rol
 * en globals.css) y sustituye el fondo de la boda por el suyo. El resto de rutas no cambia.
 *
 * La clase también se pone en <body> mientras se está en la ruta: diálogos, desplegables
 * y avisos se pintan en un portal fuera de este contenedor y, si no, volverían a verse con
 * los colores de la boda.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const honeymoon = isHoneymoonPath(pathname);

  React.useLayoutEffect(() => {
    if (!honeymoon) return;
    document.body.classList.add(THEME_CLASS);
    return () => document.body.classList.remove(THEME_CLASS);
  }, [honeymoon]);

  return (
    <div className={cn("relative isolate flex min-h-screen flex-col bg-page", honeymoon && THEME_CLASS)}>
      {honeymoon ? <HoneymoonBackdrop /> : <AppBackdrop />}
      {children}
    </div>
  );
}
