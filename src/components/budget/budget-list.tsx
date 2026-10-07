"use client";

import { Loader2, WalletIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import {
  BudgetItemFormDialog,
  EditBudgetItemTrigger,
} from "@/components/budget/budget-item-form-dialog";
import { BudgetSummary } from "@/components/budget/budget-summary";
import { useCollection } from "@/lib/hooks/use-collection";
import { budgetItemsQuery, mapBudgetItem } from "@/lib/firebase/plans";
import { deleteBudgetItem } from "@/lib/firebase/mutations";
import { formatCurrency } from "@/lib/utils";

export function BudgetList({ planId, budgetTotal }: { planId: string; budgetTotal: number }) {
  const { data: items, loading } = useCollection(budgetItemsQuery(planId), mapBudgetItem);

  async function handleDelete(id: string) {
    try {
      await deleteBudgetItem(planId, id);
      toast.success("Gasto eliminado");
    } catch {
      toast.error("No se ha podido eliminar el gasto.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BudgetSummary budgetTotal={budgetTotal} items={items} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <WalletIcon className="size-8 text-primary" />
          <p className="font-display text-lg">Todavía no hay gastos registrados</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Desglosa tu presupuesto por conceptos para comparar lo estimado con lo gastado.
          </p>
          <BudgetItemFormDialog planId={planId} />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.concept}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <Badge variant={item.paid ? "success" : "secondary"}>
                    {item.paid ? "Pagado" : "Pendiente"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Estimado {formatCurrency(item.estimatedCost)} · Real{" "}
                  {formatCurrency(item.actualCost)}
                </p>
                <div className="mt-3 flex justify-end gap-1">
                  <BudgetItemFormDialog planId={planId} item={item} trigger={<EditBudgetItemTrigger />} />
                  <DeleteConfirmButton itemLabel={`«${item.concept}»`} onConfirm={() => handleDelete(item.id)} />
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Concepto</th>
                  <th className="px-4 py-2 font-medium">Categoría</th>
                  <th className="px-4 py-2 font-medium">Estimado</th>
                  <th className="px-4 py-2 font-medium">Real</th>
                  <th className="px-4 py-2 font-medium">Pagado</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 font-medium">{item.concept}</td>
                    <td className="px-4 py-2 text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatCurrency(item.estimatedCost)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatCurrency(item.actualCost)}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={item.paid ? "success" : "secondary"}>
                        {item.paid ? "Pagado" : "Pendiente"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <BudgetItemFormDialog planId={planId} item={item} trigger={<EditBudgetItemTrigger />} />
                        <DeleteConfirmButton itemLabel={`«${item.concept}»`} onConfirm={() => handleDelete(item.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
