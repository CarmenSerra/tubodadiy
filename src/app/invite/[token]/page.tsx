"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, HeartIcon } from "lucide-react";
import { toast } from "sonner";

import { HomeLink } from "@/components/brand/home-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { getInviteByToken } from "@/lib/firebase/invites";
import { acceptInvite } from "@/lib/actions/accept-invite";
import type { PlanInvite, PlanRole } from "@/lib/types";

const ROLE_LABEL: Record<PlanRole, string> = {
  owner: "Dueño/a",
  partner: "Pareja",
  planner: "Wedding planner",
};

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = use(params);
  const { user, loading: authLoading, firebaseReady } = useAuth();
  const router = useRouter();

  const [invite, setInvite] = React.useState<PlanInvite | null | undefined>(undefined);
  const [accepting, setAccepting] = React.useState(false);

  React.useEffect(() => {
    if (!firebaseReady) return;
    getInviteByToken(token)
      .then(setInvite)
      .catch(() => setInvite(null));
  }, [token, firebaseReady]);

  async function handleAccept() {
    if (!user) return;
    setAccepting(true);
    try {
      const idToken = await user.getIdToken();
      const result = await acceptInvite(token, idToken);
      if (result.success && result.planId) {
        toast.success("Te has unido al plan de boda");
        router.push(`/plan/${result.planId}`);
      } else {
        toast.error(result.error ?? "No se ha podido aceptar la invitación.");
      }
    } catch {
      toast.error("No se ha podido aceptar la invitación.");
    } finally {
      setAccepting(false);
    }
  }

  const loading = invite === undefined || authLoading;

  return (
    <main className="flex flex-1 items-center justify-center bg-secondary/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <HomeLink className="mb-2 flex items-center gap-2 text-primary">
            <HeartIcon className="size-5 fill-current" />
            <span className="font-display text-xl font-semibold">tubodadiy</span>
          </HomeLink>
          <CardTitle>Invitación a un plan de boda</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !invite ? (
            <CardDescription>
              Esta invitación no existe, ha caducado o ya ha sido utilizada.
            </CardDescription>
          ) : invite.status !== "pending" ? (
            <CardDescription>Esta invitación ya no está disponible.</CardDescription>
          ) : (
            <div className="flex flex-col gap-4">
              <CardDescription>
                <span className="font-medium text-foreground">{invite.email}</span> ha sido
                invitado/a a colaborar en <span className="font-medium text-foreground">{invite.planTitle}</span>{" "}
                como <span className="font-medium text-foreground">{ROLE_LABEL[invite.role]}</span>.
              </CardDescription>
              {!user ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Inicia sesión o crea una cuenta para aceptar la invitación.
                  </p>
                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/login?redirect=/invite/${token}`}>Iniciar sesión</Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={`/signup?redirect=/invite/${token}`}>Registrarse</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={handleAccept} disabled={accepting} className="w-full">
                  {accepting && <Loader2 className="animate-spin" />}
                  Aceptar invitación
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
