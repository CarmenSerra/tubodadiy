"use client";

import * as React from "react";
import { onSnapshot, queryEqual, type DocumentData, type Query } from "firebase/firestore";

interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export function useCollection<T>(
  query: Query<DocumentData> | null,
  mapDoc: (id: string, data: DocumentData) => T
): UseCollectionResult<T> {
  const [data, setData] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Callers often build the query inline (`useCollection(stepsQuery(id), ...)`),
  // which creates a new object every render. Keep the previous instance while
  // it is equivalent, so the effect below only resubscribes when the query
  // really changes (otherwise each snapshot re-render resubscribes and
  // `loading` never settles).
  const [stableQuery, setStableQuery] = React.useState(query);
  if (query !== stableQuery && !sameQuery(query, stableQuery)) {
    setStableQuery(query);
  }

  React.useEffect(() => {
    const query = stableQuery;
    // Subscribes to a Firestore query; setState calls here mirror that
    // external system, including the "no query yet" early exit.
    if (!query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        setData(snapshot.docs.map((d) => mapDoc(d.id, d.data())));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableQuery]);

  return { data, loading, error };
}

function sameQuery(a: Query<DocumentData> | null, b: Query<DocumentData> | null): boolean {
  if (a === null || b === null) return a === b;
  return queryEqual(a, b);
}
