"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { usePlanContext } from "@/lib/context/plan-context";
import { GuestsList } from "@/components/guests/guests-list";
import { InvitationLauncherProvider } from "@/components/invitation/invitation-launcher";
import { GUEST_STATUS_PARAM } from "@/components/plan/task-links";
import type { RsvpStatus } from "@/lib/types";

const RSVP_VALUES: RsvpStatus[] = ["pending", "confirmed", "declined"];

/**
 * Enlace directo `?estado=pending`: abre la lista ya filtrada por respuesta
 * (lo usa la flecha de «Confirmar número final de invitados»). El parámetro se
 * limpia de la URL tras leerlo, para que quitar el filtro y recargar no lo
 * vuelva a aplicar.
 */
function GuestsFromLink({ planId }: { planId: string }) {
  const searchParams = useSearchParams();
  const param = searchParams.get(GUEST_STATUS_PARAM);
  const [initialStatus] = React.useState<RsvpStatus | undefined>(() =>
    RSVP_VALUES.find((v) => v === param)
  );

  React.useEffect(() => {
    if (!param) return;
    const url = new URL(window.location.href);
    url.searchParams.delete(GUEST_STATUS_PARAM);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [param]);

  return (
    <InvitationLauncherProvider>
      <GuestsList planId={planId} initialStatus={initialStatus} />
    </InvitationLauncherProvider>
  );
}

export default function GuestsPage() {
  const { planId } = usePlanContext();

  // useSearchParams pide un límite de Suspense.
  return (
    <React.Suspense fallback={null}>
      <GuestsFromLink planId={planId} />
    </React.Suspense>
  );
}
