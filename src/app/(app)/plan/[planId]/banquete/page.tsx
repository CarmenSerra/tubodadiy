"use client";

import { BanquetPage } from "@/components/banquet/banquet-page";
import { usePlanContext } from "@/lib/context/plan-context";

export default function BanquetRoutePage() {
  const { planId } = usePlanContext();

  return <BanquetPage planId={planId} />;
}
