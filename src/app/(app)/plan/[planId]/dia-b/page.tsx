"use client";

import * as React from "react";

import { DayOfPage } from "@/components/dayof/dayof-page";
import { TimelineLauncherProvider } from "@/components/timeline/timeline-launcher";

export default function DayOfRoutePage() {
  // useSearchParams (?cronograma=1) pide un límite de Suspense.
  return (
    <React.Suspense fallback={null}>
      <TimelineLauncherProvider>
        <DayOfPage />
      </TimelineLauncherProvider>
    </React.Suspense>
  );
}
