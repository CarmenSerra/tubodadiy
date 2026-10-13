"use client";

import { MapPinIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CARD } from "@/components/dashboard/ui";
import { IconTrigger, ROW_FOCUS as FOCUS_WHITE } from "@/components/vendors/vendor-brand";
import { SLIDE_WIDTH } from "@/components/vendors/vendor-carousel";
import { VendorContactDialog } from "@/components/vendors/vendor-contact-dialog";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { categoryLabel, categorySlug } from "@/components/vendors/vendor-model";
import { VendorPhoto, VendorPlaceholder } from "@/components/vendors/vendor-photo";
import { VendorStatusBadge } from "@/components/vendors/vendor-status";
import { deleteVendor, restoreVendor } from "@/lib/firebase/mutations";
import { useLanguage } from "@/lib/i18n/provider";
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
  const { t } = useTranslation("vendors");
  const { lang } = useLanguage();

  async function handleDelete() {
    try {
      await deleteVendor(planId, vendor.id);
      toastWithUndo(t("card.deleted"), () => restoreVendor(planId, vendor));
    } catch {
      toast.error(t("card.deleteError"));
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
        <VendorPhoto
          photoData={vendor.photoData}
          photoUrl={vendor.photoUrl}
          name={vendor.name}
          category={vendor.category}
          seed={vendor.placeId ?? vendor.id}
          kind={vendor.placeKind ?? vendor.category}
        />
        <div className="absolute top-2 right-2 flex gap-1.5">
          <VendorFormDialog
            planId={planId}
            vendor={vendor}
            trigger={
              <IconTrigger label={t("card.edit", { name: vendor.name })}>
                <PencilIcon aria-hidden="true" />
              </IconTrigger>
            }
          />
          <IconTrigger label={t("card.delete", { name: vendor.name })} onClick={() => void handleDelete()}>
            <Trash2Icon aria-hidden="true" />
          </IconTrigger>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 bg-raised p-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-base leading-snug font-semibold text-ink-strong">
            {vendor.name}
          </h3>
          {vendor.cost !== null ? (
            <p className="mt-0.5 text-sm font-medium text-ink">{formatCurrency(vendor.cost, lang)}</p>
          ) : (
            <p className="mt-0.5 text-sm text-ink-muted">{t("card.priceTbc")}</p>
          )}
          {location && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
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
  const { t } = useTranslation("vendors");
  const slug = categorySlug(category);
  const starter = slug === "venue" || slug === "catering" || slug === "photographer";
  const copy = starter
    ? { title: t(`empty.${slug}.title`), cta: t(`empty.${slug}.cta`) }
    : {
        title: t("empty.custom.title", { category: categoryLabel(category, t).toLowerCase() }),
        cta: t("empty.custom.cta"),
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
            <span className="flex flex-col gap-2.5 p-3">
              <span className="font-display text-base leading-snug font-semibold text-ink-strong">
                {copy.title}
              </span>
              <span className="text-sm text-ink-muted">
                {t("empty.hint")}
              </span>
              <span className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-cta px-4 text-sm font-medium text-on-cta">
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
