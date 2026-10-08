"use client";

import * as React from "react";

import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { SELECTED_PLAN_KEY, rankPlans, type FeaturedPlanData } from "@/components/dashboard/helpers";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCollection } from "@/lib/hooks/use-collection";
import type { WeddingPlan } from "@/lib/types";
import {
  budgetItemsQuery,
  guestsQuery,
  mapBudgetItem,
  mapGuest,
  mapMember,
  mapPlan,
  mapStep,
  mapVendor,
  membersQuery,
  myPlansQuery,
  stepsQuery,
  vendorsQuery,
} from "@/lib/firebase/plans";

function readSelectedPlan(): string | null {
  try {
    return window.localStorage.getItem(SELECTED_PLAN_KEY);
  } catch {
    return null;
  }
}

/**
 * Suscripciones del plan que se está viendo (5 listeners + 1 de planes = 6).
 * Se monta con `key` = id del plan, de modo que al cambiar de plan el estado se
 * reinicia y nunca se pintan datos del plan anterior.
 */
function PlanHome({
  plans,
  featured,
  onSelectPlan,
  loadingPlans,
  plansError,
}: {
  plans: WeddingPlan[];
  featured: WeddingPlan | null;
  onSelectPlan: (planId: string) => void;
  loadingPlans: boolean;
  plansError: boolean;
}) {
  const { user } = useAuth();
  const uid = user?.uid;

  // Las queries se memorizan: useCollection se vuelve a suscribir cada vez
  // que cambia la identidad de la query, así que no se pueden recrear en
  // cada render.
  const featuredId = featured?.id;
  const q = React.useMemo(
    () =>
      featuredId
        ? {
            steps: stepsQuery(featuredId),
            guests: guestsQuery(featuredId),
            vendors: vendorsQuery(featuredId),
            budget: budgetItemsQuery(featuredId),
            members: membersQuery(featuredId),
          }
        : null,
    [featuredId]
  );
  const steps = useCollection(q?.steps ?? null, mapStep);
  const guests = useCollection(q?.guests ?? null, mapGuest);
  const vendors = useCollection(q?.vendors ?? null, mapVendor);
  const budget = useCollection(q?.budget ?? null, mapBudgetItem);
  const members = useCollection(q?.members ?? null, mapMember);

  const data: FeaturedPlanData = {
    steps: steps.data,
    guests: guests.data,
    vendors: vendors.data,
    budgetItems: budget.data,
    members: members.data,
    loading: steps.loading || guests.loading || vendors.loading || budget.loading || members.loading,
    error: Boolean(steps.error || guests.error || vendors.error || budget.error || members.error),
  };

  return (
    <DashboardHome
      userName={user?.displayName ?? null}
      userId={uid ?? ""}
      featured={featured}
      plans={plans}
      onSelectPlan={onSelectPlan}
      data={data}
      loadingPlans={loadingPlans}
      plansError={plansError}
    />
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const uid = user?.uid;

  const plansQuery = React.useMemo(() => (uid ? myPlansQuery(uid) : null), [uid]);
  const plans = useCollection(plansQuery, mapPlan);
  const ranked = React.useMemo(() => rankPlans(plans.data), [plans.data]);

  // Mientras se cargan los planes solo se pinta un spinner, así que leer
  // localStorage al montar no provoca diferencias de hidratación.
  const [selectedId, setSelectedId] = React.useState<string | null>(() =>
    typeof window === "undefined" ? null : readSelectedPlan()
  );
  const featured = ranked.find((p) => p.id === selectedId) ?? ranked[0] ?? null;

  function selectPlan(planId: string) {
    setSelectedId(planId);
    try {
      window.localStorage.setItem(SELECTED_PLAN_KEY, planId);
    } catch {
      // Sin almacenamiento: el cambio vale solo para esta visita.
    }
  }

  return (
    <PlanHome
      key={featured?.id ?? "none"}
      plans={ranked}
      featured={featured}
      onSelectPlan={selectPlan}
      loadingPlans={plans.loading}
      plansError={Boolean(plans.error)}
    />
  );
}
