"use client";

import * as React from "react";
import { CheckIcon, WalletIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CARD, FOCUS, IconCircle, SECTION_TITLE } from "@/components/dashboard/ui";
import { DeleteIconButton } from "@/components/guests/brand-dialog";
import {
  BudgetItemFormDialog,
  EditBudgetItemTrigger,
} from "@/components/budget/budget-item-form-dialog";
import { BudgetBreakdown } from "@/components/budget/budget-breakdown";
import {
  categoryLabel,
  formatDue,
  formatMoney,
  isOverdue,
  listCategories,
} from "@/components/budget/budget-math";
import { BudgetSummary, BudgetSummarySkeleton } from "@/components/budget/budget-summary";
import { BudgetIdeas } from "@/components/ideas/budget-ideas";
import { Bone } from "@/components/plan/plan-shell";
import { useCollection } from "@/lib/hooks/use-collection";
import { budgetItemsQuery, mapBudgetItem } from "@/lib/firebase/plans";
import { useLanguage } from "@/lib/i18n/provider";
import { deleteBudgetItem, restoreBudgetItem, updateBudgetItem } from "@/lib/firebase/mutations";
import type { BudgetItem, BudgetItemState, WeddingPlan } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

/** Estado de un gasto: «Pagado», o «Pendiente» con su fecha límite y el botón de marcarlo como pagado. */
function StateCell({
  item,
  onMarkPaid,
  className,
}: {
  item: BudgetItem;
  onMarkPaid: (item: BudgetItem) => void;
  className?: string;
}) {
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  if (item.state === "paid") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-sage-pale px-3 py-1 text-sm font-medium text-ink",
          className
        )}
      >
        <CheckIcon aria-hidden="true" className="size-4 text-green" />
        {t("list.state.paid")}
      </span>
    );
  }
  const overdue = item.dueDate ? isOverdue(item.dueDate) : false;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-ink">{t("list.state.pending")}</span>
        {item.dueDate && (
          <span className={cn("text-xs", overdue ? "font-medium text-danger" : "text-ink-muted")}>
            {overdue
              ? t("list.state.overdue", { date: formatDue(item.dueDate, lang) })
              : t("list.state.due", { date: formatDue(item.dueDate, lang) })}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onMarkPaid(item)}
        aria-label={t("list.markPaidAria", { name: item.concept })}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-lilac bg-field px-3.5 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft",
          FOCUS
        )}
      >
        <CheckIcon aria-hidden="true" className="size-4" />
        {t("list.markPaid")}
      </button>
    </div>
  );
}

