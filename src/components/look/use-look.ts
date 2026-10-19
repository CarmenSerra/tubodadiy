"use client";

import * as React from "react";

import {
  beautyQuery,
  decorQuery,
  looksQuery,
  mapBeauty,
  mapDecor,
  mapMoodImage,
  mapOutfit,
  mapRings,
  mapSettings,
  moodboardQuery,
  ringsRef,
  settingsRef,
} from "@/components/look/look-firebase";
import {
  EMPTY_RINGS,
  EMPTY_SETTINGS,
  PEOPLE,
  byCreated,
  type BeautyItem,
  type DecorItem,
  type MoodImage,
  type Outfit,
  type Rings,
  type StyleSettings,
} from "@/components/look/look-model";
import { appointmentsCollection, mapAppointment, type Appointment } from "@/lib/firebase/appointments";
import { mapVendor, vendorsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { useDoc } from "@/lib/hooks/use-doc";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import type { Vendor } from "@/lib/types";

export interface LookData {
  loading: boolean;
  /** Algún listado propio no se pudo leer (sin permiso, sin conexión…). */
  failed: boolean;
  outfits: Outfit[];
  beauty: BeautyItem[];
  decor: DecorItem[];
  moodboard: MoodImage[];
  rings: Rings;
  settings: StyleSettings;
  /** Citas de tipo vestuario de la agenda (solo lectura). */
  fittings: Appointment[];
  /** Proveedores del plan, por nombre (solo lectura, para enlazar). */
  vendors: Vendor[];
}

/** Suscripción a todo lo de «Estilo» de un plan, ya ordenado. */
export function useLook(planId: string): LookData {
  const looks = useCollection(looksQuery(planId), mapOutfit);
  const beauty = useCollection(beautyQuery(planId), mapBeauty);
  const decor = useCollection(decorQuery(planId), mapDecor);
  const mood = useCollection(moodboardQuery(planId), mapMoodImage);
  const ringsDoc = useDoc(ringsRef(planId), mapRings);
  const settingsDoc = useDoc(settingsRef(planId), mapSettings);
  // Lecturas de apoyo: si fallan, la página sigue funcionando sin ellas.
  // Proveedores y agenda son de otras secciones: solo se leen si se pueden ver.
  const { canView: canViewAgenda } = usePlanPermission("tasks");
  const { canView: canViewVendors } = usePlanPermission("vendors");
  const appts = useCollection(canViewAgenda ? appointmentsCollection(planId) : null, mapAppointment);
  const vendors = useCollection(canViewVendors ? vendorsQuery(planId) : null, mapVendor);

  const outfits = React.useMemo(
    () => [...looks.data].sort((a, b) => PEOPLE.indexOf(a.who) - PEOPLE.indexOf(b.who) || byCreated(a, b)),
    [looks.data]
  );
  const orderedBeauty = React.useMemo(
    () =>
      [...beauty.data].sort(
        (a, b) => (a.trialDate || "9999-99-99").localeCompare(b.trialDate || "9999-99-99") || byCreated(a, b)
      ),
    [beauty.data]
  );
  const orderedDecor = React.useMemo(() => [...decor.data].sort(byCreated), [decor.data]);
  const orderedMood = React.useMemo(() => [...mood.data].sort(byCreated), [mood.data]);
  const fittings = React.useMemo(
    () =>
      appts.data
        .filter((a) => a.category === "vestuario")
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [appts.data]
  );
  const orderedVendors = React.useMemo(
    () => [...vendors.data].sort((a, b) => a.name.localeCompare(b.name)),
    [vendors.data]
  );

  return {
    loading: looks.loading || beauty.loading || decor.loading || mood.loading || ringsDoc.loading || settingsDoc.loading,
    failed: Boolean(looks.error || beauty.error || decor.error || mood.error || ringsDoc.error || settingsDoc.error),
    outfits,
    beauty: orderedBeauty,
    decor: orderedDecor,
    moodboard: orderedMood,
    rings: ringsDoc.data ?? EMPTY_RINGS,
    settings: settingsDoc.data ?? EMPTY_SETTINGS,
    fittings,
    vendors: orderedVendors,
  };
}
