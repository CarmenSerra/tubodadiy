"use client";

import * as React from "react";
import { CheckIcon, CopyIcon, Loader2, LockIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CTA_PRIMARY, CTA_SECONDARY, FOCUS, Skeleton } from "@/components/dashboard/ui";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCollection } from "@/lib/hooks/use-collection";
import { createInvite, mapInvite, pendingInvitesQuery } from "@/lib/firebase/invites";
import { cn, initials } from "@/lib/utils";
import type { PlanInvite, PlanMember, PlanRole } from "@/lib/types";
import { INVITE_ROLE_OPTIONS, ROLE_LABEL } from "./roles";

// Estilos de marca propios del modal (mismos tokens que la home).
const INPUT =
  "h-11 w-full min-w-0 rounded-xl border border-[#D4C0EA] bg-white px-3.5 text-sm text-[#102D28] outline-none placeholder:text-[#586C64] focus-visible:border-[#927AAC] focus-visible:ring-2 focus-visible:ring-[#927AAC]";
const ROW = "rounded-xl border border-[#E5DDEC] bg-white p-3";
const H3 = "font-display text-base font-semibold text-[#26413C]";

function inviteLink(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

function RoleChip({ role }: { role: PlanRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-[#26413C]",
        role === "owner" ? "bg-[#D2D7CB]" : "bg-[#DECDF1]"
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

function StatusChip({ pending }: { pending: boolean }) {
  return pending ? (
    <span className="inline-flex items-center rounded-full border border-[#D4C0EA] px-2.5 py-0.5 text-xs font-medium text-[#586C64]">
      Pendiente
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#586C64]">
      <CheckIcon className="size-3.5" aria-hidden="true" />
      En el plan
    </span>
  );
}

function Avatar({ label, index }: { label: string; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-[#474755]",
        index % 2 === 0 ? "bg-[#DECDF1]" : "bg-[#D2D7CB]"
      )}
    >
      {initials(label)}
    </span>
  );
}

function RowSkeleton() {
  return (
    <div className={cn(ROW, "flex items-center gap-3")} role="status" aria-label="Cargando">
      <Skeleton className="size-10" />
      <span className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </span>
    </div>
  );
}

/**
 * Copia el enlace al portapapeles. Si no hay Clipboard API (o falla), avisa
 * al llamador para que muestre el enlace seleccionado y se pueda copiar a mano.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Campo de solo lectura con el enlace, seleccionado al aparecer. */
function LinkField({ link, autoSelect = false, label }: { link: string; autoSelect?: boolean; label: string }) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (autoSelect) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [autoSelect]);
  return (
    <input
      ref={ref}
      readOnly
      aria-label={label}
      value={link}
      onFocus={(e) => e.currentTarget.select()}
      className={cn(INPUT, "h-10 text-xs")}
    />
  );
}

/** Botón "Copiar enlace" con su fallback (campo seleccionado) y aviso. */
function CopyLinkButton({
  link,
  onFallback,
  className,
}: {
  link: string;
  onFallback: () => void;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleCopy() {
    if (await copyText(link)) {
      setCopied(true);
      toast.success("Enlace copiado");
    } else {
      onFallback();
      toast("Selecciona el enlace y cópialo con Ctrl+C.");
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={cn(CTA_SECONDARY, "h-9 px-4", className)}>
      {copied ? <CheckIcon className="size-4" aria-hidden="true" /> : <CopyIcon className="size-4" aria-hidden="true" />}
      {copied ? "Copiado" : "Copiar enlace"}
    </button>
  );
}

function PendingInviteRow({ invite }: { invite: PlanInvite }) {
  const [manual, setManual] = React.useState(false);
  const link = inviteLink(invite.token);
  return (
    <li className={cn(ROW, "flex flex-col gap-3")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate text-sm font-medium text-[#102D28]">{invite.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <RoleChip role={invite.role} />
            <StatusChip pending />
          </div>
        </div>
        <CopyLinkButton link={link} onFallback={() => setManual(true)} />
      </div>
      {manual && <LinkField link={link} autoSelect label={`Enlace de invitación para ${invite.email}`} />}
    </li>
  );
}

function InviteForm({
  planId,
  planTitle,
  onCreated,
}: {
  planId: string;
  planTitle: string;
  onCreated: (invite: { token: string; email: string }) => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<PlanRole>("partner");
  const [submitting, setSubmitting] = React.useState(false);

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
      onCreated({ token, email: email.trim().toLowerCase() });
    } catch {
      toast.error("No se ha podido crear la invitación.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="team-invite-email" className="text-sm font-medium text-[#26413C]">
          Email de la persona invitada
        </label>
        <input
          id="team-invite-email"
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="pareja@email.com"
          className={INPUT}
        />
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-[#26413C]">Rol</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {INVITE_ROLE_OPTIONS.map((opt) => (
            <label key={opt.value} className="block cursor-pointer">
              <input
                type="radio"
                name="team-invite-role"
                value={opt.value}
                checked={role === opt.value}
                onChange={() => setRole(opt.value)}
                className="peer sr-only"
              />
              <span className="block h-full rounded-xl border border-[#D4C0EA] bg-white p-3 transition-colors peer-checked:border-[#927AAC] peer-checked:bg-[#ECE6F4] peer-focus-visible:ring-2 peer-focus-visible:ring-[#927AAC]">
                <span className="block text-sm font-medium text-[#102D28]">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-[#586C64]">{opt.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "w-full disabled:opacity-60 sm:w-auto sm:self-start")}>
        {submitting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <UserPlusIcon className="size-4" aria-hidden="true" />}
        Crear enlace de invitación
      </button>
    </form>
  );
}

/** Confirmación tras crear la invitación: enlace visible y copiable aquí mismo. */
function CreatedInvite({
  created,
  onAnother,
}: {
  created: { token: string; email: string };
  onAnother: () => void;
}) {
  const [manual, setManual] = React.useState(false);
  const link = inviteLink(created.token);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#D4C0EA] bg-[#ECE6F4] p-4" role="status">
      <p className="text-sm text-[#26413C]">
        <span className="font-medium">Invitación creada.</span> Comparte este enlace con{" "}
        <span className="break-all font-medium">{created.email}</span> por WhatsApp, email o como prefieras. Podrá
        aceptarla tras crear una cuenta o iniciar sesión.
      </p>
      <LinkField link={link} autoSelect={manual} label="Enlace de invitación" />
      <div className="flex flex-wrap items-center gap-2">
        <CopyLinkButton link={link} onFallback={() => setManual(true)} className="bg-white" />
        <button
          type="button"
          onClick={onAnother}
          className={cn(
            FOCUS,
            "h-9 rounded-full px-3 text-sm font-medium text-[#26413C] underline decoration-[#927AAC] decoration-2 underline-offset-4 hover:opacity-80"
          )}
        >
          Invitar a otra persona
        </button>
      </div>
    </div>
  );
}

function TeamBody({
  planId,
  planTitle,
  ownerId,
  members,
  membersLoading,
  currentUserId,
  userName,
}: Omit<TeamDialogProps, "open" | "onOpenChange" | "returnFocusRef">) {
  const { user } = useAuth();
  const isOwner = Boolean(currentUserId) && ownerId === currentUserId;
  const invitesQuery = React.useMemo(() => pendingInvitesQuery(planId), [planId]);
  const { data: invites, loading: invitesLoading } = useCollection(invitesQuery, mapInvite);
  const [created, setCreated] = React.useState<{ token: string; email: string } | null>(null);

  const visibleInvites = invites.filter((i) => i.token !== created?.token);

  const sortedMembers = [...members].sort((a, b) => {
    const rank = (m: PlanMember) => (m.role === "owner" ? 0 : m.status === "accepted" ? 1 : 2);
    return rank(a) - rank(b);
  });

  function memberName(m: PlanMember): { name: string; email: string | null } {
    if (m.userId === currentUserId) {
      const name = userName?.trim() || "Tú";
      return { name, email: user?.email ?? null };
    }
    if (m.invitedEmail) return { name: m.invitedEmail, email: null };
    return { name: m.role === "owner" ? "Dueño/a del plan" : "Invitado/a", email: null };
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="team-members-title" className="flex flex-col gap-3">
        <h3 id="team-members-title" className={H3}>
          En el plan
        </h3>
        {membersLoading && members.length === 0 ? (
          <div className="flex flex-col gap-2">
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sortedMembers.map((m, i) => {
              const { name, email } = memberName(m);
              return (
                <li key={m.userId} className={cn(ROW, "flex items-center gap-3")}>
                  <Avatar label={name} index={i} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#102D28]">
                      {name}
                      {m.userId === currentUserId && name !== "Tú" && (
                        <span className="font-normal text-[#586C64]"> (tú)</span>
                      )}
                    </p>
                    {email && <p className="truncate text-xs text-[#586C64]">{email}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <RoleChip role={m.role} />
                      <StatusChip pending={m.status === "pending"} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(invitesLoading || visibleInvites.length > 0) && (
        <section aria-labelledby="team-pending-title" className="flex flex-col gap-3">
          <h3 id="team-pending-title" className={H3}>
            Invitaciones pendientes
          </h3>
          {invitesLoading ? (
            <RowSkeleton />
          ) : (
            <ul className="flex flex-col gap-2">
              {visibleInvites.map((invite) => (
                <PendingInviteRow key={invite.token} invite={invite} />
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="team-invite-title" className="flex flex-col gap-3">
        <h3 id="team-invite-title" className={H3}>
          Invitar a alguien
        </h3>
        {isOwner ? (
          created ? (
            <CreatedInvite created={created} onAnother={() => setCreated(null)} />
          ) : (
            <>
              <p className="text-sm text-[#586C64]">
                Genera un enlace para que tu pareja o tu wedding planner vean y editen el plan contigo.
              </p>
              <InviteForm planId={planId} planTitle={planTitle} onCreated={setCreated} />
            </>
          )
        ) : (
          <p className="flex items-start gap-2.5 rounded-xl bg-[#ECE6F4] p-3.5 text-sm text-[#26413C]">
            <LockIcon className="mt-0.5 size-4 shrink-0 text-[#474755]" aria-hidden="true" />
            <span>
              Solo la persona dueña del plan puede enviar invitaciones. Si quieres sumar a alguien, coméntaselo y lo
              invitará encantada.
            </span>
          </p>
        )}
      </section>
    </div>
  );
}

export interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planTitle: string;
  ownerId: string;
  members: PlanMember[];
  membersLoading: boolean;
  currentUserId: string;
  userName: string | null;
  /** Elemento que abrió el modal; recibe el foco al cerrarlo. */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Modal "Equipo": personas del plan, invitaciones pendientes (con su enlace)
 * e invitación de nuevas personas. Solo el dueño puede invitar (reglas de
 * Firestore: `invites` create exige ser dueño del plan).
 */
export function TeamDialog({ open, onOpenChange, returnFocusRef, ...body }: TeamDialogProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        onOpenAutoFocus={(e) => {
          // Evita que en móvil salte el teclado al primer campo.
          e.preventDefault();
          contentRef.current?.focus();
        }}
        onCloseAutoFocus={(e) => {
          if (returnFocusRef?.current) {
            e.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
        className={cn(
          "max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg gap-5 rounded-2xl border-[#E5DDEC] bg-[#F8F5F1] p-5 text-[#102D28] sm:p-6",
          "[&>button]:right-3 [&>button]:top-3 [&>button]:rounded-full [&>button]:p-2 [&>button]:text-[#26413C] [&>button]:opacity-80",
          "[&>button]:focus:ring-[#927AAC] [&>button]:focus:ring-offset-[#F8F5F1]"
        )}
      >
        <div className="flex flex-col gap-1.5 pr-8">
          <DialogTitle className="font-display text-2xl font-semibold leading-tight text-[#26413C]">
            Equipo
          </DialogTitle>
          <DialogDescription className="text-sm text-[#586C64]">
            Las personas que organizan esta boda contigo.
          </DialogDescription>
        </div>
        <TeamBody {...body} />
      </DialogContent>
    </Dialog>
  );
}
