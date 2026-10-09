"use client";

import * as React from "react";

import { CeremonyPage } from "@/components/ceremony/ceremony-page";
import { TimelineLauncherProvider } from "@/components/timeline/timeline-launcher";

export default function CeremonyRoutePage() {
  // useSearchParams (?cronograma=1) pide un límite de Suspense.
  return (
    <React.Suspense fallback={null}>
      <TimelineLauncherProvider>
        <CeremonyPage />
      </TimelineLauncherProvider>
    </React.Suspense>
  );
}
