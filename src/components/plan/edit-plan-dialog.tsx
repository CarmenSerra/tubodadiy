"use client";

import * as React from "react";
import { Loader2, PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  PLAN_BUTTON_FOCUS,
  PLAN_FIELD,
  PLAN_HELP,
  PLAN_LABEL,
} from "@/components/plan/create-plan-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePlanDetails } from "@/lib/firebase/mutations";
import type { WeddingPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EditPlanDialog({ plan }: { plan: WeddingPlan }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 rounded-full px-3.5 text-sm font-medium text-[#26413C] shadow-none hover:bg-[#ECE6F4] hover:text-[#26413C] focus-visible:ring-[#927AAC] focus-visible:ring-offset-[#F8F5F1]"
        >
          <PencilIcon />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="gap-0 p-5 sm:p-7">
        {open && <EditPlanForm plan={plan} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditPlanForm({ plan, onDone }: { plan: WeddingPlan; onDone: () => void }) {
  const [title, setTitle] = React.useState(plan.title);
  const [weddingDate, setWeddingDate] = React.useState(plan.weddingDate ?? "");
  const [budgetTotal, setBudgetTotal] = React.useState(String(plan.budgetTotal ?? 0));
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updatePlanDetails(plan.id, {
        title: title.trim() || "Nuestra boda",
        weddingDate: weddingDate || null,
        budgetTotal: budgetTotal ? Number(budgetTotal) : 0,
      });
      toast.success("Plan actualizado");
      onDone();
    } catch {
      toast.error("No se ha podido actualizar el plan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader className="pr-8 text-left">
        <DialogTitle className="text-xl sm:text-2xl">Editar plan de boda</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-plan-title" className={PLAN_LABEL}>
            Nombre del plan
          </Label>
          <Input
            id="edit-plan-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={PLAN_FIELD}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-plan-date" className={PLAN_LABEL}>
            Fecha objetivo
          </Label>
          <Input
            id="edit-plan-date"
            type="date"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
            aria-describedby="edit-plan-date-help"
            className={PLAN_FIELD}
          />
          <p id="edit-plan-date-help" className={PLAN_HELP}>
            Opcional. Puedes dejarla vacía si aún no la sabes.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-plan-budget" className={PLAN_LABEL}>
            Presupuesto total (€)
          </Label>
          <Input
            id="edit-plan-budget"
            type="number"
            min="0"
            step="100"
            value={budgetTotal}
            onChange={(e) => setBudgetTotal(e.target.value)}
            className={PLAN_FIELD}
          />
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
          Guardar
        </button>
      </DialogFooter>
    </form>
  );
}
