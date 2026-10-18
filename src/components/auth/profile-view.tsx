"use client";

import * as React from "react";
import { CameraIcon, Loader2, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  changePassword,
  hasPasswordProvider,
  saveAvatarUrl,
  saveDisplayName,
} from "@/components/auth/account-actions";
import { errorCodeOf, useAccountError } from "@/components/auth/account-errors";
import { compressAvatar, AvatarError } from "@/components/auth/avatar-compress";
import { UserAvatar, useMyAvatarUrl } from "@/components/auth/user-avatar";
import { useResendVerification } from "@/components/auth/verify-email-notice";
import { CARD, CTA_PRIMARY, CTA_SECONDARY, FOCUS } from "@/components/dashboard/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";

const FIELD =
  "h-11 rounded-xl border-line-strong bg-field px-3.5 text-ink shadow-none placeholder:text-ink-placeholder focus-visible:border-lilac focus-visible:ring-lilac focus-visible:ring-offset-0";
const BUTTON_OFF = "disabled:pointer-events-none disabled:opacity-50";
const QUIET_LINK =
  "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:bg-lilac-soft disabled:pointer-events-none disabled:opacity-60";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className={cn(CARD, "p-5 sm:p-6")}>
      <h2 id={id} className="mb-4 font-display text-lg font-semibold text-ink-strong">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PhotoSection({ name }: { name: string }) {
  const { t } = useTranslation("account");
  const { user } = useAuth();
  const avatarUrl = useMyAvatarUrl();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  if (!user) return null;
  const uid = user.uid;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite elegir de nuevo el mismo archivo
    if (!file) return;
    setBusy(true);
    try {
      await saveAvatarUrl(uid, await compressAvatar(file));
      toast.success(t("profile.photo.saved"));
    } catch (err) {
      toast.error(
        err instanceof AvatarError && err.message === "not-image"
          ? t("profile.photo.notImage")
          : t("profile.photo.failed")
      );
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    try {
      await saveAvatarUrl(uid, "");
      toast.success(t("profile.photo.removed"));
    } catch {
      toast.error(t("profile.photo.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={t("profile.photo.title")}>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <UserAvatar name={name} src={avatarUrl} className="size-24" fallbackClassName="text-2xl" />
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-muted">{t("profile.photo.hint")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={onFile}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className={cn(CTA_SECONDARY, "h-11", BUTTON_OFF, FOCUS)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <CameraIcon />}
              {busy ? t("profile.photo.working") : avatarUrl ? t("profile.photo.change") : t("profile.photo.add")}
            </button>
            {avatarUrl && (
              <button type="button" onClick={onRemove} disabled={busy} className={cn(QUIET_LINK, FOCUS)}>
                <Trash2Icon className="mr-1.5 size-4" aria-hidden="true" />
                {t("profile.photo.remove")}
              </button>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function NameSection() {
  const { t } = useTranslation("account");
  const { user, refreshUser } = useAuth();
  const accountError = useAccountError();
  const stored = user?.displayName ?? "";
  const [name, setName] = React.useState(stored);
  const [saving, setSaving] = React.useState(false);
  const id = React.useId();

  if (!user) return null;
  const current = user;
  const trimmed = name.trim();
  const changed = trimmed !== stored && trimmed.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!changed) return;
    setSaving(true);
    try {
      await saveDisplayName(current, trimmed);
      await refreshUser();
      setName(trimmed);
      toast.success(t("profile.name.saved"));
    } catch (err) {
      toast.error(accountError(err) ?? "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title={t("profile.name.title")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:max-w-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id} className="text-ink">{t("profile.name.label")}</Label>
          <Input
            id={id}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={t("profile.name.placeholder")}
            autoComplete="name"
            className={FIELD}
          />
        </div>
        <button type="submit" disabled={!changed || saving} className={cn(CTA_PRIMARY, "self-start", BUTTON_OFF)}>
          {saving && <Loader2 className="animate-spin" />}
          {t("profile.name.save")}
        </button>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const { t } = useTranslation("account");
  const { user } = useAuth();
  const accountError = useAccountError();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const base = React.useId();

  if (!user) return null;
  const me = user;

  if (!hasPasswordProvider(me)) {
    return (
      <Section title={t("profile.password.title")}>
        <p className="rounded-xl bg-lilac-soft px-4 py-3 text-sm text-ink ring-1 ring-lilac-edge">
          {t("profile.password.googleOnly")}
        </p>
      </Section>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) return setError(t("profile.password.mismatch"));
    if (next === current) return setError(t("profile.password.same"));
    setSaving(true);
    try {
      await changePassword(me, current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success(t("profile.password.saved"));
    } catch (err) {
      const code = errorCodeOf(err);
      setError(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? t("profile.password.wrongCurrent")
          : accountError(err)
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title={t("profile.password.title")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 sm:max-w-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${base}-current`} className="text-ink">{t("profile.password.current")}</Label>
          <Input
            id={`${base}-current`}
            type="password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${base}-new`} className="text-ink">{t("profile.password.new")}</Label>
          <Input
            id={`${base}-new`}
            type="password"
            required
            minLength={6}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            aria-describedby={`${base}-hint`}
            className={FIELD}
          />
          <p id={`${base}-hint`} className="text-xs text-ink-muted">{t("profile.password.hint")}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${base}-confirm`} className="text-ink">{t("profile.password.confirm")}</Label>
          <Input
            id={`${base}-confirm`}
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={FIELD}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving} className={cn(CTA_PRIMARY, "self-start", BUTTON_OFF)}>
          {saving && <Loader2 className="animate-spin" />}
          {t("profile.password.submit")}
        </button>
      </form>
    </Section>
  );
}

function EmailLine() {
  const { t } = useTranslation("account");
  const { user } = useAuth();
  const { resend, sending, seconds } = useResendVerification();
  if (!user?.email) return null;
  return (
    <div className="text-sm text-ink-muted">
      <p className="truncate">
        <span className="sr-only">{t("profile.emailLabel")}: </span>
        {user.email}
      </p>
      <p className="flex flex-wrap items-center gap-x-1">
        {user.emailVerified ? (
          t("profile.emailVerified")
        ) : (
          <>
            {t("profile.emailUnverified")}
            {hasPasswordProvider(user) && (
              <button type="button" onClick={resend} disabled={sending || seconds > 0} className={QUIET_LINK}>
                {seconds > 0 ? t("verify.resendIn", { seconds }) : t("verify.resend")}
              </button>
            )}
          </>
        )}
      </p>
    </div>
  );
}

export function ProfileView() {
  const { t } = useTranslation("account");
  const { user } = useAuth();
  if (!user) return null;
  const label = user.displayName || user.email || "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t("profile.title")}</h1>
        <p className="text-sm text-ink-muted">{t("profile.subtitle")}</p>
        <div className="mt-2"><EmailLine /></div>
      </header>
      <PhotoSection name={label} />
      {/* key: si el nombre cambia fuera (otra pestaña), el campo se reinicia */}
      <NameSection key={user.displayName ?? ""} />
      <PasswordSection />
    </div>
  );
}
