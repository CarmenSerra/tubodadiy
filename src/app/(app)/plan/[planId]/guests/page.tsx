"use client";

import { usePlanContext } from "@/lib/context/plan-context";
import { GuestsList } from "@/components/guests/guests-list";

export default function GuestsPage() {
  const { planId } = usePlanContext();

  return <GuestsList planId={planId} />;
}
