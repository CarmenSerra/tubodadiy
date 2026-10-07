"use client";

import * as React from "react";
import { CheckIcon, CopyIcon, Loader2, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/use-auth";
import { createInvite } from "@/lib/firebase/invites";
import type { PlanRole } from "@/lib/types";

const ROLE_OPTIONS: { value: PlanRole; label: string; description: string }[] = [
  { value: "partner", label: "Pareja", description: "Co-dueño del plan, acceso total" },
  { value: "planner", label: "Wedding planner", description: "Acceso total como colaborador" },
];

export function InviteDialog({ planId, planTitle }: { planId: string; planTitle: string }) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<PlanRole>("partner");
  const [submitting, setSubmitting] = React.useState(false);
  const [inviteLink, setInviteLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setEmail("");
      setRole("partner");
      setInviteLink(null);
      setCopied(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !email.trim()) return;
    setSubmitting(true);
    try {
      const token = await createInvite({
        planId,
        planTitle,
        email: email.trim(),
        role,
        invitedByUid: user.uid,
      });
      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);
    } catch {
      toast.error("No se ha podido crear la invitación.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlusIcon />
          Invitar
        </Button>
      </DialogTrigger>
      <DialogContent>
        {inviteLink ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitación creada</DialogTitle>
              <DialogDescription>
                Comparte este link con {email} por el medio que prefieras (WhatsApp, email...).
                Podrá aceptarla tras crear una cuenta o iniciar sesión.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex gap-2">
              <Input readOnly value={inviteLink} className="text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
              </Button>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Hecho
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Invitar a colaborar</DialogTitle>
              <DialogDescription>
                Genera un link de invitación con acceso total para ver y editar el plan.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-email">Email de la persona invitada</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pareja@email.com"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-role">Rol</Label>
                <Select value={role} onValueChange={(v) => setRole(v as PlanRole)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                Generar link de invitación
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
