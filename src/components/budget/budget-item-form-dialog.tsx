"use client";

import * as React from "react";
import { Loader2, PlusIcon, PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { addBudgetItem, updateBudgetItem } from "@/lib/firebase/mutations";
import type { BudgetItem } from "@/lib/types";

interface BudgetItemFormDialogProps {
  planId: string;
  item?: BudgetItem;
  trigger?: React.ReactNode;
}

export function BudgetItemFormDialog({ planId, item, trigger }: BudgetItemFormDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <PlusIcon />
            Añadir gasto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {open && (
          <BudgetItemForm planId={planId} item={item} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BudgetItemForm({
  planId,
  item,
  onDone,
}: {
  planId: string;
  item?: BudgetItem;
  onDone: () => void;
}) {
  const isEdit = Boolean(item);
  const [category, setCategory] = React.useState(item?.category ?? "");
  const [concept, setConcept] = React.useState(item?.concept ?? "");
  const [estimatedCost, setEstimatedCost] = React.useState(item ? String(item.estimatedCost) : "");
  const [actualCost, setActualCost] = React.useState(
    item?.actualCost != null ? String(item.actualCost) : ""
  );
  const [paid, setPaid] = React.useState(item?.paid ?? false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!concept.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        category: category.trim() || "General",
        concept: concept.trim(),
        estimatedCost: estimatedCost ? Number(estimatedCost) : 0,
        actualCost: actualCost ? Number(actualCost) : null,
        paid,
      };
      if (isEdit && item) {
        await updateBudgetItem(planId, item.id, data);
        toast.success("Gasto actualizado");
      } else {
        await addBudgetItem(planId, data);
        toast.success("Gasto añadido");
      }
      onDone();
    } catch {
      toast.error("No se ha podido guardar el gasto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
      </DialogHeader>
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-concept">Concepto</Label>
          <Input
            id="budget-concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Vestido de novia"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-category">Categoría</Label>
          <Input
            id="budget-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Vestuario, catering, lugar..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-estimated">Coste estimado (€)</Label>
            <Input
              id="budget-estimated"
              type="number"
              min="0"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-actual">Coste real (€)</Label>
            <Input
              id="budget-actual"
              type="number"
              min="0"
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={paid} onCheckedChange={(v) => setPaid(Boolean(v))} />
          Pagado
        </label>
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

export function EditBudgetItemTrigger() {
  return (
    <Button variant="ghost" size="icon" className="size-8">
      <PencilIcon className="size-4" />
    </Button>
  );
}
