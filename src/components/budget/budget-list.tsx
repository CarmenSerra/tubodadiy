"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, PieChartIcon, WalletIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CARD, CTA_SECONDARY, FOCUS, IconCircle, SECTION_TITLE } from "@/components/dashboard/ui";
import { DeleteIconButton } from "@/components/guests/brand-dialog";
import {
  BudgetItemFormDialog,
  EditBudgetItemTrigger,
} from "@/components/budget/budget-item-form-dialog";
import { BudgetAllocationDialog, useOpenAllocationFromLink } from "@/components/budget/budget-allocation-dialog";
import { BudgetBreakdown } from "@/components/budget/budget-breakdown";
import {
  categoryLabel,
  formatDue,
  formatMoney,
  installmentsPatch,
  isOverdue,
  itemActual,
  itemInstallments,
  itemPayments,
  listCategories,
  listCustomPayers,
  normalize,
  payerLabel,
  todayISO,
} from "@/components/budget/budget-math";
import { BudgetExportButton } from "@/components/export/export-buttons";
import { BudgetPayers } from "@/components/budget/budget-payers";
import { BudgetSummary, BudgetSummarySkeleton } from "@/components/budget/budget-summary";
import { BudgetIdeas } from "@/components/ideas/budget-ideas";
import { Bone } from "@/components/plan/plan-shell";
import { useCollection } from "@/lib/hooks/use-collection";
import { useBudgetPlan } from "@/lib/firebase/budget-plan";
import { budgetItemsQuery, mapBudgetItem, mapVendor, vendorsQuery } from "@/lib/firebase/plans";
import { useLanguage } from "@/lib/i18n/provider";
import { deleteBudgetItem, restoreBudgetItem, updateBudgetItem } from "@/lib/firebase/mutations";
import type { BudgetInstallment, BudgetItem, WeddingPlan } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

const PAY_BUTTON = cn(
  "inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-lilac bg-field px-4 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft",
  FOCUS
);

/**
 * Estado de pago de una partida: «Pagado», «Pendiente» o «Pagado X de Y», con su próxima fecha límite.
 * Con un solo plazo, el botón lo marca como pagado; con varios, abre la lista de plazos.
 */
function PaymentCell({
  item,
  onMarkPaid,
  expanded,
  onToggle,
  panelId,
  className,
}: {
  item: BudgetItem;
  onMarkPaid: (item: BudgetItem) => void;
  expanded: boolean;
  onToggle: (item: BudgetItem) => void;
  panelId: string;
  className?: string;
}) {
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const payments = itemPayments(item);
  const multi = payments.installments.length > 1;
  const overdue = payments.nextDue ? isOverdue(payments.nextDue) : false;

  const toggle = multi && (
    <button
      type="button"
      onClick={() => onToggle(item)}
      aria-expanded={expanded}
      aria-controls={panelId}
      aria-label={t("list.installmentsToggleAria", { name: item.concept })}
      className={PAY_BUTTON}
    >
      {t("list.installmentsToggle", { paid: payments.paidCount, total: payments.installments.length })}
      <ChevronDownIcon
        aria-hidden="true"
        className={cn("size-4 transition-transform motion-reduce:transition-none", expanded && "rotate-180")}
      />
    </button>
  );

  if (payments.status === "paid") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-pale px-3 py-1 text-sm font-medium text-ink">
          <CheckIcon aria-hidden="true" className="size-4 text-green" />
          {t("list.state.paid")}
        </span>
        {toggle}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-ink">
          {payments.status === "partial"
            ? t("list.state.partial", { paid: formatMoney(payments.paid, lang), cost: formatMoney(payments.cost, lang) })
            : t("list.state.pending")}
        </span>
        {payments.nextDue && (
          <span className={cn("text-xs", overdue ? "font-medium text-danger" : "text-ink-muted")}>
            {overdue
              ? t("list.state.overdue", { date: formatDue(payments.nextDue, lang) })
              : t("list.state.due", { date: formatDue(payments.nextDue, lang) })}
          </span>
        )}
      </div>
      {multi ? (
        toggle
      ) : (
        <button
          type="button"
          onClick={() => onMarkPaid(item)}
          aria-label={t("list.markPaidAria", { name: item.concept })}
          className={PAY_BUTTON}
        >
          <CheckIcon aria-hidden="true" className="size-4" />
          {t("list.markPaid")}
        </button>
      )}
    </div>
  );
}

