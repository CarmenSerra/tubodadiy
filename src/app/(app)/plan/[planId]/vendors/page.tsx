"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { CTA_PRIMARY, SECTION_TITLE } from "@/components/dashboard/ui";
import { VendorIdeas } from "@/components/ideas/vendor-ideas";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { VendorsList } from "@/components/vendors/vendors-list";
import { NEW_VENDOR_PARAM } from "@/components/plan/task-links";
import { usePlanContext } from "@/lib/context/plan-context";

/**
 * Enlace directo `?nuevo=Catering`: abre «Nuevo proveedor» con esa categoría
 * (lo usan las flechas de las tareas «Contratar…»). El parámetro se limpia de
 * la URL al abrirse, para que cerrar y recargar no lo vuelva a abrir.
 */
function NewVendorFromLink({ planId }: { planId: string }) {
  const searchParams = useSearchParams();
  const requested = searchParams.get(NEW_VENDOR_PARAM)?.trim().slice(0, 40) || null;
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!requested) return;
    // Abrir por enlace: sincroniza el diálogo con la URL y consume el parámetro.
    /* eslint-disable react-hooks/set-state-in-effect */
    setCategory(requested);
    setOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const url = new URL(window.location.href);
    url.searchParams.delete(NEW_VENDOR_PARAM);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [requested]);

  return (
    <VendorFormDialog
      planId={planId}
      defaultCategory={category}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

export default function VendorsPage() {
  const { planId } = usePlanContext();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className={SECTION_TITLE}>Proveedores</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Compara tus opciones por categoría y quédate con la que más te enamore.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VendorFormDialog
            planId={planId}
            trigger={
              <button type="button" className={CTA_PRIMARY}>
                <PlusIcon className="size-4" aria-hidden="true" />
                Añadir proveedor
              </button>
            }
          />
          <VendorIdeas planId={planId} align="end" />
        </div>
      </div>
      <VendorsList planId={planId} />
      {/* useSearchParams pide un límite de Suspense. */}
      <React.Suspense fallback={null}>
        <NewVendorFromLink planId={planId} />
      </React.Suspense>
    </div>
  );
}
