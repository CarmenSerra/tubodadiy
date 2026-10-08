"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  bookingsQuery,
  daysQuery,
  destinationsQuery,
  ensurePackingSeeded,
  mapBooking,
  mapDay,
  mapDestination,
  mapPackingItem,
  mapSettings,
  packingQuery,
  settingsRef,
} from "@/lib/firebase/honeymoon";
import {
  DEFAULT_SETTINGS,
  type Booking,
  type Destination,
  type HoneymoonSettings,
  type PackingItem,
  type TripDay,
} from "@/lib/honeymoon-model";
import { useCollection } from "@/lib/hooks/use-collection";
import { useDoc } from "@/lib/hooks/use-doc";

export interface HoneymoonData {
  loading: boolean;
  /** Algún listado no se pudo leer (sin permiso, sin conexión…). */
  failed: boolean;
  destinations: Destination[];
  days: TripDay[];
  bookings: Booking[];
  packing: PackingItem[];
  settings: HoneymoonSettings;
}

/** Suscripción a todo lo de la luna de miel de un plan, ya ordenado, y siembra de la maleta. */
export function useHoneymoon(planId: string): HoneymoonData {
  const dest = useCollection(destinationsQuery(planId), mapDestination);
  const days = useCollection(daysQuery(planId), mapDay);
  const bookings = useCollection(bookingsQuery(planId), mapBooking);
  const packing = useCollection(packingQuery(planId), mapPackingItem);
  const settingsDoc = useDoc(settingsRef(planId), mapSettings);

  const loading = dest.loading || days.loading || bookings.loading || packing.loading || settingsDoc.loading;
  const failed = Boolean(dest.error || days.error || bookings.error || packing.error || settingsDoc.error);

  // Primera visita: deja lista la maleta con lo típico (una sola vez por plan).
  const seedAttempted = React.useRef(false);
  const needsSeed = !loading && !failed && !settingsDoc.data?.packingSeeded;
  React.useEffect(() => {
    if (!needsSeed || seedAttempted.current) return;
    seedAttempted.current = true;
    ensurePackingSeeded(planId).catch(() => {
      toast.error("No se ha podido preparar la lista de la maleta. Puedes cargarla desde «Maleta y papeles».");
    });
  }, [needsSeed, planId]);

  const destinations = React.useMemo(
    () =>
      [...dest.data].sort(
        (a, b) => Number(b.chosen) - Number(a.chosen) || (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity)
      ),
    [dest.data]
  );
  const orderedDays = React.useMemo(
    () => [...days.data].sort((a, b) => a.order - b.order || (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity)),
    [days.data]
  );
  const orderedBookings = React.useMemo(
    () =>
      [...bookings.data].sort(
        (a, b) =>
          (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99") ||
          (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity)
      ),
    [bookings.data]
  );
  const orderedPacking = React.useMemo(() => [...packing.data].sort((a, b) => a.order - b.order), [packing.data]);

  return {
    loading,
    failed,
    destinations,
    days: orderedDays,
    bookings: orderedBookings,
    packing: orderedPacking,
    settings: settingsDoc.data ?? DEFAULT_SETTINGS,
  };
}
