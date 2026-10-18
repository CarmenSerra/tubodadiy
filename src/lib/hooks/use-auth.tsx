"use client";

import * as React from "react";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { sendVerificationEmail } from "@/components/auth/account-actions";

import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  firebaseReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Entra con Google (ventana emergente; si el navegador no la permite, cae
   * a redirección). Devuelve "redirect" cuando la página va a recargarse.
   */
  signInWithGoogle: (redirectTo: string) => Promise<"done" | "redirect">;
  /** Recoge el resultado de una redirección de Google; true si hay sesión nueva. */
  completeGoogleRedirect: () => Promise<boolean>;
  /** Vuelve a leer al usuario (nombre, verificación…) y repinta a los consumidores. */
  refreshUser: () => Promise<User | null>;
}

/** Clave de sessionStorage con el destino a abrir al volver de Google (redirect). */
export const GOOGLE_REDIRECT_KEY = "tubodadiy-google-redirect";

const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
]);

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  // Firebase muta el mismo objeto `User` (updateProfile, reload…): este
  // contador fuerza a los consumidores del contexto a repintarse.
  const [version, setVersion] = React.useState(0);

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

  // Crea users/{uid} solo si no existe: así no se pisan el nombre ni la foto
  // que la persona haya cambiado en su perfil.
  const ensureUserDoc = React.useCallback(async (nextUser: User) => {
    const db = getFirebaseDb();
    const ref = doc(db, "users", nextUser.uid);
    try {
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) {
        await setDoc(ref, {
          email: nextUser.email,
          name: nextUser.displayName ?? "",
          avatarUrl: nextUser.photoURL ?? "",
          createdAt: serverTimestamp(),
        });
      } else if (!snapshot.data().email && nextUser.email) {
        await setDoc(ref, { email: nextUser.email }, { merge: true });
      }
    } catch {
      // Sin conexión o sin permiso: la sesión sigue valiendo; el perfil se
      // creará en el siguiente acceso.
    }
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
      // Aviso suave: si el correo no sale, no se bloquea el registro (desde el
      // aviso «Verifica tu correo» se puede reenviar).
      void sendVerificationEmail(credential.user).catch(() => {});
    },
    [ensureUserDoc]
  );

  const signInWithGoogle = React.useCallback(
    async (redirectTo: string) => {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        const credential = await signInWithPopup(auth, provider);
        await ensureUserDoc(credential.user);
        return "done" as const;
      } catch (err) {
        const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
        if (!POPUP_FALLBACK_CODES.has(code)) throw err;
        try {
          window.sessionStorage.setItem(GOOGLE_REDIRECT_KEY, redirectTo);
        } catch {
          // Sin sessionStorage: se vuelve a /login y la sesión se recoge igual.
        }
        await signInWithRedirect(auth, provider);
        return "redirect" as const;
      }
    },
    [ensureUserDoc]
  );

  const completeGoogleRedirect = React.useCallback(async () => {
    const result = await getRedirectResult(getFirebaseAuth());
    if (!result) return false;
    await ensureUserDoc(result.user);
    return true;
  }, [ensureUserDoc]);

  const refreshUser = React.useCallback(async () => {
    const current = getFirebaseAuth().currentUser;
    if (!current) return null;
    await current.reload();
    setUser(current);
    setVersion((v) => v + 1);
    return current;
  }, []);

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
      signInWithGoogle,
      completeGoogleRedirect,
      refreshUser,
    }),
    // `version` fuerza un valor nuevo cuando el mismo `User` cambia por dentro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, version, loading, signIn, signUp, signOut, signInWithGoogle, completeGoogleRedirect, refreshUser]
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
