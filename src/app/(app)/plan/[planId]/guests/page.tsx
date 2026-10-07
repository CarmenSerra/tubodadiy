"use client";

import { usePlanContext } from "@/lib/context/plan-context";
import { GuestsList } from "@/components/guests/guests-list";
import { GuestFormDialog } from "@/components/guests/guest-form-dialog";

export default function GuestsPage() {
  const { planId } = usePlanContext();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Lista de invitados</h2>
        <GuestFormDialog planId={planId} />
      </div>
      <GuestsList planId={planId} />
    </div>
  );
}
