"use client";

import * as React from "react";
import { Loader2, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import {
  CHECKBOX,
  DIALOG_CONTENT,
  DIALOG_TITLE,
  EditIconButton,
  FIELD,
  FIELD_LABEL,
} from "@/components/guests/brand-dialog";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
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
import { cn } from "@/lib/utils";

// Sugerencias de categoría para que el desglose salga ordenado.
const DEFAULT_CATEGORIES = ["Lugar", "Catering", "Vestuario", "Fotografía", "Música", "Flores y decoración"];

interface BudgetItemFormDialogProps {
  planId: string;
  item?: BudgetItem;
  trigger?: React.ReactNode;
  /** Categorías ya usadas, para sugerirlas al escribir. */
  categories?: string[];
}

export function BudgetItemFormDialog({ planId, item, trigger, categories = [] }: BudgetItemFormDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={CTA_PRIMARY}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Añadir gasto
          </button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className={DIALOG_CONTENT}>
        {open && (
          <BudgetItemForm
            planId={planId}
            item={item}
            categories={categories}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BudgetItemForm({
  planId,
  item,
  categories,
  onDone,
}: {
  planId: string;
  item?: BudgetItem;
  categories: string[];
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
        category: category.trim(),
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

  const suggestions = [...new Set([...categories, ...DEFAULT_CATEGORIES])];

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{isEdit ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="budget-concept" className={FIELD_LABEL}>
            Concepto
          </Label>
          <Input
            id="budget-concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Vestido de novia"
            required
            autoFocus
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="budget-category" className={FIELD_LABEL}>
            Categoría
          </Label>
          <Input
            id="budget-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Vestuario, catering, lugar..."
            list="budget-category-options"
            autoComplete="off"
            className={FIELD}
          />
          <datalist id="budget-category-options">
            {suggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-estimated" className={FIELD_LABEL}>
              Coste estimado (€)
            </Label>
            <Input
              id="budget-estimated"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className={FIELD}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-actual" className={FIELD_LABEL}>
              Coste real (€)
            </Label>
            <Input
              id="budget-actual"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-strong">
          <Checkbox checked={paid} onCheckedChange={(v) => setPaid(Boolean(v))} className={CHECKBOX} />
          Pagado
        </label>
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          Cancelar
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Guardar
        </button>
      </DialogFooter>
    </form>
  );
}

/** Disparador de edición; recibe las props que le inyecta DialogTrigger. */
export function EditBudgetItemTrigger({
  concept,
  ...props
}: React.ComponentProps<"button"> & { concept?: string }) {
  return <EditIconButton label={concept ? `Editar «${concept}»` : "Editar gasto"} {...props} />;
}
