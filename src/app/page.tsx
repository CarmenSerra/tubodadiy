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

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Branch, Sparkles } from "@/components/brand/hero-decorations";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";

// Colores de marca fijos para esta landing page (no los tokens globales
// --primary/--card/etc., que siguen usándose tal cual en el resto de la
// app): jerarquía crema/lila-claro/lila-medio/salvia/verde-oscuro pedida
// específicamente para esta página.
// Botón principal (hero): píldora lila con texto blanco.
const BRAND_CTA =
  "rounded-full bg-[#927AAC] px-8 text-white shadow-none hover:bg-[#927AAC] hover:opacity-90";
// Botón de cabecera: píldora lila clara con texto oscuro.
const HEADER_PILL =
  "rounded-full bg-[#D4C0EA] px-4 text-[#38384D] shadow-none hover:bg-[#D4C0EA] hover:opacity-90";

const FEATURES = [
  {
    icon: ListChecksIcon,
    title: "13 secciones, un solo lugar",
    description:
      "Fecha, lugar, invitados, proveedores, vestuario, papelería, ceremonia, timeline y mucho más, todo centralizado.",
  },
  {
    icon: UsersIcon,
    title: "Invitados sin complicaciones",
    description:
      "Gestiona la lista de invitados, el RSVP y las notas dietéticas tú misma/o, sin depender de que ellos usen la web.",
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
      <header className="bg-[#F8F5F0]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-[#907AB2]">
            <HeartIcon className="size-5 fill-current" />
            <span className="font-display text-lg font-semibold">tubodadiy</span>
          </div>
          <nav className="flex items-center gap-2">
            {!loading && user ? (
              <Button asChild size="sm" className={HEADER_PILL}>
                <Link href="/dashboard">Ir a mi panel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-[#5E696B] hover:bg-transparent hover:text-[#5E696B] hover:opacity-80">
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

      <section className="relative overflow-hidden bg-[#F4F1EB] px-4 py-16 sm:py-24">
        {/* Decoración: blobs orgánicos y ramas, siempre detrás del contenido */}
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
          <path
            d="M100 0 C 70 10, 30 50, 25 100 C 20 150, 60 185, 100 200 Z"
            fill="#BCC7B5"
          />
        </svg>
        <Branch className="bottom-0 left-[2%] hidden h-[48%] w-auto sm:block" />
        <Branch className="bottom-0 right-[1%] hidden h-[45%] w-auto -scale-x-100 sm:block" />

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-2 text-center">
          <div className="relative inline-block px-10 sm:px-14">
            <Sparkles className="left-0 top-0" />
            <Sparkles className="right-0 top-0 -scale-x-100" />
            <span className="text-script-accent" aria-hidden="true" style={{ color: "#A38ED2" }}>
              tubodadiy
            </span>
          </div>
          <h1 className="mt-2 text-[#26413C]">Organiza tu boda paso a paso, todo en un mismo lugar</h1>
          <p className="max-w-xl text-balance font-sans text-base not-italic text-[#586C64] sm:text-lg">
            A diferencia de los directorios de proveedores, tubodadiy centraliza presupuesto,
            invitados, proveedores, timeline y tareas — con seguimiento real de tu progreso.
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

      <section className="w-full bg-[#ECE6F4] px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Card
              key={feature.title}
              className="rounded-2xl border-[#F8F5F1] bg-[#F8F5F1] text-[#102D28] shadow-none"
            >
              <CardHeader>
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full",
                    i % 2 === 0 ? "bg-[#DECDF1]" : "bg-[#D2D7CB]"
                  )}
                >
                  <feature.icon className="size-5 text-[#474755]" />
                </div>
                <CardTitle className="mt-2 font-display text-base font-semibold text-[#102D28]">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#677775]">
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