function BudgetSkeleton() {
  const { t } = useTranslation("budget");
  return (
    <div className="flex flex-col gap-5" role="status" aria-label={t("list.loading")}>
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
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const budgetTotal = plan?.budgetTotal ?? 0;
  const { data: stored, loading } = useCollection(budgetItemsQuery(planId), mapBudgetItem);
  // Cambios de estado aún sin confirmar por Firestore: se ven al instante.
  const [pendingState, setPendingState] = React.useState<Record<string, BudgetItemState>>({});
  const [announcement, setAnnouncement] = React.useState("");

  const items = React.useMemo(
    () => stored.map((i) => (i.id in pendingState ? { ...i, state: pendingState[i.id] } : i)),
    [stored, pendingState]
  );
  const categories = React.useMemo(() => listCategories(items), [items]);

  /** Cambia el estado de un gasto. Siempre escribe también el importe: así un gasto antiguo pasa al modelo actual. */
  async function setItemState(item: BudgetItem, state: BudgetItemState) {
    setPendingState((prev) => ({ ...prev, [item.id]: state }));
    try {
      await updateBudgetItem(planId, item.id, {
        amount: item.amount,
        state,
        dueDate: item.dueDate,
      });
    } finally {
      setPendingState((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }

  async function handleMarkPaid(item: BudgetItem) {
    // El gasto tal como está guardado (sin otro cambio de estado aún por confirmar).
    const original = stored.find((i) => i.id === item.id) ?? item;
    try {
      await setItemState(original, "paid");
    } catch {
      toast.error(t("list.markPaidError"));
      return;
    }
    setAnnouncement(t("list.paidAnnouncement", { name: item.concept }));
    toastWithUndo(t("list.markedPaid", { name: item.concept }), () => setItemState(original, "pending"));
  }

  async function handleDelete(id: string) {
    // El gasto tal como está guardado (sin el cambio de «pagado» aún pendiente).
    const item = stored.find((i) => i.id === id);
    try {
      await deleteBudgetItem(planId, id);
      if (item) toastWithUndo(t("list.deleted"), () => restoreBudgetItem(planId, item));
      else toast.success(t("list.deleted"));
    } catch {
      toast.error(t("list.deleteError"));
    }
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div>
        <h2 className={SECTION_TITLE}>{t("list.title")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("list.description")}</p>
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
            {t("list.empty.title")}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            {t("list.empty.text")}
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
              {t("list.items")}
              <span className="ml-2 text-sm font-normal text-ink-muted">{items.length}</span>
            </h2>

            <p className="sr-only" role="status" aria-live="polite">
              {announcement}
            </p>

            {/* Móvil: tarjetas */}
            <ul className="flex flex-col gap-3 md:hidden" aria-label={t("list.itemsLabel")}>
              {items.map((item) => (
                <li key={item.id} className={cn(CARD, "flex flex-col gap-3 p-4")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-display text-lg font-semibold leading-snug text-ink-strong">
                        {item.concept}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-muted">{item.category ? categoryLabel(item.category, t) : t("uncategorised")}</p>
                    </div>
                    <div className="-mr-2 -mt-1 flex shrink-0">
                      <BudgetItemFormDialog
                        planId={planId}
                        item={item}
                        categories={categories}
                        trigger={<EditBudgetItemTrigger concept={item.concept} />}
                      />
                      <DeleteIconButton
                        ariaLabel={t("list.deleteAria", { name: item.concept })}
                        onDelete={() => handleDelete(item.id)}
                      />
                    </div>
                  </div>
                  <p className="font-display text-2xl font-semibold leading-tight text-ink">
                    {formatMoney(item.amount, lang)}
                  </p>
                  <StateCell item={item} onMarkPaid={handleMarkPaid} className="min-h-10" />
                </li>
              ))}
            </ul>

            {/* Escritorio: tabla */}
            <div className={cn(CARD, "hidden overflow-hidden md:block")}>
              <table className="w-full text-sm">
                <caption className="sr-only">{t("list.itemsLabel")}</caption>
                <thead className="bg-page text-left text-xs font-medium text-ink-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">
                      {t("list.columns.concept")}
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      {t("list.columns.category")}
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">
                      {t("list.columns.amount")}
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      {t("list.columns.status")}
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      <span className="sr-only">{t("list.columns.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-line transition-colors hover:bg-page/60">
                      <td className="max-w-72 px-5 py-3 align-middle font-medium text-ink-strong">
                        <span className="break-words">{item.concept}</span>
                      </td>
                      <td className="px-3 py-3 align-middle text-ink-muted">{item.category ? categoryLabel(item.category, t) : t("uncategorised")}</td>
                      <td className="px-3 py-3 text-right align-middle tabular-nums text-ink-strong">
                        {formatMoney(item.amount, lang)}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <StateCell item={item} onMarkPaid={handleMarkPaid} />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex justify-end">
                          <BudgetItemFormDialog
                            planId={planId}
                            item={item}
                            categories={categories}
                            trigger={<EditBudgetItemTrigger concept={item.concept} />}
                          />
                          <DeleteIconButton
                            ariaLabel={t("list.deleteAria", { name: item.concept })}
                            onDelete={() => handleDelete(item.id)}
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
