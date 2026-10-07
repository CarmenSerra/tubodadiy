"use client";

import * as React from "react";
import { onSnapshot, type DocumentData, type DocumentReference } from "firebase/firestore";

interface UseDocResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useDoc<T>(
  ref: DocumentReference<DocumentData> | null,
  mapDoc: (id: string, data: DocumentData) => T
): UseDocResult<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Subscribes to a Firestore document; setState calls here mirror that
    // external system, including the "no ref yet" early exit.
    if (!ref) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setData(snapshot.exists() ? mapDoc(snapshot.id, snapshot.data()) : null);
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
  }, [ref?.path]);

  return { data, loading, error };
}
