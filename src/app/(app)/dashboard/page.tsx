"use client";

import * as React from "react";

import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { splitPlans, type FeaturedPlanData } from "@/components/dashboard/helpers";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCollection } from "@/lib/hooks/use-collection";
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

export default function DashboardPage() {
  const { user } = useAuth();
  const uid = user?.uid;

  // Las queries se memorizan: useCollection se vuelve a suscribir cada vez
  // que cambia la identidad de la query, así que no se pueden recrear en
  // cada render.
  const plansQuery = React.useMemo(() => (uid ? myPlansQuery(uid) : null), [uid]);
  const plans = useCollection(plansQuery, mapPlan);
  const { featured, others } = React.useMemo(() => splitPlans(plans.data), [plans.data]);

  // Suscripciones solo del plan destacado (5 listeners + 1 de planes = 6).
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
      others={others}
      data={data}
      loadingPlans={plans.loading}
      plansError={Boolean(plans.error)}
    />
  );
}
