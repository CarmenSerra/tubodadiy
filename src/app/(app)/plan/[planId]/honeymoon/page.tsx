"use client";

import { HoneymoonPage } from "@/components/honeymoon/honeymoon-page";
import { usePlanContext } from "@/lib/context/plan-context";

export default function HoneymoonRoutePage() {
  const { planId } = usePlanContext();

  return <HoneymoonPage planId={planId} />;
}
