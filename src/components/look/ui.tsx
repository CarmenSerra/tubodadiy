"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, Loader2, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { DIALOG_CONTENT, DIALOG_TITLE, FIELD_LABEL } from "@/components/guests/brand-dialog";
import {
  LOOK_STATUSES,
  isLookStatus,
  linkedVendorName,
  type LookStatus,
} from "@/components/look/look-model";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { categoryLabel } from "@/components/vendors/vendor-model";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { addBudgetItem } from "@/lib/firebase/mutations";
import type { Lang } from "@/lib/i18n/config";
import type { Vendor } from "@/lib/types";
import { cn, parseAmount } from "@/lib/utils";

/** Tarjeta de Estilo. */
export const LK_CARD = "rounded-2xl border border-line bg-surface text-ink-strong";

export const LK_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/** Campo `<select>` nativo (táctil y de teclado) con la apariencia de los demás campos. */
export const LK_NATIVE_SELECT = cn(
  "h-11 w-full min-w-0 rounded-xl border border-line-strong bg-field px-3 text-base text-ink-strong shadow-none sm:text-sm",
  LK_FOCUS
);

/** Enlace de texto-botón de 44 px (verde oscuro, subrayado lila). */
export const LK_TEXT_ACTION = cn(
  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80",
  LK_FOCUS
);

/** Píldora de ficha alternable: seleccionado = borde morado 2px + fondo lavanda claro. */
export function togglePill(selected: boolean) {
  return cn(
    "inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-3.5 text-sm font-medium text-ink transition-colors",
    LK_FOCUS,
    selected ? "border-lilac bg-lilac-soft" : "border-line-strong bg-field hover:bg-lilac-soft"
  );
}

/** Cabecera de una sección (título, descripción y acción opcional). */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 max-w-2xl">
        <h3 className="font-display text-xl font-semibold text-ink sm:text-2xl">{title}</h3>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

/** Botón «Añadir …» de una sección. */
export function AddButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn(primary ? CTA_PRIMARY : CTA_SECONDARY, "h-11")}>
      <PlusIcon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}

/** Estado vacío amable de una sección. */
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-lilac-soft p-5 ring-1 ring-lilac-edge sm:p-6">
      <h4 className="font-display text-lg font-semibold text-ink">{title}</h4>
      <p className="max-w-xl text-sm text-ink-strong">{text}</p>
      {action}
    </div>
  );
}

const STATUS_STYLE: Record<LookStatus, string> = {
  searching: "bg-lilac-soft text-ink ring-1 ring-lilac-edge",
  chosen: "bg-lilac-mid text-ink-on-tint",
  ordered: "bg-sage-pale text-on-sage",
  ready: "bg-green-solid text-on-solid",
};

/** Estado como insignia (con tilde en «Listo»). */
export function StatusBadge({ status }: { status: LookStatus }) {
  const { t } = useTranslation("look");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLE[status]
      )}
    >
      {status === "ready" && <CheckIcon aria-hidden="true" className="size-3" />}
      {t(`status.${status}`)}
    </span>
  );
}

export function StatusSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: LookStatus;
  onChange: (status: LookStatus) => void;
}) {
  const { t } = useTranslation("look");
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => isLookStatus(e.target.value) && onChange(e.target.value)}
      className={LK_NATIVE_SELECT}
    >
      {LOOK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(`status.${s}`)}
        </option>
      ))}
    </select>
  );
}

/** Etiqueta + control (+ ayuda o error). */
export function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation("look");
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className={FIELD_LABEL}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-muted">{t("form.optional")}</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-ink">
          {error}
        </p>
      )}
    </div>
  );
}

