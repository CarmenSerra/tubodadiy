"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, HeartIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Branch, Sparkles } from "@/components/brand/hero-decorations";
import { useAuth } from "@/lib/hooks/use-auth";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";

// Colores de marca fijos (misma línea visual que la landing).
const AUTH_INPUT =
  "h-11 rounded-xl border-[#D4C0EA] bg-white px-3.5 text-[#26413C] shadow-none placeholder:text-[#677775] focus-visible:border-[#927AAC] focus-visible:ring-[#927AAC] focus-visible:ring-offset-0";
const AUTH_LABEL = "text-[#26413C]";
const AUTH_CTA =
  "mt-1 h-11 rounded-full bg-[#927AAC] px-8 text-white shadow-none hover:bg-[#927AAC] hover:opacity-90 focus-visible:ring-[#927AAC]";
// Enlaces: #927AAC sobre #F8F5F1 no llega a 4.5:1, así que el texto va en
// verde oscuro con subrayado lila.
const AUTH_LINK =
  "font-medium text-[#26413C] underline decoration-[#927AAC] decoration-2 underline-offset-4 hover:opacity-80";

/**
 * Fondo de las páginas de login/registro: crema con los blobs y ramas
 * decorativos de la landing (siempre detrás del contenido).
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#F4F1EB] px-4 py-12 sm:py-16">
      <svg
        viewBox="0 0 200 300"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-[45%] w-[18%] sm:h-[85%] sm:w-[22%]"
      >
        <path
          d="M0 20 C 50 -10, 130 30, 150 90 C 170 150, 210 170, 190 230 C 175 280, 90 300, 0 300 Z"
          fill="#E5DDEC"
        />
      </svg>
      <svg
        viewBox="0 0 100 200"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-[55%] h-[35%] w-[5%] sm:top-[30%] sm:h-[50%] sm:w-[10%]"
      >
        <path d="M100 0 C 70 10, 30 50, 25 100 C 20 150, 60 185, 100 200 Z" fill="#BCC7B5" />
      </svg>
      {/* Ramas solo en pantallas anchas, para no rozar la tarjeta */}
      <Branch className="bottom-0 left-[2%] hidden h-[44%] max-h-[26rem] w-auto lg:block" />
      <Branch className="bottom-0 right-[1%] hidden h-[40%] max-h-[24rem] w-auto -scale-x-100 lg:block" />
      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </main>
  );
}

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
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
      setError(getFirebaseErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm gap-5 rounded-2xl border-[#E5DDEC] bg-[#F8F5F1] py-8 text-[#102D28] shadow-none">
      <CardHeader className="items-center text-center">
        <div className="relative mb-1 px-10">
          <Sparkles className="left-0 top-0 size-8 sm:size-8" />
          <Sparkles className="right-0 top-0 size-8 sm:size-8 -scale-x-100" />
          <Link
            href="/"
            className="flex items-center gap-2 py-1 text-[#907AB2] outline-none focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2"
          >
            <HeartIcon className="size-5 fill-current" />
            <span className="font-display text-xl font-semibold">tubodadiy</span>
          </Link>
        </div>
        <CardTitle className="text-2xl font-semibold text-[#26413C]">{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</CardTitle>
        <CardDescription className="text-[#586C64]">
          {mode === "login"
            ? "Accede para seguir organizando tu boda."
            : "Empieza a organizar tu boda paso a paso."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!firebaseReady && (
          <p className="mb-4 rounded-xl bg-[#ECE6F4] p-3 text-sm text-[#26413C]">
            Firebase no está configurado todavía. Añade las variables de entorno descritas en
            <code className="mx-1">.env.example</code> para poder iniciar sesión.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className={AUTH_LABEL}>Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className={AUTH_INPUT}
                autoComplete="name"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className={AUTH_LABEL}>Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@ejemplo.com"
              className={AUTH_INPUT}
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className={AUTH_LABEL}>Contraseña</Label>
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
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-[#586C64]">
          {mode === "login" ? (
            <>
              ¿No tienes cuenta?{" "}
              <Link href="/signup" className={AUTH_LINK}>
                Regístrate
              </Link>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className={AUTH_LINK}>
                Inicia sesión
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
