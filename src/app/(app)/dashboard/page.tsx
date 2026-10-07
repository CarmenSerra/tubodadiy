"use client";

import { Loader2, HeartHandshakeIcon } from "lucide-react";

import { useAuth } from "@/lib/hooks/use-auth";
import { useCollection } from "@/lib/hooks/use-collection";
import { myPlansQuery, mapPlan } from "@/lib/firebase/plans";
import { CreatePlanDialog } from "@/components/plan/create-plan-dialog";
import { PlanCard } from "@/components/plan/plan-card";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: plans, loading } = useCollection(
    user ? myPlansQuery(user.uid) : null,
    mapPlan
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Tus planes de boda</h1>
          <p className="text-sm text-muted-foreground">
            Crea un plan o continúa organizando uno existente.
          </p>
        </div>
        <CreatePlanDialog />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <HeartHandshakeIcon className="size-8 text-primary" />
          <p className="font-display text-lg">Aún no tienes ningún plan de boda</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Crea tu primer plan para empezar a organizar la fecha, el presupuesto, los
            invitados y todo lo demás desde un mismo lugar.
          </p>
          <CreatePlanDialog />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
