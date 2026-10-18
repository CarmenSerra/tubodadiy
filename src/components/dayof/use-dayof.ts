"use client";

import * as React from "react";
import type { DocumentData, Query } from "firebase/firestore";

import {
  contactsQuery,
  mapContact,
  mapReading,
  mapShot,
  mapSong,
  mapTrack,
  mapWitness,
  musicQuery,
  readingsQuery,
  shotsQuery,
  songsQuery,
  witnessesQuery,
} from "@/lib/firebase/dayof";
import {
  contactsById,
  sortContacts,
  sortReadings,
  sortSongs,
  sortTracks,
  sortWitnesses,
  type CeremonyTrack,
  type DayContact,
  type Reading,
  type Shot,
  type Song,
  type Witness,
} from "@/lib/dayof-model";
import { useCollection } from "@/lib/hooks/use-collection";

function useSorted<T>(
  query: Query<DocumentData>,
  map: (id: string, data: DocumentData) => T,
  sort: (list: T[]) => T[]
) {
  const { data, loading, error } = useCollection(query, map);
  const sorted = React.useMemo(() => sort(data), [data, sort]);
  return { data: sorted, loading, error };
}

const keepOrder = <T,>(list: T[]) => list;

export const useReadings = (planId: string) => useSorted<Reading>(readingsQuery(planId), mapReading, sortReadings);
export const useCeremonyMusic = (planId: string) => useSorted<CeremonyTrack>(musicQuery(planId), mapTrack, sortTracks);
export const useWitnesses = (planId: string) => useSorted<Witness>(witnessesQuery(planId), mapWitness, sortWitnesses);
export const useDayContacts = (planId: string) => useSorted<DayContact>(contactsQuery(planId), mapContact, sortContacts);
export const useShots = (planId: string) => useSorted<Shot>(shotsQuery(planId), mapShot, keepOrder);
export const useSongs = (planId: string) => useSorted<Song>(songsQuery(planId), mapSong, sortSongs);

/** Contactos del Día B y un mapa por id (para la escaleta). */
export function useDayContactsMap(planId: string) {
  const result = useDayContacts(planId);
  const byId = React.useMemo(() => contactsById(result.data), [result.data]);
  return { ...result, byId };
}