/** Lista de plazos de una partida, cada uno con su botón para marcarlo (o desmarcarlo) como pagado. */
function InstallmentsPanel({
  item,
  id,
  onToggle,
}: {
  item: BudgetItem;
  id: string;
  onToggle: (item: BudgetItem, installment: BudgetInstallment) => void;
}) {
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const installments = itemInstallments(item);
  const payments = itemPayments(item);
  return (
    <div id={id} className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2" aria-label={t("list.installmentsLabel", { name: item.concept })}>
        {installments.map((p, index) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-line bg-raised px-3.5 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {t("list.installmentLine", { n: index + 1, amount: formatMoney(p.amount, lang) })}
              </p>
              <p className="text-xs text-ink-muted">
                {p.paid
                  ? p.paidDate
                    ? t("list.paidOn", { date: formatDue(p.paidDate, lang) })
                    : t("list.state.paid")
                  : p.dueDate
                    ? isOverdue(p.dueDate)
                      ? t("list.state.overdue", { date: formatDue(p.dueDate, lang) })
                      : t("list.state.due", { date: formatDue(p.dueDate, lang) })
                    : t("list.noDueDate")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggle(item, p)}
              aria-label={
                p.paid
                  ? t("list.unmarkInstallmentAria", { n: index + 1, name: item.concept })
                  : t("list.markInstallmentAria", { n: index + 1, name: item.concept })
              }
              className={PAY_BUTTON}
            >
              <CheckIcon aria-hidden="true" className={cn("size-4", !p.paid && "opacity-0")} />
              {p.paid ? t("list.unmarkInstallment") : t("list.markPaid")}
            </button>
          </li>
        ))}
      </ul>
      {payments.pending > 0 && payments.installments.every((p) => p.paid) && (
        <p className="text-xs text-ink-muted">{t("list.remainingNoInstallment", { amount: formatMoney(payments.pending, lang) })}</p>
      )}
    </div>
  );
}

/** Importes de una partida: lo que cuesta (real o previsto) y, si hay real, lo previsto debajo. */
function AmountCell({ item, align = "left" }: { item: BudgetItem; align?: "left" | "right" }) {
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const real = itemActual(item);
  return (
    <div className={cn("flex flex-col", align === "right" && "items-end")}>
      <span className="font-display text-xl font-semibold leading-tight text-ink md:text-base md:font-medium md:text-ink-strong">
        {formatMoney(real ?? item.amount, lang)}
      </span>
      {real !== null && (
        <span className="text-xs text-ink-muted">
          {t("list.plannedLine", { amount: formatMoney(item.amount, lang) })}
        </span>
      )}
    </div>
  );
}

