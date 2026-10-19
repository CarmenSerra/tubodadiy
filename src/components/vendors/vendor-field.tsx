import * as React from "react";

import { FIELD_ERROR, FIELD_LABEL } from "@/components/vendors/vendor-brand";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Campo con etiqueta, ayuda y error (misma maqueta que el formulario del proveedor). */
export function VendorField({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </Label>
      {children}
      {hint && !error && <p className="text-sm text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className={FIELD_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Botón de icono de 44 px para editar o borrar una fila. */
export const ROW_ICON_BUTTON =
  "inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors outline-none hover:bg-lilac-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-lilac [&_svg]:size-4";
