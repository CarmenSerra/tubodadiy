"use client";

import * as React from "react";
import { ColumnsIcon, CompassIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/dashboard/ui";
import { EmptyVendorCard, VendorCard } from "@/components/vendors/vendor-card";
import { SLIDE_WIDTH, VendorCarousel } from "@/components/vendors/vendor-carousel";
import { VendorsExportButton } from "@/components/export/export-buttons";
import { VendorCompare } from "@/components/vendors/vendor-compare";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { VendorLocationFilter } from "@/components/vendors/vendor-location-filter";
import {
  categoryLabel,
  filterByLocation,
  groupVendors,
  isFilterAvailable,
  isVenueCategory,
  locationOptions,
  type LocationFilter,
} from "@/components/vendors/vendor-model";
import { VenueDiscovery } from "@/components/vendors/venue-discovery";
import { vendorsQuery, mapVendor } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import { cn } from "@/lib/utils";

const SECTION_ACTION =
  "inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink outline-none transition-colors hover:bg-lilac-soft focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const PANEL = "rounded-2xl border border-line bg-panel p-5 sm:p-8";

function SectionSkeleton() {
  return (
    <div className={cn(PANEL, "flex flex-col gap-6")}>
      <Skeleton className="h-7 w-44" />
      <div className={cn("mx-auto overflow-hidden rounded-2xl border border-line bg-panel", SLIDE_WIDTH)}>
        <Skeleton className="aspect-[4/3] w-full rounded-none bg-lilac-soft" />
        <div className="flex flex-col gap-2.5 p-3">
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
  const { t } = useTranslation("vendors");
  const { canEdit } = usePlanPermission("vendors");
  const { data: vendors, loading } = useCollection(vendorsQuery(planId), mapVendor);
  const [locationFilter, setLocationFilter] = React.useState<LocationFilter>(null);
  const [discoverOpen, setDiscoverOpen] = React.useState(false);

  const existingPlaceIds = React.useMemo(
    () => new Set(vendors.flatMap((v) => (v.placeId ? [v.placeId] : []))),
    [vendors]
  );
  const options = React.useMemo(() => locationOptions(vendors), [vendors]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 sm:gap-8" role="status" aria-label={t("list.loading")}>
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  // Si el lugar elegido ya no existe (se borró el último proveedor de allí), se ignora.
  const filter = isFilterAvailable(locationFilter, options) ? locationFilter : null;
  const visible = filterByLocation(vendors, filter);
  // Filtrando solo se ven las categorías con resultados; sin filtro, también los huecos vacíos.
  const groups = groupVendors(visible).filter((g) => !filter || g.vendors.length > 0);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <VendorLocationFilter
          options={options}
          value={filter}
          onChange={setLocationFilter}
          shown={visible.length}
          total={vendors.length}
        />
        {vendors.length > 0 && <VendorsExportButton vendors={visible} />}
      </div>
      {groups.map(({ category, vendors: options }, index) => (
        <section key={category} aria-labelledby={`vendors-section-${index}`} className={cn(PANEL, "flex flex-col gap-6")}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex min-w-0 items-baseline gap-3">
              <h3
                id={`vendors-section-${index}`}
                className="font-display text-lg font-semibold text-ink sm:text-xl"
              >
                {categoryLabel(category, t)}
              </h3>
              <span className="text-sm text-ink-muted">
                {options.length === 0 ? t("list.noOptions") : t("list.optionCount", { count: options.length })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-1">
              {options.length >= 2 && (
                <VendorCompare
                  planId={planId}
                  category={category}
                  vendors={options}
                  trigger={
                    <button type="button" className={SECTION_ACTION}>
                      <ColumnsIcon className="size-4" aria-hidden="true" />
                      {t("list.compare")}
                    </button>
                  }
                />
              )}
              {canEdit && isVenueCategory(category) && options.length > 0 && (
                <button type="button" onClick={() => setDiscoverOpen(true)} className={SECTION_ACTION}>
                  <CompassIcon className="size-4" aria-hidden="true" />
                  {t("list.discover")}
                </button>
              )}
              {canEdit && options.length > 0 && (
                <VendorFormDialog
                  planId={planId}
                  defaultCategory={category}
                  trigger={
                    <button type="button" className={SECTION_ACTION}>
                      <PlusIcon className="size-4" aria-hidden="true" />
                      {t("list.addAnother")}
                    </button>
                  }
                />
              )}
            </div>
          </div>
          {options.length === 0 ? (
            <>
              <EmptyVendorCard planId={planId} category={category} canEdit={canEdit} />
              {canEdit && isVenueCategory(category) && <VenueInvitation onOpen={() => setDiscoverOpen(true)} />}
            </>
          ) : (
            <VendorCarousel
              label={categoryLabel(category, t)}
              slides={options.map((vendor) => ({
                key: vendor.id,
                name: vendor.name,
                render: (active) => <VendorCard planId={planId} vendor={vendor} active={active} canEdit={canEdit} />,
              }))}
            />
          )}
        </section>
      ))}
      {canEdit && (
        <VenueDiscovery
          planId={planId}
          existingPlaceIds={existingPlaceIds}
          open={discoverOpen}
          onOpenChange={setDiscoverOpen}
        />
      )}
    </div>
  );
}

/** Invitación amable cuando todavía no hay ninguna finca guardada. */
function VenueInvitation({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation("vendors");
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
      <p className="text-sm text-ink-muted">
        {t("list.invitation")}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-btn-soft px-5 text-sm font-medium text-ink-on-lilac transition-opacity hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <CompassIcon className="size-4" aria-hidden="true" />
        {t("list.seeVenues")}
      </button>
    </div>
  );
}
