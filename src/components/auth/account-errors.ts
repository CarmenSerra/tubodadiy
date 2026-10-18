"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { useLanguage } from "@/lib/i18n/provider";

/** El usuario cerró la ventana de Google: no es un error que mostrar. */
const SILENT_CODES = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

/** Códigos con texto propio en `account:errors.*`; el resto, `errors:firebase.*`. */
const OWN_CODES = new Set([
  "auth/unauthorized-domain",
  "auth/operation-not-allowed",
  "auth/account-exists-with-different-credential",
  "auth/popup-blocked",
  "auth/network-request-failed",
]);

export function errorCodeOf(err: unknown): string {
  return err && typeof err === "object" && "code" in err ? String(err.code) : "";
}

/** Devuelve `(err) => mensaje | null` (null = no mostrar nada). */
export function useAccountError() {
  const { t } = useTranslation("account");
  const { lang } = useLanguage();
  return React.useCallback(
    (err: unknown): string | null => {
      const code = errorCodeOf(err);
      if (SILENT_CODES.has(code)) return null;
      if (OWN_CODES.has(code)) return t(`errors.${code}`);
      return getFirebaseErrorMessage(err, lang);
    },
    [t, lang]
  );
}
