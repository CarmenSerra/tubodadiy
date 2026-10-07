"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, HeartIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";

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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <Link href="/" className="flex items-center gap-2 text-primary mb-2">
          <HeartIcon className="size-5 fill-current" />
          <span className="font-display text-xl font-semibold">tubodadiy</span>
        </Link>
        <CardTitle>{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Accede para seguir organizando tu boda."
            : "Empieza a organizar tu boda paso a paso."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!firebaseReady && (
          <p className="mb-4 rounded-md bg-warning/20 p-3 text-sm text-warning-foreground">
            Firebase no está configurado todavía. Añade las variables de entorno descritas en
            <code className="mx-1">.env.example</code> para poder iniciar sesión.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting || !firebaseReady} className="mt-1">
            {submitting && <Loader2 className="animate-spin" />}
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              ¿No tienes cuenta?{" "}
              <Link href="/signup" className="text-primary underline underline-offset-4">
                Regístrate
              </Link>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-primary underline underline-offset-4">
                Inicia sesión
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
