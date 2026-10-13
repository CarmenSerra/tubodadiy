"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, HeartIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { LanguageSwitch } from "@/components/language-switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Branch, Sparkles } from "@/components/brand/hero-decorations";
import { HomeLink } from "@/components/brand/home-link";
import { useAuth } from "@/lib/hooks/use-auth";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { useLanguage } from "@/lib/i18n/provider";

// Colores de marca fijos (misma línea visual que la landing).
const AUTH_INPUT =
  "h-11 rounded-xl border-line-strong bg-field px-3.5 text-ink shadow-none placeholder:text-ink-placeholder focus-visible:border-lilac focus-visible:ring-lilac focus-visible:ring-offset-0";
const AUTH_LABEL = "text-ink";
const AUTH_CTA =
  "mt-1 h-11 rounded-full bg-cta px-8 text-on-cta shadow-none hover:bg-cta hover:opacity-90 focus-visible:ring-lilac";
// Enlaces: #927AAC sobre #F8F5F1 no llega a 4.5:1, así que el texto va en
// verde oscuro con subrayado lila.
const AUTH_LINK =
  "font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80";

/**
 * Fondo de las páginas de login/registro: crema con los blobs y ramas
 * decorativos de la landing (siempre detrás del contenido).
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-page px-4 py-12 sm:py-16">
      <svg
        viewBox="0 0 200 300"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-[45%] w-[18%] sm:h-[85%] sm:w-[22%]"
      >
        <path
          d="M0 20 C 50 -10, 130 30, 150 90 C 170 150, 210 170, 190 230 C 175 280, 90 300, 0 300 Z"
          style={{ fill: "var(--deco-lilac-soft)" }}
        />
      </svg>
      <svg
        viewBox="0 0 100 200"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-[55%] h-[35%] w-[5%] sm:top-[30%] sm:h-[50%] sm:w-[10%]"
      >
        <path d="M100 0 C 70 10, 30 50, 25 100 C 20 150, 60 185, 100 200 Z" style={{ fill: "var(--deco-sage)" }} />
      </svg>
      {/* Ramas solo en pantallas anchas, para no rozar la tarjeta */}
      <Branch className="bottom-0 left-[2%] hidden h-[44%] max-h-[26rem] w-auto lg:block" />
      <Branch className="bottom-0 right-[1%] hidden h-[40%] max-h-[24rem] w-auto -scale-x-100 lg:block" />
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 sm:right-6 sm:top-4 sm:gap-2">
        <LanguageSwitch />
        <ThemeToggle />
      </div>
      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </main>
  );
}

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { t } = useTranslation("auth");
  const { lang } = useLanguage();
  const { signIn, signUp, firebaseReady } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(name, email, password);
      }
      router.push(redirectTo);
    } catch (err) {
      setError(getFirebaseErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm gap-5 rounded-2xl border-line bg-surface py-8 text-ink-strong shadow-none">
      <CardHeader className="items-center text-center">
        <div className="relative mb-1 px-10">
          <Sparkles className="left-0 top-0 size-8 sm:size-8" />
          <Sparkles className="right-0 top-0 size-8 sm:size-8 -scale-x-100" />
          <HomeLink
            className="flex items-center gap-2 py-1 text-brand outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2"
          >
            <HeartIcon className="size-5 fill-current" />
            <span className="font-display text-xl font-semibold">tubodadiy</span>
          </HomeLink>
        </div>
        <CardTitle className="text-2xl font-semibold text-ink">{t(`${mode}.title`)}</CardTitle>
        <CardDescription className="text-ink-muted">
          {t(`${mode}.subtitle`)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!firebaseReady && (
          <p className="mb-4 rounded-xl bg-lilac-soft ring-1 ring-lilac-edge p-3 text-sm text-ink">
            <Trans i18nKey="firebaseNotConfigured.form" ns="auth" components={{ code: <code className="mx-1" /> }} />
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className={AUTH_LABEL}>{t("form.name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("form.namePlaceholder")}
                className={AUTH_INPUT}
                autoComplete="name"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className={AUTH_LABEL}>{t("form.email")}</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("form.emailPlaceholder")}
              className={AUTH_INPUT}
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className={AUTH_LABEL}>{t("form.password")}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={AUTH_INPUT}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting || !firebaseReady} className={AUTH_CTA}>
            {submitting && <Loader2 className="animate-spin" />}
            {t(`${mode}.submit`)}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-ink-muted">
          {mode === "login" ? (
            <>
              {t("login.noAccount")}{" "}
              <Link href="/signup" className={AUTH_LINK}>
                {t("login.signupLink")}
              </Link>
            </>
          ) : (
            <>
              {t("signup.haveAccount")}{" "}
              <Link href="/login" className={AUTH_LINK}>
                {t("signup.loginLink")}
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
