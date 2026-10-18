"use client";

// Operaciones de cuenta (correo de verificación, recuperación, perfil). Son
// funciones sueltas para poder usarlas desde el aviso, el login y el perfil
// sin depender del contexto de sesión.

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  type ActionCodeSettings,
  type User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";

/** Códigos de Firebase cuando la URL de continuación no está autorizada. */
const CONTINUE_URI_CODES = new Set(["auth/unauthorized-continue-uri", "auth/invalid-continue-uri"]);

function errorCode(err: unknown): string {
  return err && typeof err === "object" && "code" in err ? String(err.code) : "";
}

/** Los correos de Firebase salen en el idioma de la app (`<html lang>`). */
function syncEmailLanguage() {
  const lang = document.documentElement.lang;
  if (lang) getFirebaseAuth().languageCode = lang.slice(0, 2);
}

/**
 * Envía el correo con `continueUrl` (para volver a la app) y, si ese dominio no
 * está autorizado en Firebase, lo reintenta sin ella en lugar de fallar.
 */
async function sendWithContinue(send: (settings?: ActionCodeSettings) => Promise<void>, path: string) {
  syncEmailLanguage();
  try {
    await send({ url: `${window.location.origin}${path}` });
  } catch (err) {
    if (!CONTINUE_URI_CODES.has(errorCode(err))) throw err;
    await send();
  }
}

export function sendVerificationEmail(user: User) {
  return sendWithContinue((settings) => sendEmailVerification(user, settings), "/dashboard");
}

export function sendResetEmail(email: string) {
  const auth = getFirebaseAuth();
  return sendWithContinue((settings) => sendPasswordResetEmail(auth, email, settings), "/login");
}

/** ¿La cuenta tiene contraseña propia (y no solo Google)? */
export function hasPasswordProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "password");
}

/** ¿Hay que pedir verificación? Solo cuentas con correo y contraseña sin verificar. */
export function needsEmailVerification(user: User): boolean {
  return !user.emailVerified && !!user.email && hasPasswordProvider(user);
}

export async function saveDisplayName(user: User, name: string) {
  await updateProfile(user, { displayName: name });
  await setDoc(doc(getFirebaseDb(), "users", user.uid), { name }, { merge: true });
}

/** Reautentica con la contraseña actual y la cambia. */
export async function changePassword(user: User, current: string, next: string) {
  if (!user.email) throw new Error("no-email");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
  await updatePassword(user, next);
}

/** Guarda (o, con "", quita) la foto como data URL en users/{uid}.avatarUrl. */
export async function saveAvatarUrl(uid: string, avatarUrl: string) {
  await setDoc(doc(getFirebaseDb(), "users", uid), { avatarUrl }, { merge: true });
}
