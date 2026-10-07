"use client";

import Link from "next/link";
import {
  HeartIcon,
  ListChecksIcon,
  UsersIcon,
  WalletIcon,
  StoreIcon,
  CalendarClockIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";

// Colores de marca fijos para esta landing page (no los tokens globales
// --primary/--card/etc., que siguen usándose tal cual en el resto de la
// app): jerarquía crema/lila-claro/lila-medio/salvia/verde-oscuro pedida
// específicamente para esta página.
const BRAND_CTA = "bg-[#A894C7] text-[#F1EFE8] hover:bg-[#6B7C5E]";

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
      <header className="border-b bg-[#F1EFE8]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-[#A894C7]">
            <HeartIcon className="size-5 fill-current" />
            <span className="font-display text-lg font-semibold">tubodadiy</span>
          </div>
          <nav className="flex items-center gap-2">
            {!loading && user ? (
              <Button asChild size="sm" className={BRAND_CTA}>
                <Link href="/dashboard">Ir a mi panel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-[#2E3D34]">
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild size="sm" className={BRAND_CTA}>
                  <Link href="/signup">Regístrate</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="bg-[#F1EFE8] px-4 py-16 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 text-center">
          <span className="text-script-accent" aria-hidden="true" style={{ color: "#A894C7" }}>
            tubodadiy
          </span>
          <h1 className="mt-2 text-[#2E3D34]">Organiza tu boda paso a paso, todo en un mismo lugar</h1>
          <p className="max-w-xl text-balance font-display text-lg italic text-[#2E3D34]/80 sm:text-xl">
            A diferencia de los directorios de proveedores, tubodadiy centraliza presupuesto,
            invitados, proveedores, timeline y tareas — con seguimiento real de tu progreso.
          </p>
          <div className="flex gap-3">
            <Button asChild size="lg" className={BRAND_CTA}>
              <Link href={user ? "/dashboard" : "/signup"}>
                {user ? "Ir a mi panel" : "Empieza gratis"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl bg-[#DCCCF2] px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Card key={feature.title} className="bg-[#F1EFE8] text-[#2E3D34]">
              <CardHeader>
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full",
                    i % 2 === 0 ? "bg-[#DCCCF2]" : "bg-[#6B7C5E]/20"
                  )}
                >
                  <feature.icon className="size-5 text-[#2E3D34]" />
                </div>
                <CardTitle className="mt-2 text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#2E3D34]/75">
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
