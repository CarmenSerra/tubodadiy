"use client";

import { PlusIcon } from "lucide-react";

import { CTA_PRIMARY, SECTION_TITLE } from "@/components/dashboard/ui";
import { VendorIdeas } from "@/components/ideas/vendor-ideas";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { VendorsList } from "@/components/vendors/vendors-list";
import { usePlanContext } from "@/lib/context/plan-context";

export default function VendorsPage() {
  const { planId } = usePlanContext();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className={SECTION_TITLE}>Proveedores</h2>
          <p className="mt-1 text-sm text-[#586C64]">
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
    </div>
  );
}
