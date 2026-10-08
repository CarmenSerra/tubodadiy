"use client";

import type * as React from "react";
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Avisos de marca: tarjeta crema con borde lila suave y texto verde oscuro.
// El color solo vive en el icono (salvia = hecho, ladrillo = error, lila =
// info); no se usa richColors porque pinta el fondo entero de verde/rojo.
const Toaster = ({ toastOptions, style, ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      containerAriaLabel="Notificaciones"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--line)",
          "--border-radius": "1rem",
          fontFamily: "var(--font-body), system-ui, sans-serif",
          ...style,
        } as React.CSSProperties
      }
      icons={{
        success: <CircleCheckIcon aria-hidden="true" className="size-5 text-deep" />,
        error: <CircleAlertIcon aria-hidden="true" className="size-5 text-danger" />,
        info: <InfoIcon aria-hidden="true" className="size-5 text-lilac" />,
        warning: <TriangleAlertIcon aria-hidden="true" className="size-5 text-green" />,
        loading: <Loader2Icon aria-hidden="true" className="size-5 animate-spin text-lilac" />,
      }}
      toastOptions={{
        ...toastOptions,
        style: { boxShadow: "none", ...toastOptions?.style },
        classNames: {
          toast: "!rounded-2xl !border !border-line !bg-surface !text-ink !text-sm !font-medium",
          description: "!text-ink-muted",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
