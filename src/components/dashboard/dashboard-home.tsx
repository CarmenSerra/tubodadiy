"use client";

import Link from "next/link";
import { AlertCircleIcon, ArrowRightIcon, Loader2, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { WeddingPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyHome } from "./empty-home";
import { GlanceRow } from "./glance-row";
import { firstName, type FeaturedPlanData } from "./helpers";
import { HomeHeader } from "./home-header";
import { NowCard } from "./now-card";
import { TaskReminders } from "./task-reminders";
import { UpcomingAppointments } from "./upcoming-appointments";
import { FOCUS, LINK, NEW_PLAN_HREF } from "./ui";

export interface DashboardHomeProps {
  /** displayName de Firebase Auth (puede venir vacío). */
  userName: string | null;
  userId: string;
  /** Plan que se está viendo (ver `rankPlans`) y todos los planes del usuario. */
  featured: WeddingPlan | null;
  plans: WeddingPlan[];
  onSelectPlan: (planId: string) => void;
  /** Datos del plan destacado; todo plano, sin acceso a Firestore aquí. */
  data: FeaturedPlanData;
  /** Esperando la lista de planes. */
  loadingPlans?: boolean;
  /** Falló la lista de planes (error real, el único en rojo). */
  plansError?: boolean;
}

/**
 * Home personal del usuario. Componente presentacional: recibe datos planos y
 * no toca Firebase, de modo que se puede pintar con datos de ejemplo (salvo la
 * tarjeta «Próximas citas», que se suscribe sola a la agenda del plan).
 *
 * Bloques, en este orden: cabecera (saludo + cuenta atrás), "Ahora toca"
 * (la única acción principal), "Próximas tareas" / "Atrasadas" (solo si hay tareas con
 * fecha), "Próximas citas" y "De un vistazo" (tres datos con enlace).
 */
export function DashboardHome({
  userName,
  userId,
  featured,
  plans,
  onSelectPlan,
  data,
  loadingPlans = false,
  plansError = false,
}: DashboardHomeProps) {
  const { t } = useTranslation("dashboard");
  const greetingName = firstName(userName);

  if (loadingPlans) {
    return (
      <div className="flex justify-center py-24" role="status" aria-label={t("home.loading")}>
        <Loader2 className="size-6 animate-spin text-lilac motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  }

  if (plansError) {
    return (
      <p
        role="alert"
        className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive"
      >
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t("home.plansError")}
      </p>
    );
  }

  if (!featured) {
    return <EmptyHome greetingName={greetingName} />;
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <HomeHeader
        plan={featured}
        plans={plans}
        data={data}
        greetingName={greetingName}
        currentUserId={userId}
        userName={userName}
        onSelectPlan={onSelectPlan}
      />

      {/* Cada bloque lee una sección: sin permiso para verla, no se muestra. */}
      {data.levels.tasks !== "none" && (
        <>
          <NowCard plan={featured} data={data} />

          <TaskReminders planId={featured.id} steps={data.steps} levels={data.levels} />

          <UpcomingAppointments planId={featured.id} />
        </>
      )}

      <GlanceRow plan={featured} data={data} />

      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <Link href={`/plan/${featured.id}`} className={cn(LINK, "inline-flex items-center gap-1.5")}>
          {t("home.viewPlan")}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href={NEW_PLAN_HREF}
          className={cn(
            FOCUS,
            "-mr-3 inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft motion-reduce:transition-none"
          )}
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          {t("newPlan")}
        </Link>
      </footer>
    </div>
  );
}
