"use client";

import { PlusIcon } from "lucide-react";

import { Skeleton } from "@/components/dashboard/ui";
import { EmptyVendorCard, VendorCard } from "@/components/vendors/vendor-card";
import { SLIDE_WIDTH, VendorCarousel } from "@/components/vendors/vendor-carousel";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { groupVendors } from "@/components/vendors/vendor-model";
import { vendorsQuery, mapVendor } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { cn } from "@/lib/utils";

const PANEL = "rounded-2xl border border-[#E5DDEC] bg-white p-5 sm:p-8";

function SectionSkeleton() {
  return (
    <div className={cn(PANEL, "flex flex-col gap-6")}>
      <Skeleton className="h-7 w-44" />
      <div className={cn("mx-auto overflow-hidden rounded-2xl border border-[#E5DDEC] bg-white", SLIDE_WIDTH)}>
        <Skeleton className="aspect-[4/3] w-full rounded-none bg-[#ECE6F4]" />
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VendorsList({ planId }: { planId: string }) {
  const { data: vendors, loading } = useCollection(vendorsQuery(planId), mapVendor);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 sm:gap-8" role="status" aria-label="Cargando proveedores">
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  const groups = groupVendors(vendors);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {groups.map(({ category, vendors: options }, index) => (
        <section key={category} aria-labelledby={`vendors-section-${index}`} className={cn(PANEL, "flex flex-col gap-6")}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex min-w-0 items-baseline gap-3">
              <h3
                id={`vendors-section-${index}`}
                className="font-display text-lg font-semibold text-[#26413C] sm:text-xl"
              >
                {category}
              </h3>
              <span className="text-sm text-[#586C64]">
                {options.length === 0
                  ? "Sin opciones aún"
                  : options.length === 1
                    ? "1 opción"
                    : `${options.length} opciones`}
              </span>
            </div>
            {options.length > 0 && (
              <VendorFormDialog
                planId={planId}
                defaultCategory={category}
                trigger={
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[#26413C] outline-none transition-colors hover:bg-[#ECE6F4] focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    <PlusIcon className="size-4" aria-hidden="true" />
                    Añadir otra
                  </button>
                }
              />
            )}
          </div>
          {options.length === 0 ? (
            <EmptyVendorCard planId={planId} category={category} />
          ) : (
            <VendorCarousel
              label={category}
              slides={options.map((vendor) => ({
                key: vendor.id,
                name: vendor.name,
                render: (active) => <VendorCard planId={planId} vendor={vendor} active={active} />,
              }))}
            />
          )}
        </section>
      ))}
    </div>
  );
}
