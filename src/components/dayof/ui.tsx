"use client";

import * as React from "react";
import { ExternalLinkIcon, Loader2, PhoneIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CTA_PRIMARY, CTA_SECONDARY, Skeleton } from "@/components/dashboard/ui";
import {
  DIALOG_CONTENT,
  DIALOG_TITLE,
  FIELD,
  FIELD_LABEL,
  ROW_FOCUS,
} from "@/components/guests/brand-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isHttpUrl } from "@/components/vendors/vendor-model";
import { telHref } from "@/lib/dayof-model";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Enlaces y teléfonos                                                */
/* ------------------------------------------------------------------ */

/**
 * Enlace escrito por la persona → enlace http(s) válido. Vacío = sin enlace (""); `null` = no
 * es un enlace. Si falta el esquema («youtube.com/…») se añade https://.
 */
export function normalizeLink(value: string): string | null {
  const raw = value.trim();
  if (!raw) return "";
  const full = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  return isHttpUrl(full) && !/\s/.test(raw) ? full : null;
}

const INLINE_LINK =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:bg-lilac-soft";

/** Enlace externo (nueva pestaña) con su aviso para lectores de pantalla. */
export function ExternalLink({ href, label, className }: { href: string; label: string; className?: string }) {
  const { t } = useTranslation("dayof");
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(INLINE_LINK, ROW_FOCUS, className)}>
      <ExternalLinkIcon aria-hidden="true" className="size-3.5 shrink-0" />
      {label}
      <span className="sr-only"> {t("common.newTab")}</span>
    </a>
  );
}

/** Teléfono clicable (`tel:`); si no es marcable, se muestra tal cual. */
export function PhoneLink({ phone, className }: { phone: string; className?: string }) {
  const { t } = useTranslation("dayof");
  const href = telHref(phone);
  if (!phone.trim()) return null;
  if (!href) return <span className={cn("text-sm text-ink-strong", className)}>{phone}</span>;
  return (
    <a
      href={href}
      aria-label={t("common.callAria", { phone: phone.trim() })}
      className={cn(INLINE_LINK, "tabular-nums", ROW_FOCUS, className)}
    >
      <PhoneIcon aria-hidden="true" className="size-3.5 shrink-0" />
      {phone.trim()}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Formularios                                                        */
/* ------------------------------------------------------------------ */

/** Píldora de opción (radio): seleccionado = borde morado 2px + fondo lavanda claro. */
export function choicePill(selected: boolean) {
  return cn(
    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-3.5 text-sm font-medium text-ink transition-colors",
    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lilac has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface",
    selected ? "border-lilac bg-lilac-soft" : "border-line-strong bg-field hover:bg-lilac-soft"
  );
}

/** Texto de error de campo (sin rojo: el rojo es solo para confirmar borrados). */
const ERROR_TEXT = "text-sm font-medium text-ink";

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  type = "text",
  required,
  autoFocus,
  inputMode,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  placeholder?: string;
  type?: "text" | "tel" | "url";
  required?: boolean;
  autoFocus?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
}) {
  const { t } = useTranslation("dayof");
  const id = React.useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className={FIELD_LABEL}>
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="-ml-1 text-danger">
              *
            </span>
            <span className="sr-only">({t("form.required")})</span>
          </>
        )}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        autoComplete="off"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={FIELD}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className={ERROR_TEXT}>
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Diálogo de marca para los formularios del Día B y de la ceremonia. */
export function DayDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className={DIALOG_CONTENT}>
        {open && children}
      </DialogContent>
    </Dialog>
  );
}

/** Cabecera, campos y botones comunes de un formulario dentro de `DayDialog`. */
export function FormFrame({
  title,
  description,
  busy,
  onSubmit,
  onCancel,
  onDelete,
  deleteLabel,
  submitLabel,
  submitDisabled,
  children,
}: {
  title: string;
  description: string;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  submitLabel?: string;
  submitDisabled?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("dayof");
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
      <DialogFooter className="mt-6 gap-2 sm:items-center sm:gap-3">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink sm:mr-auto",
              ROW_FOCUS
            )}
          >
            <Trash2Icon aria-hidden="true" className="size-4" />
            {deleteLabel ?? t("form.delete")}
          </button>
        )}
        <button type="button" onClick={onCancel} className={cn(CTA_SECONDARY, "h-11")}>
          {t("form.cancel")}
        </button>
        <button type="submit" disabled={busy || submitDisabled} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {submitLabel ?? t("form.save")}
        </button>
      </DialogFooter>
    </form>
  );
}

/** Estado de un diálogo de edición: cerrado, nuevo (sin `item`) o editando `item`. */
export function useEditor<T>() {
  const [state, setState] = React.useState<{ open: boolean; item?: T }>({ open: false });
  return {
    open: state.open,
    item: state.item,
    openNew: () => setState({ open: true }),
    openEdit: (item: T) => setState({ open: true, item }),
    setOpen: (open: boolean) => setState((s) => ({ ...s, open })),
  };
}

/** Estado vacío discreto dentro de una tarjeta de sección. */
export function EmptyHint({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong p-4 sm:p-5">
      <p className="text-sm text-ink-muted">{children}</p>
      {action}
    </div>
  );
}

/** Fila de lista con borde inferior, en la que cabe una zona clicable y acciones. */
export const ROW = "flex items-center gap-1 border-b border-line last:border-b-0";

/** Zona clicable de una fila (abre la edición). */
export const ROW_MAIN = cn(
  "flex min-h-14 min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-xl px-2 py-2 text-left hover:bg-lilac-soft",
  ROW_FOCUS
);

/** Cuerpo de una sección con lista: carga, error, vacío o el contenido. */
export function ListBody({
  loading,
  error,
  empty,
  emptyText,
  emptyAction,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("dayof");
  if (loading) {
    return (
      <div role="status" aria-label={t("common.loading")} className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <p role="alert" className="text-sm text-ink-muted">
        {t("common.loadError")}
      </p>
    );
  }
  if (empty) return <EmptyHint action={emptyAction}>{emptyText}</EmptyHint>;
  return <>{children}</>;
}
