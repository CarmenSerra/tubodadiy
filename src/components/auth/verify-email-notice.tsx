"use client";

import * as React from "react";
import { MailCheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { needsEmailVerification, sendVerificationEmail } from "@/components/auth/account-actions";
import { useAuth } from "@/lib/hooks/use-auth";
import { useLanguage } from "@/lib/i18n/provider";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { cn } from "@/lib/utils";

const COOLDOWN_SECONDS = 30;
const LINK_BUTTON =
  "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:bg-lilac-soft focus-visible:ring-2 focus-visible:ring-lilac disabled:pointer-events-none disabled:opacity-60";

/** Reenvío del correo de verificación con enfriamiento para no saturar a Firebase. */
export function useResendVerification() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { t } = useTranslation("account");
  const [seconds, setSeconds] = React.useState(0);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds]);

  const resend = React.useCallback(async () => {
    if (!user || sending || seconds > 0) return;
    setSending(true);
    try {
      await sendVerificationEmail(user);
      toast.success(t("verify.sent"));
      setSeconds(COOLDOWN_SECONDS);
    } catch (err) {
      toast.error(getFirebaseErrorMessage(err, lang));
    } finally {
      setSending(false);
    }
  }, [user, sending, seconds, lang, t]);

  return { resend, sending, seconds };
}

/**
 * Aviso suave y no bloqueante bajo la cabecera mientras el correo no esté
 * verificado (solo cuentas con correo y contraseña; Google ya llega verificado).
 */
export function VerifyEmailNotice({ className }: { className?: string }) {
  const { t } = useTranslation("account");
  const { user, refreshUser } = useAuth();
  const { resend, sending, seconds } = useResendVerification();
  const [checking, setChecking] = React.useState(false);
  const pending = !!user && needsEmailVerification(user);

  // Si se verifica desde otra pestaña, al volver a esta se actualiza solo.
  React.useEffect(() => {
    if (!pending) return;
    function onVisible() {
      if (document.visibilityState === "visible") void refreshUser().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pending, refreshUser]);

  if (!user || !pending) return null;

  async function check() {
    setChecking(true);
    try {
      const fresh = await refreshUser();
      if (fresh && !fresh.emailVerified) toast(t("verify.stillPending"));
    } catch {
      // Sin conexión: se puede volver a pulsar.
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={cn("border-b border-line bg-lilac-soft", className)}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm text-ink">
        <MailCheckIcon className="size-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 basis-60">
          <strong className="font-semibold">{t("verify.title")}.</strong>{" "}
          <span className="text-ink-muted">{t("verify.body", { email: user.email })}</span>
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={resend} disabled={sending || seconds > 0} className={LINK_BUTTON}>
            {seconds > 0 ? t("verify.resendIn", { seconds }) : t("verify.resend")}
          </button>
          <button type="button" onClick={check} disabled={checking} className={LINK_BUTTON}>
            {t("verify.check")}
          </button>
        </div>
      </div>
    </div>
  );
}
