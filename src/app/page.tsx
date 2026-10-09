"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  HeartIcon,
  ListChecksIcon,
  UsersIcon,
  WalletIcon,
  StoreIcon,
  CalendarClockIcon,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Branch } from "@/components/brand/hero-decorations";
import { Flourish } from "@/components/brand/welcome-decorations";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";

// Colores de marca fijos para esta landing page (no los tokens globales
// --primary/--card/etc., que siguen usándose tal cual en el resto de la
// app): jerarquía crema/lila-claro/lila-medio/salvia/verde-oscuro pedida
// específicamente para esta página.
// Botón principal (hero): píldora lila con texto blanco.
const BRAND_CTA =
  "rounded-full bg-cta px-8 text-on-cta shadow-none hover:bg-cta hover:opacity-90";
// Botón de cabecera: píldora lila clara con texto oscuro.
const HEADER_PILL =
  "rounded-full bg-btn-soft px-4 text-ink-on-lilac shadow-none hover:bg-btn-soft hover:opacity-90";

const FEATURES = [
  {
    icon: ListChecksIcon,
    title: "13 secciones, un solo lugar",
    description:
      "Fecha, lugar, invitados, proveedores, vestuario, papelería, ceremonia, cronograma y mucho más, todo centralizado.",
  },
  {
    icon: UsersIcon,
    title: "Invitados sin complicaciones",
    description:
      "Gestiona la lista de invitados, las confirmaciones y las notas dietéticas tú misma/o, sin depender de que ellos usen la web.",
  },
  {
    icon: StoreIcon,
    title: "Proveedores organizados",
    description: "Controla el estado de contratación de cada proveedor: catering, foto, música, flores...",
  },
  {
    icon: WalletIcon,
    title: "Presupuesto bajo control",
    description: "Compara lo estimado con lo gastado en tiempo real, por categoría y en conjunto.",
  },
  {
    icon: CalendarClockIcon,
    title: "Avanza a tu ritmo",
    description:
      "Salta entre secciones, marca algunas como completadas y omite otras. Así de caótico es organizar una boda.",
  },
  {
    icon: HeartIcon,
    title: "Comparte el plan",
    description: "Invita a tu pareja o a tu wedding planner con acceso total para organizarlo juntos.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-surface-alt">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-brand">
            <HeartIcon className="size-5 fill-current" />
            <span className="font-display text-lg font-semibold">tubodadiy</span>
          </div>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            {!loading && user ? (
              <Button asChild size="sm" className={HEADER_PILL}>
                <Link href="/dashboard">Ir a mi panel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-ink-ghost hover:bg-transparent hover:text-ink-ghost hover:opacity-80">
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild size="sm" className={HEADER_PILL}>
                  <Link href="/signup">Regístrate</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-page px-4 py-16 sm:py-24">
        {/* Decoración: blobs orgánicos y ramas, siempre detrás del contenido */}
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
          <path
            d="M100 0 C 70 10, 30 50, 25 100 C 20 150, 60 185, 100 200 Z"
            style={{ fill: "var(--deco-sage)" }}
          />
        </svg>
        <Branch className="bottom-0 left-[2%] hidden h-[48%] w-auto sm:block" />
        <Branch name="branch-olive" className="bottom-0 right-[1%] hidden h-[45%] w-auto -scale-x-100 sm:block" />

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-2 text-center">
          <div className="relative inline-block px-12 sm:px-16">
            <Flourish className="left-0 top-1/2 -translate-y-1/2" />
            <Flourish className="right-0 top-1/2 -translate-y-1/2 -scale-x-100" />
            <span className="text-script-accent" aria-hidden="true" style={{ color: "var(--lilac-bright)" }}>
              tubodadiy
            </span>
          </div>
          <h1 className="mt-2 text-ink">Organiza tu boda paso a paso, todo en un mismo lugar</h1>
          <p className="max-w-xl text-balance font-sans text-base not-italic text-ink-muted sm:text-lg">
            A diferencia de los directorios de proveedores, tubodadiy centraliza presupuesto,
            invitados, proveedores, cronograma y tareas — con seguimiento real de tu progreso.
          </p>
          <div className="mt-4 flex gap-3">
            <Button asChild size="lg" className={BRAND_CTA}>
              <Link href={user ? "/dashboard" : "/signup"}>
                {user ? "Ir a mi panel" : "Empieza gratis"}
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="w-full bg-lilac-soft ring-1 ring-lilac-edge px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Card
              key={feature.title}
              className="relative rounded-2xl border-surface bg-surface text-ink-strong shadow-none ring-1 ring-lilac-edge transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:z-10 hover:scale-[1.05] hover:shadow-float motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <CardHeader>
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full",
                    i % 2 === 0 ? "bg-lilac-mid" : "bg-sage-pale"
                  )}
                >
                  <feature.icon className="size-5 text-ink-on-tint" />
                </div>
                <CardTitle className="mt-2 font-display text-base font-semibold text-ink-strong">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-ink-placeholder">
                {feature.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        tubodadiy — organiza tu boda sin perder de vista el conjunto.
      </footer>
    </div>
  );
}
