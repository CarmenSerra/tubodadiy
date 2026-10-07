"use client";

import * as React from "react";
import { Loader2, PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
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

export function EditPlanDialog({ plan }: { plan: WeddingPlan }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilIcon />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
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
      <DialogHeader>
        <DialogTitle>Editar plan de boda</DialogTitle>
      </DialogHeader>
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-plan-title">Nombre del plan</Label>
          <Input id="edit-plan-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-plan-date">Fecha objetivo</Label>
          <Input
            id="edit-plan-date"
            type="date"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-plan-budget">Presupuesto total (€)</Label>
          <Input
            id="edit-plan-budget"
            type="number"
            min="0"
            step="100"
            value={budgetTotal}
            onChange={(e) => setBudgetTotal(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter className="mt-6">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}
