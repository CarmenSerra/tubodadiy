"use client";

import * as React from "react";

import { LookPage } from "@/components/look/look-page";
import { usePlanContext } from "@/lib/context/plan-context";

export default function LookRoutePage() {
  const { planId } = usePlanContext();

  // useSearchParams (?citas=1, de la agenda) pide un límite de Suspense.
  return (
    <React.Suspense fallback={null}>
      <LookPage planId={planId} />
    </React.Suspense>
  );
}
