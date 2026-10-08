"use client";

import * as React from "react";

import { IconCircle } from "@/components/dashboard/ui";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Pantalla completa en móvil; en escritorio, un diálogo centrado que crece con
 * el contenido hasta el 85 % del alto (igual que el cronograma, pero más
 * estrecho). La cabecera y el pie quedan fijos y el cuerpo se desplaza.
 */
const MODAL =
  "top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-surface p-0 outline-none " +
  "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-line";

/** Marco común de las herramientas del plan: cabecera de marca, cuerpo con scroll y pie. */
export function ToolDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  // Sin DialogTrigger, Radix no sabe a dónde devolver el foco: se recuerda quién lo tenía.
  const restoreFocus = useRestoreFocus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className={MODAL}
        onOpenAutoFocus={(event) => {
          restoreFocus.onOpenAutoFocus();
          // El foco empieza en el propio diálogo (se anuncia su título).
          event.preventDefault();
          contentRef.current?.focus();
        }}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
      >
        <DialogHeader className="shrink-0 gap-0 px-5 pb-4 pr-14 pt-5 text-left sm:px-8 sm:pt-7">
          <div className="flex items-start gap-3.5">
            <IconCircle tone="lilac" className="mt-0.5 size-11">
              {icon}
            </IconCircle>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-ink-muted">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-5 py-5 sm:px-8">
          {children}
        </div>
        {footer && (
          <div
            className={cn(
              "flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-8"
            )}
          >
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