/** Proveedor y pagador de una partida, como pequeñas etiquetas. */
function TagsLine({ vendorName, payer }: { vendorName: string | null; payer: string | null }) {
  const { t } = useTranslation("budget");
  if (!vendorName && !payer) return null;
  return (
    <p className="mt-1 flex flex-wrap gap-1.5">
      {vendorName && (
        <span className="rounded-full bg-lilac-soft px-2.5 py-0.5 text-xs text-ink">
          {t("list.vendorTag", { name: vendorName })}
        </span>
      )}
      {payer && (
        <span className="rounded-full bg-sage-pale px-2.5 py-0.5 text-xs text-ink">
          {t("list.payerTag", { name: payer })}
        </span>
      )}
    </p>
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
  const budgetTotal = plan?.budgetTotal ?? 0;
  const { data: stored, loading } = useCollection(budgetItemsQuery(planId), mapBudgetItem);
  const { data: vendorList } = useCollection(vendorsQuery(planId), mapVendor);
  const { settings } = useBudgetPlan(planId);
  // Cambios aún sin confirmar por Firestore: se ven al instante.
  const [pendingPatch, setPendingPatch] = React.useState<Record<string, Partial<BudgetItem>>>({});
  const [announcement, setAnnouncement] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const [allocationOpen, setAllocationOpen] = React.useState(false);
  useOpenAllocationFromLink(() => setAllocationOpen(true));

  const items = React.useMemo(
    () => stored.map((i) => (i.id in pendingPatch ? { ...i, ...pendingPatch[i.id] } : i)),
    [stored, pendingPatch]
  );
  // Las categorías usadas y las del reparto (sin repetir), para sugerirlas en el formulario.
  const categories = React.useMemo(() => {
    const seen = new Set<string>();
    return [...listCategories(items), ...settings.allocations.map((a) => a.category)].filter((c) => {
      const key = normalize(c);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items, settings.allocations]);
  const payers = React.useMemo(() => listCustomPayers(items), [items]);
  const vendorNames = React.useMemo(() => new Map(vendorList.map((v) => [v.id, v.name])), [vendorList]);
  const vendorOf = (item: BudgetItem) => (item.vendorId ? (vendorNames.get(item.vendorId) ?? null) : null);
  const payerOf = (item: BudgetItem) => {
    const payer = (item.payer ?? "").trim();
    return payer ? payerLabel(payer, t, settings.payerLabels) : null;
  };

  /** Guarda los plazos de una partida (y su resumen). Siempre escribe también el importe: así una partida antigua pasa al modelo actual. */
  async function saveInstallments(item: BudgetItem, installments: BudgetInstallment[]) {
    const patch = installmentsPatch(item, installments);
    setPendingPatch((prev) => ({ ...prev, [item.id]: patch }));
    try {
      await updateBudgetItem(planId, item.id, patch);
    } finally {
      setPendingPatch((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }

  const original = (item: BudgetItem) => stored.find((i) => i.id === item.id) ?? item;

  async function handleMarkPaid(item: BudgetItem) {
    // La partida tal como está guardada (sin otro cambio aún por confirmar).
    const base = original(item);
    const before = itemInstallments(base);
    const cost = itemPayments(base).cost;
    const today = todayISO();
    const after = before.map((p) =>
      p.paid ? p : { ...p, paid: true, paidDate: today, amount: before.length === 1 ? cost : p.amount }
    );
    try {
      await saveInstallments(base, after);
    } catch {
      toast.error(t("list.markPaidError"));
      return;
    }
    setAnnouncement(t("list.paidAnnouncement", { name: item.concept }));
    toastWithUndo(t("list.markedPaid", { name: item.concept }), () => saveInstallments(base, before));
  }

  async function handleToggleInstallment(item: BudgetItem, installment: BudgetInstallment) {
    const base = original(item);
    const before = itemInstallments(base);
    const nowPaid = !installment.paid;
    const after = before.map((p) =>
      p.id === installment.id ? { ...p, paid: nowPaid, paidDate: nowPaid ? todayISO() : null } : p
    );
    try {
      await saveInstallments(base, after);
    } catch {
      toast.error(t("list.markPaidError"));
      return;
    }
    const n = before.findIndex((p) => p.id === installment.id) + 1;
    if (nowPaid) {
      setAnnouncement(t("list.installmentPaidAnnouncement", { n, name: item.concept }));
      toastWithUndo(t("list.installmentMarkedPaid", { n, name: item.concept }), () => saveInstallments(base, before));
    } else {
      setAnnouncement(t("list.installmentUnmarkedAnnouncement", { n, name: item.concept }));
    }
  }

  function toggleExpanded(item: BudgetItem) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(item.id)) next.add(item.id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    // La partida tal como está guardada (sin el cambio de «pagado» aún pendiente).
    const item = stored.find((i) => i.id === id);
    try {
      await deleteBudgetItem(planId, id);
      if (item) toastWithUndo(t("list.deleted"), () => restoreBudgetItem(planId, item));
      else toast.success(t("list.deleted"));
    } catch {
      toast.error(t("list.deleteError"));
    }
  }

  const allocationButton = (
    <button type="button" onClick={() => setAllocationOpen(true)} className={cn(CTA_SECONDARY, "h-11")}>
      <PieChartIcon aria-hidden="true" className="size-4" />
      {t("list.allocate")}
    </button>
  );

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div>
        <h2 className={SECTION_TITLE}>{t("list.title")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("list.description")}</p>
      </div>
      {!loading && (
        <div className="flex flex-wrap items-center gap-2">
          {allocationButton}
          {items.length > 0 && (
            <>
              <BudgetExportButton
                planId={planId}
                items={items}
                vendors={vendorList}
                payerLabels={settings.payerLabels}
                budgetTotal={budgetTotal}
              />
              <BudgetItemFormDialog planId={planId} categories={categories} payers={payers} />
              <BudgetIdeas planId={planId} budgetTotal={budgetTotal} items={items} align="end" />
            </>
          )}
        </div>
      )}
    </div>
  );

  const allocationDialog = <BudgetAllocationDialog open={allocationOpen} onOpenChange={setAllocationOpen} />;

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <BudgetSkeleton />
        {allocationDialog}
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
            <BudgetItemFormDialog planId={planId} categories={categories} payers={payers} />
            <BudgetIdeas planId={planId} budgetTotal={budgetTotal} items={items} align="center" />
          </div>
        </div>
      ) : (
        <>
          <BudgetBreakdown
            items={items}
            allocations={settings.allocations}
            onOpenAllocation={() => setAllocationOpen(true)}
          />
          <BudgetPayers planId={planId} items={items} settings={settings} />

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
              {items.map((item) => {
                const panelId = `installments-m-${item.id}`;
                return (
                  <li key={item.id} className={cn(CARD, "flex flex-col gap-3 p-4")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-display text-lg font-semibold leading-snug text-ink-strong">
                          {item.concept}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-muted">{item.category ? categoryLabel(item.category, t) : t("uncategorised")}</p>
                        <TagsLine vendorName={vendorOf(item)} payer={payerOf(item)} />
                      </div>
                      <div className="-mr-2 -mt-1 flex shrink-0">
                        <BudgetItemFormDialog
                          planId={planId}
                          item={item}
                          categories={categories}
                          payers={payers}
                          trigger={<EditBudgetItemTrigger concept={item.concept} />}
                        />
                        <DeleteIconButton
                          ariaLabel={t("list.deleteAria", { name: item.concept })}
                          onDelete={() => handleDelete(item.id)}
                        />
                      </div>
                    </div>
                    <AmountCell item={item} />
                    <PaymentCell
                      item={item}
                      onMarkPaid={handleMarkPaid}
                      expanded={expanded.has(item.id)}
                      onToggle={toggleExpanded}
                      panelId={panelId}
                      className="min-h-10"
                    />
                    {expanded.has(item.id) && (
                      <InstallmentsPanel item={item} id={panelId} onToggle={handleToggleInstallment} />
                    )}
                  </li>
                );
              })}
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
                  {items.map((item) => {
                    const panelId = `installments-d-${item.id}`;
                    const open = expanded.has(item.id);
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="border-t border-line transition-colors hover:bg-page/60">
                          <td className="max-w-72 px-5 py-3 align-middle font-medium text-ink-strong">
                            <span className="break-words">{item.concept}</span>
                            <TagsLine vendorName={vendorOf(item)} payer={payerOf(item)} />
                          </td>
                          <td className="px-3 py-3 align-middle text-ink-muted">{item.category ? categoryLabel(item.category, t) : t("uncategorised")}</td>
                          <td className="px-3 py-3 text-right align-middle tabular-nums text-ink-strong">
                            <AmountCell item={item} align="right" />
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <PaymentCell
                              item={item}
                              onMarkPaid={handleMarkPaid}
                              expanded={open}
                              onToggle={toggleExpanded}
                              panelId={panelId}
                            />
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <div className="flex justify-end">
                              <BudgetItemFormDialog
                                planId={planId}
                                item={item}
                                categories={categories}
                                payers={payers}
                                trigger={<EditBudgetItemTrigger concept={item.concept} />}
                              />
                              <DeleteIconButton
                                ariaLabel={t("list.deleteAria", { name: item.concept })}
                                onDelete={() => handleDelete(item.id)}
                              />
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-page/40">
                            <td colSpan={5} className="px-5 pb-4 pt-1">
                              <InstallmentsPanel item={item} id={panelId} onToggle={handleToggleInstallment} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {allocationDialog}
    </div>
  );
}
