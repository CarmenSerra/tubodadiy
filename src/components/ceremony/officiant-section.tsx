"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, UserRoundCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { formatMoney } from "@/components/budget/budget-math";
import {
  EMPTY_OFFICIANT,
  OFFICIANT_KIND_OPTIONS,
  isOfficiantEmpty,
  type OfficiantDraft,
} from "@/components/ceremony/officiant-model";
import { CeremonySection } from "@/components/ceremony/section";
import { CTA_PRIMARY, CTA_SECONDARY, LINK } from "@/components/dashboard/ui";
import {
  FIELD,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { OFFICIANT_BUDGET_CATEGORY, saveOfficiant } from "@/lib/firebase/plan-tools";
import { isLooseEmail } from "@/components/vendors/vendor-model";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePlanContext } from "@/lib/context/plan-context";
import type { OfficiantKind, PlanOfficiant } from "@/lib/types";
import { cn } from "@/lib/utils";

const NO_KIND = "none";

const SWITCH =
  "h-6 w-11 focus-visible:ring-lilac data-[state=checked]:bg-green-solid data-[state=unchecked]:bg-line-strong [&>span]:size-5 [&>span]:data-[state=checked]:translate-x-[1.375rem] [&>span]:data-[state=unchecked]:translate-x-0.5";

