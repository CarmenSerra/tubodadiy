"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { MailIcon } from "lucide-react";

import { CTA_SECONDARY } from "@/components/dashboard/ui";
import { InvitationDialog } from "@/components/invitation/invitation-dialog";
import { cn } from "@/lib/utils";

/** Parámetro de la URL que abre el editor: /plan/{id}/guests?invitacion=1 */
export const INVITATION_PARAM = "invitacion";

interface InvitationLauncher {
  open: () => void;
}

const InvitationLauncherContext = React.createContext<InvitationLauncher | null>(null);

/**
 * Dueño del editor de la invitación en Invitados: lo abre el botón de la
 * cabecera o el enlace directo `?invitacion=1` (que se limpia de la URL al
 * abrirse, para que cerrar y recargar no lo vuelva a abrir).
 */
export function InvitationLauncherProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const requested = searchParams.get(INVITATION_PARAM) === "1";

  React.useEffect(() => {
    if (!requested) return;
    // Abrir por enlace: sincroniza el diálogo con la URL y consume el parámetro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete(INVITATION_PARAM);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [requested]);

  const launcher = React.useMemo<InvitationLauncher>(() => ({ open: () => setOpen(true) }), []);

  return (
    <InvitationLauncherContext.Provider value={launcher}>
      {children}
      <InvitationDialog open={open} onOpenChange={setOpen} />
    </InvitationLauncherContext.Provider>
  );
}

/** Botón «Invitación» de la cabecera de Invitados. */
export function InvitationButton({ className }: { className?: string }) {
  const launcher = React.useContext(InvitationLauncherContext);
  if (!launcher) return null;
  return (
    <button type="button" onClick={launcher.open} className={cn(CTA_SECONDARY, className)}>
      <MailIcon aria-hidden="true" className="size-4" />
      Invitación
    </button>
  );
}
