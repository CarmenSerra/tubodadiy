"use client";

import * as React from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY, FOCUS } from "@/components/dashboard/ui";
import { PLAN_FIELD, PLAN_HELP } from "@/components/plan/create-plan-dialog";
import { BRAND_POPOVER_SURFACE, CalendarPopoverContent } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updatePlanDetails } from "@/lib/firebase/mutations";
import type { WeddingPlan } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

// Todos los miembros del plan pueden editarlo (igual que EditPlanDialog y las
// reglas de Firestore), así que no hay nada que filtrar por rol.

/** Disparador: valor clicable con fondo lila suave al pasar el ratón. */
const TRIGGER =
  "group/editor -mx-1.5 inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-left align-baseline transition-colors hover:bg-[#ECE6F4] data-[state=open]:bg-[#ECE6F4] motion-reduce:transition-none";

/** Estado vacío: invitación en forma de enlace verde con subrayado lila. */
const EMPTY_LINK = "font-medium sm:whitespace-nowrap text-[#4E6A5A] underline decoration-[#927AAC] decoration-2 underline-offset-4";

/** Estado vacío: "+ Añadir …" como enlace; el texto puede partirse en dos líneas en móvil. */
function AddPrompt({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <PlusIcon aria-hidden="true" className="size-3.5 shrink-0 translate-y-0.5 text-[#4E6A5A]" />
      <span className={EMPTY_LINK}>{children}</span>
    </span>
  );
}

/** Lápiz: siempre visible en táctil; en escritorio, al pasar el ratón o con foco. */
function EditHint() {
  return (
    <PencilIcon
      aria-hidden="true"
      className={cn(
        "size-3.5 shrink-0 text-[#927AAC] transition-opacity motion-reduce:transition-none",
        "pointer-fine:opacity-0 pointer-fine:group-hover/editor:opacity-100 pointer-fine:group-focus-visible/editor:opacity-100 pointer-fine:group-data-[state=open]/editor:opacity-100"
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Fecha                                                              */
/* ------------------------------------------------------------------ */

/** Fecha de la boda editable en el sitio: abre el calendario y guarda al elegir. */
export function PlanDateEditor({ plan, className }: { plan: WeddingPlan; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const hasDate = Boolean(plan.weddingDate);
  const label = formatDate(plan.weddingDate);

  async function save(value: string) {
    setOpen(false);
    try {
      await updatePlanDetails(plan.id, { weddingDate: value || null });
      toast.success(value ? "Fecha guardada" : "Fecha borrada");
    } catch {
      toast.error("No se ha podido guardar la fecha.");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            hasDate ? `Cambiar la fecha de la boda, ahora ${label}` : "Añadir la fecha de la boda"
          }
          className={cn(TRIGGER, FOCUS, className)}
        >
          {hasDate ? (
            <>
              <span className="sm:whitespace-nowrap">{label}</span>
              <EditHint />
            </>
          ) : (
            <AddPrompt>Añadir fecha</AddPrompt>
          )}
        </button>
      </PopoverTrigger>
      <CalendarPopoverContent value={plan.weddingDate ?? ""} onChange={save} />
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Presupuesto                                                        */
/* ------------------------------------------------------------------ */

/**
 * Interpreta un importe escrito a la española: "12.000", "12000,50", "12 000 €",
 * "12000.5". Devuelve NaN si no es un número.
 */
export function parseAmount(raw: string): number {
  let text = raw.replace(/[\s €]/g, "");
  if (!text || !/^-?[\d.,]+$/.test(text)) return Number.NaN;
  if (text.includes(",")) {
    // La coma es el decimal; los puntos, miles.
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    // "12.000" o "1.250.000": puntos de miles.
    text = text.replace(/\./g, "");
  }
  if ((text.match(/\./g) ?? []).length > 1) return Number.NaN;
  return Number(text);
}

function validateAmount(raw: string): { value: number; error: null } | { value: null; error: string } {
  const value = parseAmount(raw);
  if (Number.isNaN(value)) return { value: null, error: "Escribe un importe válido, por ejemplo 12.000." };
  if (value < 0) return { value: null, error: "El presupuesto no puede ser negativo." };
  if (value > 1_000_000_000) return { value: null, error: "Ese importe es demasiado grande." };
  return { value: Math.round(value * 100) / 100, error: null };
}

function BudgetForm({ plan, onDone }: { plan: WeddingPlan; onDone: () => void }) {
  const [text, setText] = React.useState(
    plan.budgetTotal > 0 ? String(plan.budgetTotal).replace(".", ",") : ""
  );
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateAmount(text);
    if (result.error !== null) {
      setError(result.error);
      return;
    }
    // Se cierra al instante: Firestore ya refleja el cambio en local y la
    // confirmación del servidor puede tardar (el aviso llega cuando termina).
    onDone();
    if (result.value === plan.budgetTotal) return;
    updatePlanDetails(plan.id, { budgetTotal: result.value }).then(
      () => toast.success("Presupuesto actualizado"),
      () => toast.error("No se ha podido guardar el presupuesto.")
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="plan-budget-editor" className="text-sm font-medium leading-none text-[#26413C]">
          Presupuesto total
        </label>
        <div className="relative">
          <Input
            id="plan-budget-editor"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="12.000"
            value={text}
            aria-invalid={error !== null}
            aria-describedby={error ? "plan-budget-help plan-budget-error" : "plan-budget-help"}
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError(null);
            }}
            className={cn(
              PLAN_FIELD,
              "pr-9",
              error && "border-[#9F3A38] focus-visible:ring-[#9F3A38]"
            )}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-base text-[#586C64] sm:text-sm"
          >
            €
          </span>
        </div>
        {error && (
          <p id="plan-budget-error" role="alert" className="text-xs font-medium text-[#9F3A38]">
            {error}
          </p>
        )}
        <p id="plan-budget-help" className={PLAN_HELP}>
          Tu presupuesto total para la boda. Puedes cambiarlo cuando quieras.
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-9 px-4")}>
          Cancelar
        </button>
        <button type="submit" className={cn(CTA_PRIMARY, "h-9 px-5")}>
          Guardar
        </button>
      </div>
    </form>
  );
}

/**
 * Popover del presupuesto con un disparador a medida (`children`, un único
 * elemento clicable). Úsalo cuando `PlanBudgetEditor` no case con el diseño.
 */
export function PlanBudgetPopover({
  plan,
  children,
  align = "start",
}: {
  plan: WeddingPlan;
  children: React.ReactElement;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={6}
        collisionPadding={16}
        aria-label="Cambiar el presupuesto total"
        className={cn(BRAND_POPOVER_SURFACE, "w-[20rem] p-4")}
      >
        <BudgetForm plan={plan} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

/** Presupuesto total editable en el sitio. */
export function PlanBudgetEditor({ plan, className }: { plan: WeddingPlan; className?: string }) {
  const hasBudget = plan.budgetTotal > 0;
  const label = formatCurrency(plan.budgetTotal);

  return (
    <PlanBudgetPopover plan={plan}>
      <button
        type="button"
        aria-label={
          hasBudget ? `Cambiar el presupuesto total, ahora ${label}` : "Añadir el presupuesto total"
        }
        className={cn(TRIGGER, FOCUS, className)}
      >
        {hasBudget ? (
          <>
            <span className="sm:whitespace-nowrap">{label}</span>
            <EditHint />
          </>
        ) : (
          <AddPrompt>Añadir presupuesto</AddPrompt>
        )}
      </button>
    </PlanBudgetPopover>
  );
}
