"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** Un poco más que la duración de cierre de globals.css (--dur-close, 380 ms), para desmontar tras la animación. */
const UNMOUNT_AFTER_MS = 420;

interface CollapseProps extends Omit<React.ComponentProps<"div">, "children"> {
  open: boolean;
  /** Clases del contenido interior (padding, gap…). El contenedor que se anima no lleva padding. */
  innerClassName?: string;
  children: React.ReactNode;
}

/**
 * Sección plegable que se abre y se cierra con un deslizamiento suave (altura + fundido).
 * Para contenido que React monta solo al abrir: se mantiene montado mientras se cierra,
 * así la salida también se anima, y se desmonta después. Cerrado queda `inert` y oculto.
 *
 * Los estilos están en globals.css (.collapse). Ponle el `id` que referencia `aria-controls`.
 */
function Collapse({ open, className, innerClassName, children, ...props }: CollapseProps) {
  const [mounted, setMounted] = React.useState(open);
  if (open && !mounted) setMounted(true);

  React.useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => setMounted(false), UNMOUNT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div
      data-slot="collapse"
      data-state={open ? "open" : "closed"}
      inert={!open}
      className={cn("collapse", className)}
      {...props}
    >
      <div className="collapse-inner">
        {/* El relleno va en el contenido, no en el contenedor recortado: así cerrado mide 0. */}
        <div className={cn("collapse-content", innerClassName)}>{mounted ? children : null}</div>
      </div>
    </div>
  );
}

export { Collapse };
