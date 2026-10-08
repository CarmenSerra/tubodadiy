"use client";

import * as React from "react";
import { SparklesIcon } from "lucide-react";

import { FOCUS } from "@/components/dashboard/ui";
import { useIsDesktop } from "@/components/ideas/use-is-desktop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Lo que el contenido del panel puede hacer con el propio panel. */
export interface IdeasPanelContext {
  /** Cierra el panel (el foco vuelve al botón «Ideas»). */
  close: () => void;
  /**
   * Cierra el panel y, ya cerrado, ejecuta `action` (p. ej. abrir un formulario).
   * Recibe el botón «Ideas», para que el formulario le devuelva el foco al terminar.
   */
  handoff: (action: (opener: HTMLElement | null) => void) => void;
}

/** Botón discreto: sin relleno, texto salvia; solo se marca al pasar el ratón. */
const TRIGGER =
  "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium text-[#4E6A5A] transition-colors hover:bg-[#D2D7CB] hover:text-[#26413C] data-[state=open]:bg-[#D2D7CB] data-[state=open]:text-[#26413C] sm:h-9 motion-reduce:transition-none";

/** Marca en el botón «Ideas» que el panel se cierra para ceder el paso a otro diálogo. */
const HANDOFF_ATTR = "data-ideas-handoff";

const TITLE = "font-display text-lg font-semibold leading-tight text-[#26413C]";

interface IdeasPanelProps {
  /** Título serif del panel: «Ideas para Papelería». */
  title: string;
  /** Una frase bajo el título (opcional). */
  description?: React.ReactNode;
  /** Contenido que se desplaza. */
  children: (ctx: IdeasPanelContext) => React.ReactNode;
  /** Pie fijo bajo el contenido (opcional). */
  footer?: (ctx: IdeasPanelContext) => React.ReactNode;
  /** Texto del botón; por defecto «Ideas». */
  label?: string;
  /** Alineación del panel respecto al botón (escritorio). */
  align?: "start" | "center" | "end";
  /** Clases extra del botón (márgenes, color del anillo de foco…). */
  className?: string;
}

/**
 * Botón «✨ Ideas» y su panel: un popover anclado al botón en escritorio y una
 * hoja inferior (diálogo) en móvil. El contenido es libre; ver `IdeasList`.
 */
export function IdeasPanel({
  title,
  description,
  children,
  footer,
  label = "Ideas",
  align = "start",
  className,
}: IdeasPanelProps) {
  const [open, setOpen] = React.useState(false);
  const desktop = useIsDesktop();
  const [triggerEl, setTriggerEl] = React.useState<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  const ctx = React.useMemo<IdeasPanelContext>(
    () => ({
      close: () => setOpen(false),
      handoff: (action) => {
        triggerEl?.setAttribute(HANDOFF_ATTR, "");
        setOpen(false);
        window.setTimeout(() => action(triggerEl), 0);
      },
    }),
    [triggerEl]
  );

  // Al ceder el paso a otro diálogo, este no debe devolver el foco al botón (lo haría el otro).
  const keepFocusForHandoff = (event: Event) => {
    if (!triggerEl?.hasAttribute(HANDOFF_ATTR)) return;
    triggerEl.removeAttribute(HANDOFF_ATTR);
    event.preventDefault();
  };

  const trigger = (
    <button type="button" ref={setTriggerEl} className={cn(TRIGGER, FOCUS, className)}>
      <SparklesIcon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );

  const body = (
    <>
      <div
        // Se desplaza solo el contenido: la cabecera y el pie quedan siempre a la vista.
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2"
      >
        {children(ctx)}
      </div>
      {footer && (
        <div className="shrink-0 border-t border-[#E5DDEC] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          {footer(ctx)}
        </div>
      )}
    </>
  );

  if (desktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          ref={contentRef}
          align={align}
          sideOffset={6}
          collisionPadding={16}
          aria-labelledby={titleId}
          tabIndex={-1}
          // El foco empieza en el propio panel (se anuncia su título), no en la primera fila.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            contentRef.current?.focus();
          }}
          // Dentro de un diálogo (cronograma) el bloqueo de scroll del diálogo
          // frenaría la rueda y el táctil sobre el panel; aquí no deben propagarse.
          onCloseAutoFocus={keepFocusForHandoff}
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
          className="z-[60] flex max-h-[min(60vh,var(--radix-popover-content-available-height))] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border-[#D4C0EA] bg-[#F8F5F1] p-0 text-[#102D28] shadow-none"
        >
          <div className="shrink-0 px-5 pb-3 pt-4">
            <h2 id={titleId} className={TITLE}>
              {title}
            </h2>
            {description && <p className="mt-1 text-[13px] leading-snug text-[#586C64]">{description}</p>}
          </div>
          {body}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        onCloseAutoFocus={keepFocusForHandoff}
        {...(description ? {} : { "aria-describedby": undefined })}
        // Hoja inferior: pegada abajo, a todo el ancho, con esquinas redondeadas arriba.
        className="top-auto bottom-0 left-0 flex max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none rounded-t-2xl border-x-0 border-b-0 border-[#D4C0EA] p-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100"
      >
        <div className="shrink-0 px-5 pb-3 pt-5 pr-14">
          <DialogTitle className={TITLE}>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-[13px] leading-snug">{description}</DialogDescription>
          ) : null}
        </div>
        {body}
      </DialogContent>
    </Dialog>
  );
}
