"use client";

import { Loader2, StoreIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { VendorFormDialog, EditVendorTrigger } from "@/components/vendors/vendor-form-dialog";
import { useCollection } from "@/lib/hooks/use-collection";
import { vendorsQuery, mapVendor } from "@/lib/firebase/plans";
import { deleteVendor } from "@/lib/firebase/mutations";
import { formatCurrency } from "@/lib/utils";
import type { VendorStatus } from "@/lib/types";

const STATUS_LABEL: Record<VendorStatus, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  considering: { label: "Valorando", variant: "secondary" },
  contacted: { label: "Contactado", variant: "warning" },
  booked: { label: "Contratado", variant: "success" },
  declined: { label: "Descartado", variant: "destructive" },
};

export function VendorsList({ planId }: { planId: string }) {
  const { data: vendors, loading } = useCollection(vendorsQuery(planId), mapVendor);

  async function handleDelete(id: string) {
    try {
      await deleteVendor(planId, id);
      toast.success("Proveedor eliminado");
    } catch {
      toast.error("No se ha podido eliminar el proveedor.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <StoreIcon className="size-8 text-primary" />
        <p className="font-display text-lg">Todavía no hay proveedores</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Añade catering, fotografía, música y demás proveedores para hacer seguimiento de su
          contratación.
        </p>
        <VendorFormDialog planId={planId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile: card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{vendor.name}</p>
                <p className="text-xs text-muted-foreground">{vendor.category}</p>
              </div>
              <Badge variant={STATUS_LABEL[vendor.status].variant}>
                {STATUS_LABEL[vendor.status].label}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(vendor.cost)}</p>
            {(vendor.contactEmail || vendor.contactPhone) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[vendor.contactEmail, vendor.contactPhone].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="mt-3 flex justify-end gap-1">
              <VendorFormDialog planId={planId} vendor={vendor} trigger={<EditVendorTrigger />} />
              <DeleteConfirmButton itemLabel={`a ${vendor.name}`} onConfirm={() => handleDelete(vendor.id)} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 font-medium">Contacto</th>
              <th className="px-4 py-2 font-medium">Coste</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {vendors.map((vendor) => (
              <tr key={vendor.id}>
                <td className="px-4 py-2 font-medium">{vendor.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{vendor.category}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {[vendor.contactEmail, vendor.contactPhone].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{formatCurrency(vendor.cost)}</td>
                <td className="px-4 py-2">
                  <Badge variant={STATUS_LABEL[vendor.status].variant}>
                    {STATUS_LABEL[vendor.status].label}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <VendorFormDialog planId={planId} vendor={vendor} trigger={<EditVendorTrigger />} />
                    <DeleteConfirmButton itemLabel={`a ${vendor.name}`} onConfirm={() => handleDelete(vendor.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
