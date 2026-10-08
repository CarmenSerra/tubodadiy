"use client";

import * as React from "react";

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
  const { data: vendors } = useCollection(vendorsQuery(planId), mapVendor);
  const [form, setForm] = React.useState<{ open: boolean; category?: string; opener?: HTMLElement | null }>({
    open: false,
  });

  const items = React.useMemo<IdeaItem[]>(() => {
    const missing = missingVendorTypes(vendors.map((v) => v.category));
    // Estable: imprescindibles primero y, dentro de cada bloque, el orden curado.
    const sorted = [...missing].sort((a, b) => Number(b.essential) - Number(a.essential));
    return sorted.map((idea) => ({
      key: idea.category,
      title: idea.category,
      hint: idea.hint,
      tag: idea.essential ? "Imprescindible" : undefined,
      pills: idea.whenToBook ? [`Reservar: ${idea.whenToBook}`] : undefined,
      // No crea nada: abre el formulario con la categoría puesta.
      markAdded: false,
      addLabel: `Añadir proveedor de «${idea.category}»`,
      onAdd: (ctx) => ctx.handoff((opener) => setForm({ open: true, category: idea.category, opener })),
    }));
  }, [vendors]);

  return (
    <>
      <IdeasPanel
        title="Ideas de proveedores"
        description="Te pueden faltar estos tipos. Al elegir uno se abre el formulario con la categoría puesta."
        align={align}
        className={className}
      >
        {(ctx) => (
          <IdeasList
            items={items}
            ctx={ctx}
            gender="m"
            addedMessage="Proveedor añadido"
            errorMessage="No se ha podido abrir el formulario."
            emptyText="Tienes todos los tipos de proveedor habituales. ¡Buen trabajo!"
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
