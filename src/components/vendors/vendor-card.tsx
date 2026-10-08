"use client";

import { MapPinIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { CARD } from "@/components/dashboard/ui";
import { IconTrigger, ROW_FOCUS as FOCUS_WHITE } from "@/components/vendors/vendor-brand";
import { SLIDE_WIDTH } from "@/components/vendors/vendor-carousel";
import { VendorContactDialog } from "@/components/vendors/vendor-contact-dialog";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { EMPTY_COPY } from "@/components/vendors/vendor-model";
import { VendorPhoto, VendorPlaceholder } from "@/components/vendors/vendor-photo";
import { VendorStatusBadge } from "@/components/vendors/vendor-status";
import { deleteVendor, restoreVendor } from "@/lib/firebase/mutations";
import type { Vendor } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Tarjeta de una opción. Dentro del carrusel solo la central (`active`) es
 * interactiva y lleva el zoom de la foto al pasar el ratón (grupo `group/card`);
 * las vecinas son decorativas y el carrusel las marca como `inert`.
 */
export function VendorCard({
  planId,
  vendor,
  active = true,
}: {
  planId: string;
  vendor: Vendor;
  active?: boolean;
}) {
  async function handleDelete() {
    try {
      await deleteVendor(planId, vendor.id);
      toastWithUndo("Proveedor eliminado", () => restoreVendor(planId, vendor));
    } catch {
      toast.error("No se ha podido eliminar el proveedor.");
    }
  }

  const location = vendor.location?.trim();

  return (
    <article
      aria-label={vendor.name}
      className={cn(
        CARD,
        "flex h-full w-full flex-col overflow-hidden bg-raised",
        active && "group/card shadow-lift"
      )}
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
          <IconTrigger label={`Eliminar ${vendor.name}`} onClick={() => void handleDelete()}>
            <Trash2Icon aria-hidden="true" />
          </IconTrigger>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 bg-raised p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-lg leading-snug font-semibold text-ink-strong">
            {vendor.name}
          </h3>
          {vendor.cost !== null ? (
            <p className="mt-1 text-base font-medium text-ink">{formatCurrency(vendor.cost)}</p>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">Precio por confirmar</p>
          )}
          {location && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
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

/** Hueco acogedor de una categoría vacía: abre el formulario con la categoría ya elegida. */
export function EmptyVendorCard({ planId, category }: { planId: string; category: string }) {
  const copy = EMPTY_COPY[category] ?? {
    title: `Añade tu primera opción de ${category.toLowerCase()}`,
    cta: "Añadir opción",
  };
  return (
    <div className={cn("mx-auto", SLIDE_WIDTH)}>
      <VendorFormDialog
        planId={planId}
        defaultCategory={category}
        trigger={
          <button
            type="button"
            className={cn(
              "group/card flex w-full flex-col overflow-hidden rounded-2xl border border-dashed border-line-strong bg-raised text-left",
              "transition-colors hover:border-lilac",
              FOCUS_WHITE
            )}
          >
            <div className="aspect-[4/3] w-full">
              <VendorPlaceholder category={category} muted />
            </div>
            <span className="flex flex-col gap-3 p-4">
              <span className="font-display text-lg leading-snug font-semibold text-ink-strong">
                {copy.title}
              </span>
              <span className="text-sm text-ink-muted">
                Guarda aquí las opciones que estás comparando.
              </span>
              <span className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-cta px-5 text-sm font-medium text-on-cta">
                <PlusIcon className="size-4" aria-hidden="true" />
                {copy.cta}
              </span>
            </span>
          </button>
        }
      />
    </div>
  );
}
