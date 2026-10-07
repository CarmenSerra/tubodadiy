"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { PlanProvider, usePlanContext } from "@/lib/context/plan-context";
import { PlanNav } from "@/components/plan/plan-nav";

function PlanShellInner({ children }: { children: React.ReactNode }) {
  const { plan, loading, isMember } = usePlanContext();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan || !isMember) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="font-display text-xl font-semibold">No tienes acceso a este plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Puede que el plan no exista o que aún no seas miembro. Pide al dueño del plan que te
          invite de nuevo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{plan.title}</h1>
      </div>
      <PlanNav planId={plan.id} />
      {children}
    </div>
  );
}

export function PlanShell({
  planId,
  children,
}: {
  planId: string;
  children: React.ReactNode;
}) {
  return (
    <PlanProvider planId={planId}>
      <PlanShellInner>{children}</PlanShellInner>
    </PlanProvider>
  );
}
