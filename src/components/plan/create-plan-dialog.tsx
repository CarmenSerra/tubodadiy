"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createWeddingPlan } from "@/lib/firebase/plans";

export function CreatePlanDialog() {
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
        <Button>
          <PlusIcon />
          Nuevo plan de boda
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crea tu plan de boda</DialogTitle>
            <DialogDescription>
              Podrás cambiar estos datos más adelante desde el resumen del plan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-title">Nombre del plan</Label>
              <Input
                id="plan-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="La boda de Ana y Luis"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-date">Fecha objetivo</Label>
              <Input
                id="plan-date"
                type="date"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-budget">Presupuesto total (€)</Label>
              <Input
                id="plan-budget"
                type="number"
                min="0"
                step="100"
                value={budgetTotal}
                onChange={(e) => setBudgetTotal(e.target.value)}
                placeholder="15000"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Crear plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
