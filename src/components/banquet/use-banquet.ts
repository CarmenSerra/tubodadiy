"use client";

import * as React from "react";

import { dishesQuery, mapDish, mapTable, tablesQuery } from "@/components/banquet/banquet-firebase";
import { COURSES, type BanquetTable, type Dish } from "@/components/banquet/banquet-model";
import { guestsQuery, mapGuest } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import type { Guest } from "@/lib/types";

export interface BanquetData {
  loading: boolean;
  /** Algún listado no se pudo leer (sin permiso, sin conexión…). */
  failed: boolean;
  guests: Guest[];
  tables: BanquetTable[];
  dishes: Dish[];
}

/** Suscripción a invitados, mesas y platos de un plan, ya ordenados. */
export function useBanquet(planId: string): BanquetData {
  // Los invitados son de otra sección: sin poder verla no se leen (el plan de mesas se ve sin nombres).
  const { canView: canViewGuests } = usePlanPermission("guests");
  const guests = useCollection(canViewGuests ? guestsQuery(planId) : null, mapGuest);
  const tables = useCollection(tablesQuery(planId), mapTable);
  const dishes = useCollection(dishesQuery(planId), mapDish);

  const orderedTables = React.useMemo(
    () => [...tables.data].sort((a, b) => a.order - b.order || (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity)),
    [tables.data]
  );
  const orderedDishes = React.useMemo(
    () =>
      [...dishes.data].sort(
        (a, b) =>
          COURSES.indexOf(a.course) - COURSES.indexOf(b.course) ||
          (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity)
      ),
    [dishes.data]
  );
  // Por nombre: la lista de invitados llega por fecha de alta, que aquí no ayuda.
  const orderedGuests = React.useMemo(
    () => [...guests.data].sort((a, b) => a.name.localeCompare(b.name)),
    [guests.data]
  );

  return {
    loading: guests.loading || tables.loading || dishes.loading,
    failed: Boolean(guests.error || tables.error || dishes.error),
    guests: orderedGuests,
    tables: orderedTables,
    dishes: orderedDishes,
  };
}
