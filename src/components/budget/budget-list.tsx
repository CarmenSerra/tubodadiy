"use client";

import * as React from "react";
import { WalletIcon } from "lucide-react";
import { toast } from "sonner";

import { CARD, IconCircle, SECTION_TITLE } from "@/components/dashboard/ui";
import { CHECKBOX, ConfirmDeleteButton } from "@/components/guests/brand-dialog";
import {
  BudgetItemFormDialog,
  EditBudgetItemTrigger,
} from "@/components/budget/budget-item-form-dialog";
import { BudgetBreakdown } from "@/components/budget/budget-breakdown";
import { listCategories, UNCATEGORISED, formatMoney } from "@/components/budget/budget-math";
import { BudgetSummary, BudgetSummarySkeleton } from "@/components/budget/budget-summary";
import { BudgetIdeas } from "@/components/ideas/budget-ideas";
import { Bone } from "@/components/plan/plan-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { useCollection } from "@/lib/hooks/use-collection";
import { budgetItemsQuery, mapBudgetItem } from "@/lib/firebase/plans";
import { deleteBudgetItem, updateBudgetItem } from "@/lib/firebase/mutations";
import type { BudgetItem, WeddingPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

function PaidToggle({
  item,
  onToggle,
  className,
}: {
  item: BudgetItem;
  onToggle: (item: BudgetItem, paid: boolean) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2.5 text-sm",
        item.paid ? "font-medium text-ink" : "text-ink-muted",
        className
      )}
    >
      <Checkbox
        checked={item.paid}
        onCheckedChange={(v) => onToggle(item, v === true)}
        aria-label={`Marcar «${item.concept}» como pagado`}
        className={CHECKBOX}
      />
      {item.paid ? "Pagado" : "Pendiente"}
    </label>
  );
}

function BudgetSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Cargando presupuesto">
      <BudgetSummarySkeleton />
      <div className={cn(CARD, "flex flex-col gap-4 p-5 sm:p-6")}>
        <Bone className="h-5 w-40" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-3 w-1/3" />
            <Bone className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn(CARD, "flex items-center justify-between gap-4 px-5 py-5")}>
            <div className="flex flex-1 flex-col gap-2.5">
              <Bone className="h-4 w-1/3" />
              <Bone className="h-3 w-1/4" />
            </div>
            <Bone className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetList({ planId, plan }: { planId: string; plan: WeddingPlan | null }) {
  const budgetTotal = plan?.budgetTotal ?? 0;
  const { data: stored, loading } = useCollection(budgetItemsQuery(planId), mapBudgetItem);
  // Cambios de "pagado" aún sin confirmar por Firestore: se ven al instante.
  const [pendingPaid, setPendingPaid] = React.useState<Record<string, boolean>>({});
  const [announcement, setAnnouncement] = React.useState("");

  const items = React.useMemo(
    () => stored.map((i) => (i.id in pendingPaid ? { ...i, paid: pendingPaid[i.id] } : i)),
    [stored, pendingPaid]
  );
  const categories = React.useMemo(() => listCategories(items), [items]);

  async function handleTogglePaid(item: BudgetItem, paid: boolean) {
    setPendingPaid((prev) => ({ ...prev, [item.id]: paid }));
    try {
      await updateBudgetItem(planId, item.id, { paid });
      setAnnouncement(`«${item.concept}»: ${paid ? "pagado" : "pendiente de pago"}`);
    } catch {
      toast.error("No se ha podido actualizar el pago. Inténtalo de nuevo.");
    } finally {
      setPendingPaid((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBudgetItem(planId, id);
      toast.success("Gasto eliminado");
    } catch {
      toast.error("No se ha podido eliminar el gasto.");
    }
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div>
        <h2 className={SECTION_TITLE}>Presupuesto</h2>
        <p className="mt-1 text-sm text-ink-muted">Lo que has previsto, lo que llevas gastado y lo que ya está pagado.</p>
      </div>
      {!loading && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <BudgetItemFormDialog planId={planId} categories={categories} />
          <BudgetIdeas planId={planId} budgetTotal={budgetTotal} items={items} align="end" />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <BudgetSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {header}
      <BudgetSummary budgetTotal={budgetTotal} items={items} />

      {items.length === 0 ? (
        <div className={cn(CARD, "flex flex-col items-center px-6 py-12 text-center sm:py-14")}>
          <IconCircle tone="lilac" className="size-12 [&_svg]:size-6">
            <WalletIcon />
          </IconCircle>
          <h3 className="mt-4 font-display text-xl font-semibold text-ink">
            Aún no hay gastos apuntados
          </h3>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            Desglosa tu presupuesto por conceptos y compara lo estimado con lo que realmente vas
            gastando. Puedes empezar por lo más grande: el lugar o el catering.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <BudgetItemFormDialog planId={planId} />
            <BudgetIdeas planId={planId} budgetTotal={budgetTotal} items={items} align="center" />
          </div>
        </div>
      ) : (
        <>
          <BudgetBreakdown items={items} />

          <section aria-labelledby="budget-items-title" className="flex flex-col gap-3">
            <h2 id="budget-items-title" className="font-display text-lg font-semibold text-ink sm:text-xl">
              Partidas
              <span className="ml-2 text-sm font-normal text-ink-muted">{items.length}</span>
            </h2>

            <p className="sr-only" role="status" aria-live="polite">
              {announcement}
            </p>

            {/* Móvil: tarjetas */}
            <ul className="flex flex-col gap-3 md:hidden" aria-label="Partidas del presupuesto">
              {items.map((item) => (
                <li key={item.id} className={cn(CARD, "flex flex-col gap-3 p-4")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-display text-lg font-semibold leading-snug text-ink-strong">
                        {item.concept}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-muted">{item.category || UNCATEGORISED}</p>
                    </div>
                    <div className="-mr-2 -mt-1 flex shrink-0">
                      <BudgetItemFormDialog
                        planId={planId}
                        item={item}
                        categories={categories}
                        trigger={<EditBudgetItemTrigger concept={item.concept} />}
                      />
                      <ConfirmDeleteButton
                        itemLabel={`«${item.concept}»`}
                        ariaLabel={`Eliminar «${item.concept}»`}
                        onConfirm={() => handleDelete(item.id)}
                      />
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 rounded-xl bg-page px-3.5 py-2.5">
                    <div>
                      <dt className="text-xs text-ink-muted">Estimado</dt>
                      <dd className="font-display text-base font-semibold text-ink">
                        {formatMoney(item.estimatedCost)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">Real</dt>
                      <dd className="font-display text-base font-semibold text-ink">
                        {item.actualCost == null ? "—" : formatMoney(item.actualCost)}
                      </dd>
                    </div>
                  </dl>
                  <PaidToggle item={item} onToggle={handleTogglePaid} className="min-h-10" />
                </li>
              ))}
            </ul>

            {/* Escritorio: tabla */}
            <div className={cn(CARD, "hidden overflow-hidden md:block")}>
              <table className="w-full text-sm">
                <caption className="sr-only">Partidas del presupuesto</caption>
                <thead className="bg-page text-left text-xs font-medium text-ink-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Concepto
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Categoría
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">
                      Estimado
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">
                      Real
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Pagado
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-line transition-colors hover:bg-page/60">
                      <td className="max-w-72 px-5 py-3 align-middle font-medium text-ink-strong">
                        <span className="break-words">{item.concept}</span>
                      </td>
                      <td className="px-3 py-3 align-middle text-ink-muted">{item.category || UNCATEGORISED}</td>
                      <td className="px-3 py-3 text-right align-middle tabular-nums text-ink-strong">
                        {formatMoney(item.estimatedCost)}
                      </td>
                      <td className="px-3 py-3 text-right align-middle tabular-nums text-ink-strong">
                        {item.actualCost == null ? (
                          <span className="text-ink-muted" aria-label="Sin coste real">
                            —
                          </span>
                        ) : (
                          formatMoney(item.actualCost)
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <PaidToggle item={item} onToggle={handleTogglePaid} />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex justify-end">
                          <BudgetItemFormDialog
                            planId={planId}
                            item={item}
                            categories={categories}
                            trigger={<EditBudgetItemTrigger concept={item.concept} />}
                          />
                          <ConfirmDeleteButton
                            itemLabel={`«${item.concept}»`}
                            ariaLabel={`Eliminar «${item.concept}»`}
                            onConfirm={() => handleDelete(item.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
