"use client";

import * as React from "react";
import { toast } from "sonner";

import { CTA_SECONDARY } from "@/components/dashboard/ui";
import { formatMoney } from "@/components/budget/budget-math";
import { IdeasList, type IdeaItem } from "@/components/ideas/ideas-list";
import { IdeasPanel, type IdeasPanelContext } from "@/components/ideas/ideas-panel";
import { ideaKey } from "@/components/ideas/ideas-text";
import { addBudgetItem, addBudgetItems } from "@/lib/firebase/mutations";
import { BUDGET_CATEGORY_IDEAS, suggestBudget } from "@/lib/ideas";
import type { BudgetItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type NewItem = Omit<BudgetItem, "id" | "createdAt">;

/** Partida nueva: la categoría da nombre al concepto y el importe es el orientativo. */
function toBudgetItem(category: string, amount: number): NewItem {
  return { category, concept: category, amount, state: "pending", dueDate: null };
}

/**
 * «✨ Ideas» del presupuesto: partidas típicas con su % orientativo y, si el
 * plan tiene presupuesto total, el importe sugerido. Sin partidas aún, permite
 * crear todas de golpe (con confirmación).
 */
export function BudgetIdeas({
  planId,
  budgetTotal,
  items,
  align,
  className,
}: {
  planId: string;
  budgetTotal: number;
  items: BudgetItem[];
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const hasTotal = Number.isFinite(budgetTotal) && budgetTotal > 0;
  const amounts = React.useMemo(
    () => new Map(suggestBudget(budgetTotal).map((row) => [row.category, row.amount])),
    [budgetTotal]
  );
  const existing = React.useMemo(
    () => new Set(items.flatMap((i) => [ideaKey(i.category), ideaKey(i.concept)])),
    [items]
  );

  const rows = React.useMemo<IdeaItem[]>(
    () =>
      BUDGET_CATEGORY_IDEAS.map((idea) => {
        const amount = amounts.get(idea.category) ?? 0;
        return {
          key: ideaKey(idea.category),
          title: idea.category,
          // Un solo texto: el consejo si lo hay y, si no, qué suele incluir la partida.
          hint:
            idea.hint ??
            `Suele incluir: ${idea.concepts.slice(0, 3).join(", ")}${idea.concepts.length > 3 ? "…" : "."}`,
          pills: hasTotal ? [`${idea.share} %`, `≈ ${formatMoney(amount)}`] : [`${idea.share} %`],
          present: existing.has(ideaKey(idea.category)),
          addLabel: `Añadir «${idea.category}»`,
          onAdd: () => addBudgetItem(planId, toBudgetItem(idea.category, amount)),
        };
      }),
    [amounts, existing, hasTotal, planId]
  );

  return (
    <IdeasPanel
      title="Ideas para tu presupuesto"
      description={
        hasTotal
          ? "Un reparto orientativo de tu presupuesto. Cada partida se crea con un importe estimado que puedes cambiar."
          : "Partidas típicas con su % orientativo. Si indicas tu presupuesto total en el plan, verás también los importes."
      }
      align={align}
      className={className}
      footer={
        items.length === 0
          ? (ctx) => <AddAllFooter planId={planId} hasTotal={hasTotal} amounts={amounts} ctx={ctx} />
          : undefined
      }
    >
      {(ctx) => (
        <IdeasList
          items={rows}
          ctx={ctx}
          addedMessage="Partida añadida"
          errorMessage="No se ha podido añadir la partida."
          emptyText="Ya tienes todas las partidas habituales."
        />
      )}
    </IdeasPanel>
  );
}

/** «Añadir todas las partidas sugeridas», con una confirmación en el propio pie (sin más diálogos). */
function AddAllFooter({
  planId,
  hasTotal,
  amounts,
  ctx,
}: {
  planId: string;
  hasTotal: boolean;
  amounts: Map<string, number>;
  ctx: IdeasPanelContext;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  const startRef = React.useRef<HTMLButtonElement>(null);
  const count = BUDGET_CATEGORY_IDEAS.length;

  React.useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  async function handleConfirm() {
    setSaving(true);
    try {
      await addBudgetItems(
        planId,
        BUDGET_CATEGORY_IDEAS.map((idea) => toBudgetItem(idea.category, amounts.get(idea.category) ?? 0))
      );
      toast.success(`${count} partidas añadidas`, { id: "ideas-added" });
      ctx.close();
    } catch {
      toast.error("No se han podido añadir las partidas.");
      setSaving(false);
    }
  }

  function cancel() {
    setConfirming(false);
    window.setTimeout(() => startRef.current?.focus(), 0);
  }

  if (!confirming) {
    return (
      <button
        ref={startRef}
        type="button"
        onClick={() => setConfirming(true)}
        className={cn(CTA_SECONDARY, "h-10 w-full focus-visible:ring-offset-surface")}
      >
        Añadir todas las partidas sugeridas
      </button>
    );
  }

  return (
    <div role="group" aria-label="Confirmar partidas sugeridas" className="flex flex-col gap-3">
      <p className="text-[13px] leading-snug text-ink">
        Se crearán {count} partidas
        {hasTotal
          ? " con el importe estimado según tu presupuesto total. Podrás editarlas después."
          : " sin importe; podrás ponerlo y editarlas después."}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className={cn(CTA_SECONDARY, "h-10 flex-1 px-3 focus-visible:ring-offset-surface")}
        >
          Cancelar
        </button>
        <button
          ref={confirmRef}
          type="button"
          onClick={() => void handleConfirm()}
          disabled={saving}
          className={cn(
            "inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-cta px-3 text-sm font-medium text-on-cta transition-opacity hover:opacity-90 disabled:opacity-60",
            "outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          )}
        >
          {saving ? "Añadiendo…" : `Sí, añadir las ${count}`}
        </button>
      </div>
    </div>
  );
}