/** Importe escrito → número (≥ 0), `null` si está vacío o `undefined` si no es válido. */
export function parsePrice(raw: string, lang: Lang): number | null | undefined {
  if (!raw.trim()) return null;
  const n = parseAmount(raw, lang);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Importe guardado → texto editable. */
export function priceText(value: number | null): string {
  return value === null ? "" : String(value);
}

/** Desplegable para enlazar (solo lectura) un proveedor existente del plan. */
export function VendorSelect({
  id,
  vendorId,
  savedName,
  vendors,
  onChange,
}: {
  id: string;
  vendorId: string;
  savedName: string;
  vendors: Vendor[];
  onChange: (vendorId: string, vendorName: string) => void;
}) {
  const { t } = useTranslation("look");
  const orphan = vendorId && !vendors.some((v) => v.id === vendorId);
  if (vendors.length === 0 && !vendorId) return null;
  return (
    <Field id={id} label={t("form.vendor")} optional hint={t("form.vendorHint")}>
      <select
        id={id}
        value={vendorId}
        onChange={(e) => {
          const next = vendors.find((v) => v.id === e.target.value);
          onChange(e.target.value, next?.name ?? "");
        }}
        className={LK_NATIVE_SELECT}
      >
        <option value="">{t("form.noVendor")}</option>
        {orphan && <option value={vendorId}>{savedName || t("form.deletedVendor")}</option>}
        {vendors.map((v) => (
          <option key={v.id} value={v.id}>
            {(v.name || t("form.unnamedVendor")) + (v.category ? ` · ${categoryLabel(v.category, t)}` : "")}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** «Proveedor: X» con enlace a Proveedores, si la tarjeta tiene uno enlazado. */
export function VendorChip({
  planId,
  vendorId,
  savedName,
  vendors,
}: {
  planId: string;
  vendorId: string;
  savedName: string;
  vendors: Vendor[];
}) {
  const { t } = useTranslation("look");
  const name = linkedVendorName(vendorId, savedName, vendors);
  if (!vendorId || !name) return null;
  const exists = vendors.some((v) => v.id === vendorId);
  return (
    <p className="text-sm text-ink-muted">
      {t("card.vendor")}{" "}
      {exists ? (
        <Link href={`/plan/${planId}/vendors`} className="font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4">
          {name}
        </Link>
      ) : (
        <span className="font-medium text-ink">{name}</span>
      )}
    </p>
  );
}

/**
 * Enlace amable para pasar un precio al presupuesto (una sola vez): crea una partida
 * pendiente y marca la tarjeta; después solo enlaza al presupuesto. No duplica datos.
 */
export function BudgetLink({
  planId,
  price,
  category,
  concept,
  inBudget,
  onMarked,
}: {
  planId: string;
  price: number | null;
  /** Categoría del presupuesto (se guarda en español, como el resto). */
  category: string;
  concept: string;
  inBudget: boolean;
  onMarked: () => Promise<void>;
}) {
  const { t } = useTranslation("look");
  const [busy, setBusy] = React.useState(false);
  if (price === null || price <= 0) return null;

  if (inBudget) {
    return (
      <p className="flex min-h-11 flex-wrap items-center gap-x-2 text-sm text-ink-muted">
        <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-green" />
        {t("budget.inBudget")}
        <Link href={`/plan/${planId}/budget`} className="font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4">
          {t("budget.view")}
        </Link>
      </p>
    );
  }

  async function add() {
    setBusy(true);
    try {
      await addBudgetItem(planId, {
        category,
        concept: concept.trim() || category,
        amount: price as number,
        actual: null,
        state: "pending",
        dueDate: null,
        vendorId: null,
        payer: null,
      });
      await onMarked();
      toast.success(t("budget.added"));
    } catch {
      toast.error(t("budget.addError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={add} disabled={busy} className={cn(LK_TEXT_ACTION, "disabled:opacity-60")}>
      {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <PlusIcon aria-hidden="true" className="size-4" />}
      {t("budget.add")}
    </button>
  );
}

/** Diálogo de formulario: se monta solo mientras está abierto, así los campos arrancan siempre limpios. */
export function LookDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const restoreFocus = useRestoreFocus();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(DIALOG_CONTENT, "max-h-[calc(100dvh-1rem)]")}
        onOpenAutoFocus={restoreFocus.onOpenAutoFocus}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE}>{title}</DialogTitle>
        </DialogHeader>
        {open && children(() => onOpenChange(false))}
      </DialogContent>
    </Dialog>
  );
}

/** Pie de formulario: cancelar y guardar. */
export function FormFooter({ submitting, onCancel }: { submitting: boolean; onCancel: () => void }) {
  const { t } = useTranslation("look");
  return (
    <DialogFooter className="mt-6 gap-2 sm:gap-3">
      <button type="button" onClick={onCancel} className={cn(CTA_SECONDARY, "h-11")}>
        {t("form.cancel")}
      </button>
      <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
        {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        {t("form.save")}
      </button>
    </DialogFooter>
  );
}

export function LookSkeleton() {
  const { t } = useTranslation("look");
  return (
    <div className="flex flex-col gap-5" role="status" aria-label={t("page.loading")}>
      <span className="block h-20 animate-pulse rounded-2xl bg-lilac-soft motion-reduce:animate-none" aria-hidden="true" />
      <span className="block h-14 animate-pulse rounded-2xl bg-lilac-soft motion-reduce:animate-none" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        {[0, 1].map((i) => (
          <span key={i} className="block h-44 animate-pulse rounded-2xl bg-lilac-soft motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
