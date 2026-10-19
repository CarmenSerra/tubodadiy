"use client";

import { CalendarPage } from "@/components/calendar/calendar-page";
import { usePlanContext } from "@/lib/context/plan-context";

export default function CalendarRoutePage() {
  const { planId } = usePlanContext();

  return <CalendarPage planId={planId} />;
}
