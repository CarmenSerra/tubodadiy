"use client";

import * as React from "react";
import { onSnapshot, type DocumentData, type Query } from "firebase/firestore";

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

  React.useEffect(() => {
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
  }, [query]);

  return { data, loading, error };
}
