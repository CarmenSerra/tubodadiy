import { AlertCircleIcon, Loader2 } from "lucide-react";

import type { WeddingPlan } from "@/lib/types";
import { EmptyHome } from "./empty-home";
import { firstName, type FeaturedPlanData } from "./helpers";
import { NextSteps } from "./next-steps";
import { OtherPlans } from "./other-plans";
import { PlanHero } from "./plan-hero";
import { SnapshotTiles } from "./snapshot-tiles";

export interface DashboardHomeProps {
  /** displayName de Firebase Auth (puede venir vacío). */
  userName: string | null;
  userId: string;
  /** Plan destacado (ver `splitPlans`) y resto de planes. */
  featured: WeddingPlan | null;
  others: WeddingPlan[];
  /** Datos del plan destacado; todo plano, sin acceso a Firestore aquí. */
  data: FeaturedPlanData;
  /** Esperando la lista de planes. */
  loadingPlans?: boolean;
  /** Falló la lista de planes (error real, el único en rojo). */
  plansError?: boolean;
}

/**
 * Home personal del usuario. Componente presentacional: recibe datos planos y
 * no toca Firebase, de modo que se puede pintar con datos de ejemplo.
 */
export function DashboardHome({
  userName,
  userId,
  featured,
  others,
  data,
  loadingPlans = false,
  plansError = false,
}: DashboardHomeProps) {
  const greetingName = firstName(userName);

  if (loadingPlans) {
    return (
      <div className="flex justify-center py-24" role="status" aria-label="Cargando tu panel">
        <Loader2 className="size-6 animate-spin text-[#927AAC] motion-reduce:animate-none" aria-hidden="true" />
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
        No hemos podido cargar tus planes. Comprueba tu conexión y recarga la página.
      </p>
    );
  }

  if (!featured) {
    return <EmptyHome greetingName={greetingName} />;
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PlanHero plan={featured} data={data} greetingName={greetingName} />

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <NextSteps plan={featured} data={data} />
        <SnapshotTiles plan={featured} data={data} currentUserId={userId} userName={userName} />
      </div>

      <OtherPlans plans={others} />
    </div>
  );
}
