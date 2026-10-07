"use client";

import { usePlanContext } from "@/lib/context/plan-context";
import { VendorsList } from "@/components/vendors/vendors-list";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";

export default function VendorsPage() {
  const { planId } = usePlanContext();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Proveedores</h2>
        <VendorFormDialog planId={planId} />
      </div>
      <VendorsList planId={planId} />
    </div>
  );
}
