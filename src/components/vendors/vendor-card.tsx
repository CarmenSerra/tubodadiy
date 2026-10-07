"use client";

import { MapPinIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { CARD, FOCUS } from "@/components/dashboard/ui";
import { ConfirmDelete } from "@/components/vendors/vendor-confirm-delete";
import { IconTrigger } from "@/components/vendors/vendor-brand";
import { VendorContactDialog } from "@/components/vendors/vendor-contact-dialog";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { EMPTY_COPY } from "@/components/vendors/vendor-model";
import { VendorPhoto, VendorPlaceholder } from "@/components/vendors/vendor-photo";
import { VendorStatusBadge } from "@/components/vendors/vendor-status";
import { deleteVendor } from "@/lib/firebase/mutations";
import type { Vendor } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

/** Ancho de las tarjetas del carrusel (también del hueco vacío y del esqueleto). */
export const CARD_WIDTH = "w-[17.5rem] sm:w-[18.25rem]";

export function VendorCard({ planId, vendor }: { planId: string; vendor: Vendor }) {
  async function handleDelete() {
    try {
      await deleteVendor(planId, vendor.id);
      toast.success("Proveedor eliminado");
    } catch {
      toast.error("No se ha podido eliminar el proveedor.");
    }
  }

  const location = vendor.location?.trim();

  return (
    <article
      aria-label={vendor.name}
      className={cn(CARD, "group/card flex shrink-0 snap-start flex-col bg-white", CARD_WIDTH)}
    >
      <div className="relative">
        <VendorPhoto photoUrl={vendor.photoUrl} name={vendor.name} category={vendor.category} />
        <div className="absolute top-2.5 right-2.5 flex gap-1.5">
          <VendorFormDialog
            planId={planId}
            vendor={vendor}
            trigger={
              <IconTrigger label={`Editar ${vendor.name}`}>
                <PencilIcon aria-hidden="true" />
              </IconTrigger>
            }
          />
          <ConfirmDelete
            itemLabel={`a ${vendor.name}`}
            onConfirm={handleDelete}
            trigger={
              <IconTrigger label={`Eliminar ${vendor.name}`}>
                <Trash2Icon aria-hidden="true" />
              </IconTrigger>
            }
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 bg-white p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-lg leading-snug font-semibold text-[#102D28]">
            {vendor.name}
          </h3>
          {vendor.cost !== null ? (
            <p className="mt-1 text-base font-medium text-[#26413C]">{formatCurrency(vendor.cost)}</p>
          ) : (
            <p className="mt-1 text-sm text-[#586C64]">Precio por confirmar</p>
          )}
          {location && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#586C64]">
              <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <VendorStatusBadge status={vendor.status} />
          <VendorContactDialog vendor={vendor} />
        </div>
      </div>
    </article>
  );
}

/** Hueco inviting de una categoría vacía: abre el formulario con la categoría ya elegida. */
export function EmptyVendorCard({ planId, category }: { planId: string; category: string }) {
  const copy = EMPTY_COPY[category] ?? {
    title: `Añade tu primera opción de ${category.toLowerCase()}`,
    cta: "Añadir opción",
  };
  return (
    <VendorFormDialog
      planId={planId}
      defaultCategory={category}
      trigger={
        <button
          type="button"
          className={cn(
            "group/card flex shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-dashed border-[#D4C0EA] bg-white text-left",
            "transition-colors hover:border-[#927AAC]",
            FOCUS,
            CARD_WIDTH
          )}
        >
          <div className="aspect-[4/3] w-full">
            <VendorPlaceholder category={category} muted />
          </div>
          <span className="flex flex-col gap-3 p-4">
            <span className="font-display text-lg leading-snug font-semibold text-[#102D28]">
              {copy.title}
            </span>
            <span className="text-sm text-[#586C64]">
              Guarda aquí las opciones que estás comparando.
            </span>
            <span className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-[#927AAC] px-5 text-sm font-medium text-white">
              <PlusIcon className="size-4" aria-hidden="true" />
              {copy.cta}
            </span>
          </span>
        </button>
      }
    />
  );
}
