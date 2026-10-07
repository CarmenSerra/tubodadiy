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
      className="toaster group"
      style={
        {
          "--normal-bg": "#F8F5F1",
          "--normal-text": "#26413C",
          "--normal-border": "#E5DDEC",
          "--border-radius": "1rem",
          fontFamily: "var(--font-body), system-ui, sans-serif",
          ...style,
        } as React.CSSProperties
      }
      icons={{
        success: <CircleCheckIcon aria-hidden="true" className="size-5 text-[#3F5C4A]" />,
        error: <CircleAlertIcon aria-hidden="true" className="size-5 text-[#9F3A38]" />,
        info: <InfoIcon aria-hidden="true" className="size-5 text-[#927AAC]" />,
        warning: <TriangleAlertIcon aria-hidden="true" className="size-5 text-[#4E6A5A]" />,
        loading: <Loader2Icon aria-hidden="true" className="size-5 animate-spin text-[#927AAC]" />,
      }}
      toastOptions={{
        ...toastOptions,
        style: { boxShadow: "none", ...toastOptions?.style },
        classNames: {
          toast: "!rounded-2xl !border !border-[#E5DDEC] !bg-[#F8F5F1] !text-[#26413C] !text-sm !font-medium",
          description: "!text-[#586C64]",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
