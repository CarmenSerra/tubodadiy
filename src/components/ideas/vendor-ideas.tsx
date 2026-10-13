"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { IdeasList, type IdeaItem } from "@/components/ideas/ideas-list";
import { IdeasPanel } from "@/components/ideas/ideas-panel";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { mapVendor, vendorsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { missingVendorTypes } from "@/lib/ideas";

/**
 * «✨ Ideas» de proveedores: los tipos que aún no tienes, los imprescindibles
 * primero. Al elegir uno se abre el formulario de proveedor con esa categoría.
 */
export function VendorIdeas({
  planId,
  align,
  className,
}: {
  planId: string;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const { t } = useTranslation("vendors");
  const { data: vendors } = useCollection(vendorsQuery(planId), mapVendor);
  const [form, setForm] = React.useState<{ open: boolean; category?: string; opener?: HTMLElement | null }>({
    open: false,
  });

  const items = React.useMemo<IdeaItem[]>(() => {
    const missing = missingVendorTypes(vendors.map((v) => v.category));
    // Estable: imprescindibles primero y, dentro de cada bloque, el orden curado.
    const sorted = [...missing].sort((a, b) => Number(b.essential) - Number(a.essential));
    return sorted.map((idea) => {
      const title = t(`categories.${idea.slug}`);
      return {
        key: idea.category,
        title,
        hint: t(`ideas.vendors.${idea.slug}.hint`),
        tag: idea.essential ? t("ideas.vendors.essential") : undefined,
        pills: idea.hasWhen ? [t("ideas.vendors.book", { when: t(`ideas.vendors.${idea.slug}.when`) })] : undefined,
        // No crea nada: abre el formulario con la categoría puesta (el valor guardado sigue en español).
        markAdded: false,
        addLabel: t("ideas.vendors.addAria", { title }),
        onAdd: (ctx) => ctx.handoff((opener) => setForm({ open: true, category: idea.category, opener })),
      };
    });
  }, [vendors, t]);

  return (
    <>
      <IdeasPanel
        title={t("ideas.vendors.title")}
        description={t("ideas.vendors.description")}
        align={align}
        className={className}
      >
        {(ctx) => (
          <IdeasList
            items={items}
            ctx={ctx}
            gender="m"
            addedMessage={t("ideas.vendors.added")}
            errorMessage={t("ideas.vendors.error")}
            emptyText={t("ideas.vendors.empty")}
          />
        )}
      </IdeasPanel>
      <VendorFormDialog
        planId={planId}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        defaultCategory={form.category}
        returnFocusTo={form.opener}
      />
    </>
  );
}
