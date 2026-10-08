"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createWeddingPlan } from "@/lib/firebase/plans";
import { cn } from "@/lib/utils";

// Estilos de marca compartidos con EditPlanDialog. Solo se usan dentro de
// componentes (nunca a nivel de módulo): dashboard/ui importa este archivo y
// el ciclo solo es seguro mientras sea así.
export const PLAN_LABEL = "text-sm font-medium leading-none text-[#26413C]";
export const PLAN_FIELD =
  "h-11 rounded-xl border-[#D4C0EA] bg-white text-base text-[#102D28] shadow-none placeholder:text-[#677775] focus-visible:ring-[#927AAC] focus-visible:ring-offset-0 sm:text-sm";
export const PLAN_HELP = "text-xs text-[#586C64]";
/** Foco de los botones sobre el fondo crema del diálogo. */
export const PLAN_BUTTON_FOCUS = "focus-visible:ring-offset-[#F8F5F1] disabled:pointer-events-none disabled:opacity-50";

interface CreatePlanDialogProps {
  /** Disparador propio (se envuelve en DialogTrigger asChild). Por defecto, la píldora lila de marca. */
  trigger?: React.ReactNode;
  /** Clases extra para el disparador por defecto. */
  triggerClassName?: string;
}

export function CreatePlanDialog({ trigger, triggerClassName }: CreatePlanDialogProps = {}) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [weddingDate, setWeddingDate] = React.useState("");
  const [budgetTotal, setBudgetTotal] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const planId = await createWeddingPlan(user.uid, {
        title: title.trim() || "Nuestra boda",
        weddingDate: weddingDate || null,
        budgetTotal: budgetTotal ? Number(budgetTotal) : 0,
      });
      setOpen(false);
      toast.success("Plan de boda creado");
      router.push(`/plan/${planId}`);
    } catch {
      toast.error("No se ha podido crear el plan. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={cn(CTA_PRIMARY, triggerClassName)}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Nuevo plan de boda
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="gap-0 p-5 sm:p-7">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="text-xl sm:text-2xl">Crea tu plan de boda</DialogTitle>
            <DialogDescription>
              Podrás cambiar estos datos más adelante desde el resumen del plan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-title" className={PLAN_LABEL}>
                Nombre del plan
              </Label>
              <Input
                id="plan-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="La boda de Ana y Luis"
                className={PLAN_FIELD}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-date" className={PLAN_LABEL}>
                Fecha objetivo
              </Label>
              <DatePicker
                id="plan-date"
                value={weddingDate}
                onChange={setWeddingDate}
                aria-describedby="plan-date-help"
                className={PLAN_FIELD}
              />
              <p id="plan-date-help" className={PLAN_HELP}>
                Opcional. Puedes añadirla cuando la sepas.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-budget" className={PLAN_LABEL}>
                Presupuesto total (€)
              </Label>
              <Input
                id="plan-budget"
                type="number"
                min="0"
                step="100"
                value={budgetTotal}
                onChange={(e) => setBudgetTotal(e.target.value)}
                placeholder="15000"
                aria-describedby="plan-budget-help"
                className={PLAN_FIELD}
              />
              <p id="plan-budget-help" className={PLAN_HELP}>
                Opcional. Es una cifra orientativa que podrás ajustar.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-7 gap-2 sm:gap-3">
            <DialogClose asChild>
              <button type="button" className={cn(CTA_SECONDARY, PLAN_BUTTON_FOCUS, "h-11 sm:h-10")}>
                Cancelar
              </button>
            </DialogClose>
            <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, PLAN_BUTTON_FOCUS)}>
              {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              Crear plan
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
