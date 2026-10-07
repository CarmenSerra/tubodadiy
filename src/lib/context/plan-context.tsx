"use client";

import * as React from "react";

import { useAuth } from "@/lib/hooks/use-auth";
import { useDoc } from "@/lib/hooks/use-doc";
import { planDocRef, mapPlan } from "@/lib/firebase/plans";
import type { WeddingPlan } from "@/lib/types";

interface PlanContextValue {
  planId: string;
  plan: WeddingPlan | null;
  loading: boolean;
  isMember: boolean;
}

const PlanContext = React.createContext<PlanContextValue | undefined>(undefined);

export function PlanProvider({
  planId,
  children,
}: {
  planId: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { data: plan, loading } = useDoc(planDocRef(planId), mapPlan);

  const isMember = Boolean(user && plan && plan.memberIds.includes(user.uid));

  const value = React.useMemo(
    () => ({ planId, plan, loading, isMember }),
    [planId, plan, loading, isMember]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlanContext() {
  const ctx = React.useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlanContext debe usarse dentro de <PlanProvider>");
  }
  return ctx;
}