function toDraft(officiant: PlanOfficiant | null): OfficiantDraft {
  if (!officiant) return EMPTY_OFFICIANT;
  const { budgetItemId: _link, ...draft } = officiant;
  void _link;
  return draft;
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-ink">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

/** «Oficiante»: ficha sencilla (no es un proveedor) con honorarios enlazables al presupuesto. */
export function OfficiantSection() {
  const { planId, plan } = usePlanContext();
  const saved = plan?.officiant ?? null;
  // Se reinicia el formulario cuando cambia lo guardado (por esta persona o por otra).
  const formKey = JSON.stringify(saved);
  return (
    <CeremonySection
      id="oficiante"
      icon={<UserRoundCheckIcon />}
      title="Oficiante"
      description="Quién oficia la ceremonia: sus datos de contacto, si está confirmado y sus honorarios."
    >
      <OfficiantForm key={formKey} planId={planId} saved={saved} />
    </CeremonySection>
  );
}

function OfficiantForm({ planId, saved }: { planId: string; saved: PlanOfficiant | null }) {
  const initial = React.useMemo(() => toDraft(saved), [saved]);
  const [draft, setDraft] = React.useState<OfficiantDraft>(initial);
  const [feeText, setFeeText] = React.useState(initial.fee !== null ? String(initial.fee) : "");
  const [errors, setErrors] = React.useState<{ name?: string; email?: string; fee?: string }>({});
  const [saving, setSaving] = React.useState<"save" | "clear" | null>(null);
  const uid = React.useId();
  const id = (name: string) => `${uid}-${name}`;

  const feeNumber = feeText.trim() ? Number(feeText.replace(",", ".")) : null;
  const feeValid = feeNumber === null || (Number.isFinite(feeNumber) && feeNumber >= 0);
  const fee = feeNumber !== null && feeValid && feeNumber > 0 ? feeNumber : null;
  const next: OfficiantDraft = { ...draft, fee, feeInBudget: fee !== null && draft.feeInBudget };
  const dirty = JSON.stringify(next) !== JSON.stringify(initial) || !feeValid;

  function patch(values: Partial<OfficiantDraft>) {
    setDraft((d) => ({ ...d, ...values }));
  }

  async function commit(value: OfficiantDraft | null, mode: "save" | "clear") {
    setSaving(mode);
    try {
      await saveOfficiant(planId, value && !isOfficiantEmpty(value) ? value : null);
      toast.success(mode === "clear" ? "Ficha del oficiante quitada" : "Ficha del oficiante guardada");
      // El formulario se reinicia solo al llegar lo guardado; al quitarla, se vacía.
      if (mode === "clear") {
        setDraft(EMPTY_OFFICIANT);
        setFeeText("");
      }
    } catch {
      toast.error("No se ha podido guardar la ficha del oficiante.");
    } finally {
      setSaving(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (draft.confirmed && !draft.name.trim()) {
      found.name = "Para marcarlo como confirmado, escribe su nombre.";
    }
    if (draft.email.trim() && !isLooseEmail(draft.email)) {
      found.email = "Revisa el correo electrónico: debería parecerse a nombre@dominio.com.";
    }
    if (!feeValid) found.fee = "Escribe un importe válido, sin símbolos.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    void commit(
      {
        ...next,
        name: next.name.trim(),
        phone: next.phone.trim(),
        email: next.email.trim(),
      },
      "save"
    );
  }

  const invalid = (key: keyof typeof errors) => (errors[key] ? true : undefined);
  const described = (key: keyof typeof errors, name: string) =>
    errors[key] ? `${id(name)}-error` : undefined;
  const linked = Boolean(saved?.budgetItemId) && saved?.feeInBudget;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id("name")} label="Nombre" error={errors.name}>
          <Input
            id={id("name")}
            className={FIELD}
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            aria-invalid={invalid("name")}
            aria-describedby={described("name", "name")}
            autoComplete="off"
          />
        </Field>
        <Field id={id("kind")} label="Tipo">
          <Select
            value={draft.kind ?? NO_KIND}
            onValueChange={(v) => patch({ kind: v === NO_KIND ? null : (v as OfficiantKind) })}
          >
            <SelectTrigger id={id("kind")} className={cn(SELECT_TRIGGER, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              <SelectItem value={NO_KIND} className={SELECT_ITEM}>
                Sin indicar
              </SelectItem>
              {OFFICIANT_KIND_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className={SELECT_ITEM}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id={id("phone")} label="Teléfono">
          <Input
            id={id("phone")}
            type="tel"
            className={FIELD}
            value={draft.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            autoComplete="off"
          />
        </Field>
        <Field id={id("email")} label="Correo electrónico" error={errors.email}>
          <Input
            id={id("email")}
            type="email"
            className={FIELD}
            value={draft.email}
            onChange={(e) => patch({ email: e.target.value })}
            aria-invalid={invalid("email")}
            aria-describedby={described("email", "email")}
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-field px-4 py-3">
        <Label htmlFor={id("confirmed")} className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1">
          <span className="text-sm font-medium text-ink">Confirmado</span>
          <span className="text-sm font-normal leading-snug text-ink-muted">
            {draft.confirmed
              ? "Sí: ya tenéis su palabra. La tarea «Confirmar oficiante» se marca sola."
              : "No: todavía falta confirmarlo."}
          </span>
        </Label>
        <Switch
          id={id("confirmed")}
          checked={draft.confirmed}
          onCheckedChange={(v) => patch({ confirmed: v })}
          className={SWITCH}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-field p-4">
        <Field
          id={id("fee")}
          label="Honorarios (€, opcional)"
          error={errors.fee}
        >
          <Input
            id={id("fee")}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className={cn(FIELD, "sm:max-w-48")}
            value={feeText}
            onChange={(e) => setFeeText(e.target.value)}
            aria-invalid={invalid("fee")}
            aria-describedby={described("fee", "fee")}
          />
        </Field>
        <div className="flex items-center justify-between gap-4">
          <Label
            htmlFor={id("budget")}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-start gap-1",
              fee === null ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            )}
          >
            <span className="text-sm font-medium text-ink">Añadir al presupuesto</span>
            <span className="text-sm font-normal leading-snug text-ink-muted">
              {fee === null
                ? "Escribe los honorarios para poder añadirlos."
                : next.feeInBudget
                  ? `Se guarda como gasto pendiente de ${formatMoney(fee)} en «${OFFICIANT_BUDGET_CATEGORY}». Si cambias el importe o lo quitas, el gasto se actualiza.`
                  : "Crea un gasto pendiente en la categoría «Ceremonia»."}
            </span>
          </Label>
          <Switch
            id={id("budget")}
            checked={next.feeInBudget}
            disabled={fee === null}
            onCheckedChange={(v) => patch({ feeInBudget: v })}
            className={SWITCH}
          />
        </div>
        {linked && (
          <p className="text-sm text-ink-muted">
            Ya está en el presupuesto.{" "}
            <Link href={`/plan/${planId}/budget`} className={LINK}>
              Ver presupuesto
            </Link>
          </p>
        )}
      </div>

      <Field id={id("notes")} label="Notas">
        <Textarea
          id={id("notes")}
          rows={3}
          className={cn(FIELD, "h-auto min-h-24 py-2.5")}
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        {saved && (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => void commit(null, "clear")}
            className={cn(CTA_SECONDARY, "sm:mr-auto")}
          >
            {saving === "clear" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            Quitar ficha
          </button>
        )}
        <button
          type="submit"
          disabled={!dirty || saving !== null}
          className={cn(CTA_PRIMARY, "disabled:opacity-50")}
        >
          {saving === "save" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Guardar
        </button>
      </div>
    </form>
  );
}
