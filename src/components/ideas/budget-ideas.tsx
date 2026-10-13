"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_SECONDARY } from "@/components/dashboard/ui";
import { categoryLabel, formatMoney } from "@/components/budget/budget-math";
import { IdeasList, type IdeaItem } from "@/components/ideas/ideas-list";
import { IdeasPanel, type IdeasPanelContext } from "@/components/ideas/ideas-panel";
import { ideaKey, titlesInAllLanguages } from "@/components/ideas/ideas-text";
import { addBudgetItem, addBudgetItems } from "@/lib/firebase/mutations";
import { useLanguage } from "@/lib/i18n/provider";
import { BUDGET_CATEGORY_IDEAS, suggestBudget } from "@/lib/ideas";
import type { BudgetItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type NewItem = Omit<BudgetItem, "id" | "createdAt">;

/**
 * Partida nueva: la categoría se guarda con su nombre de siempre (español); el concepto es texto del
 * usuario y lleva el nombre de la categoría en el idioma activo; el importe es el orientativo.
 */
function toBudgetItem(category: string, concept: string, amount: number): NewItem {
  return { category, concept, amount, state: "pending", dueDate: null };
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
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const hasTotal = Number.isFinite(budgetTotal) && budgetTotal > 0;
  const amounts = React.useMemo(
    () => new Map(suggestBudget(budgetTotal).map((row) => [row.category, row.amount])),
    [budgetTotal]
  );
  const existing = React.useMemo(
    () => new Set(items.flatMap((i) => [ideaKey(i.category), ideaKey(i.concept)])),
    [items]
  );
  const conceptOf = React.useCallback((category: string) => categoryLabel(category, t), [t]);

  const rows = React.useMemo<IdeaItem[]>(
    () =>
      BUDGET_CATEGORY_IDEAS.map((idea) => {
        const amount = amounts.get(idea.category) ?? 0;
        const title = conceptOf(idea.category);
        const concepts = Object.values(
          t(`ideas.items.${idea.slug}.concepts`, { returnObjects: true }) as Record<string, string>
        );
        return {
          key: idea.slug,
          title,
          // Un solo texto: el consejo si lo hay y, si no, qué suele incluir la partida.
          hint: idea.hasHint
            ? t(`ideas.items.${idea.slug}.hint`)
            : t("ideas.usuallyIncludes", {
                list: concepts.slice(0, 3).join(", "),
                more: concepts.length > 3 ? "…" : ".",
              }),
          pills: hasTotal ? [`${idea.share} %`, `≈ ${formatMoney(amount, lang)}`] : [`${idea.share} %`],
          // Se reconoce por el nombre guardado (español) o por el del concepto, en cualquier idioma.
          present:
            existing.has(ideaKey(idea.category)) ||
            titlesInAllLanguages(`categories.${idea.slug}`, "budget").some((text) => existing.has(ideaKey(text))),
          addLabel: t("ideas.addAria", { title }),
          onAdd: () => addBudgetItem(planId, toBudgetItem(idea.category, title, amount)),
        };
      }),
    [amounts, existing, hasTotal, planId, conceptOf, t, lang]
  );

  return (
    <IdeasPanel
      title={t("ideas.title")}
      description={hasTotal ? t("ideas.descriptionWithTotal") : t("ideas.descriptionNoTotal")}
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
          addedMessage={t("ideas.added")}
          errorMessage={t("ideas.error")}
          emptyText={t("ideas.empty")}
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
  const { t } = useTranslation("budget");
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
        BUDGET_CATEGORY_IDEAS.map((idea) =>
          toBudgetItem(idea.category, categoryLabel(idea.category, t), amounts.get(idea.category) ?? 0)
        )
      );
      toast.success(t("ideas.addAll.done", { number: count }), { id: "ideas-added" });
      ctx.close();
    } catch {
      toast.error(t("ideas.addAll.error"));
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
        {t("ideas.addAll.button")}
      </button>
    );
  }

  return (
    <div role="group" aria-label={t("ideas.addAll.confirmLabel")} className="flex flex-col gap-3">
      <p className="text-[13px] leading-snug text-ink">
        {hasTotal
          ? t("ideas.addAll.confirmWithTotal", { number: count })
          : t("ideas.addAll.confirmNoTotal", { number: count })}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className={cn(CTA_SECONDARY, "h-10 flex-1 px-3 focus-visible:ring-offset-surface")}
        >
          {t("form.cancel")}
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
          {saving ? t("ideas.addAll.adding") : t("ideas.addAll.confirm", { number: count })}
        </button>
      </div>
    </div>
  );
}
