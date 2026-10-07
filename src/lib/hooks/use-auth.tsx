"use client";

import * as React from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  firebaseReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Subscribes to the Firebase Auth session; setState calls here mirror
    // that external system, including the "not configured" early exit.
    if (!isFirebaseConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const ensureUserDoc = React.useCallback(async (nextUser: User) => {
    const db = getFirebaseDb();
    await setDoc(
      doc(db, "users", nextUser.uid),
      {
        email: nextUser.email,
        name: nextUser.displayName ?? "",
        avatarUrl: nextUser.photoURL ?? "",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(credential.user);
  }, [ensureUserDoc]);

  const signUp = React.useCallback(
    async (name: string, email: string, password: string) => {
      const auth = getFirebaseAuth();
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }
      await ensureUserDoc(credential.user);
    },
    [ensureUserDoc]
  );

  const signOut = React.useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      loading,
      firebaseReady: isFirebaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [user, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
