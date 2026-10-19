"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, CopyIcon, Loader2, LockIcon, UserMinusIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CTA_PRIMARY, CTA_SECONDARY, FOCUS, Skeleton } from "@/components/dashboard/ui";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCollection } from "@/lib/hooks/use-collection";
import { createInvite, mapInvite, pendingInvitesQuery } from "@/lib/firebase/invites";
import { removeMember } from "@/lib/firebase/members";
import { cn, initials } from "@/lib/utils";
import type { PlanInvite, PlanMember, PlanRole } from "@/lib/types";
import { hasAdjustableAccess } from "@/lib/permissions";
import { MemberPermissions } from "./member-permissions";
import { INVITE_ROLES, roleDescription, roleLabel } from "./roles";

// Estilos de marca propios del modal (mismos tokens que la home).
const INPUT =
  "h-11 w-full min-w-0 rounded-xl border border-line-strong bg-field px-3.5 text-sm text-ink-strong outline-none placeholder:text-ink-muted focus-visible:border-lilac focus-visible:ring-2 focus-visible:ring-lilac";
const ROW = "rounded-xl border border-line bg-raised p-3";
const H3 = "font-display text-base font-semibold text-ink";

function inviteLink(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

function RoleChip({ role }: { role: PlanRole }) {
  const { t } = useTranslation("dashboard");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-ink",
        role === "owner" ? "bg-sage-pale" : "bg-lilac-mid"
      )}
    >
      {roleLabel(role, t)}
    </span>
  );
}

function StatusChip({ pending }: { pending: boolean }) {
  const { t } = useTranslation("dashboard");
  return pending ? (
    <span className="inline-flex items-center rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-medium text-ink-muted">
      {t("team.status.pending")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
      <CheckIcon className="size-3.5" aria-hidden="true" />
      {t("team.status.inPlan")}
    </span>
  );
}

function Avatar({ label, index }: { label: string; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-ink-on-tint",
        index % 2 === 0 ? "bg-lilac-mid" : "bg-sage-pale"
      )}
    >
      {initials(label)}
    </span>
  );
}

function RowSkeleton() {
  const { t } = useTranslation("dashboard");
  return (
    <div className={cn(ROW, "flex items-center gap-3")} role="status" aria-label={t("team.loading")}>
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
  const { t } = useTranslation("dashboard");
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    if (await copyText(link)) {
      setCopied(true);
      toast.success(t("team.copy.toastCopied"));
    } else {
      onFallback();
      toast(t("team.copy.toastManual"));
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={cn(CTA_SECONDARY, "h-9 px-4", className)}>
      {copied ? <CheckIcon className="size-4" aria-hidden="true" /> : <CopyIcon className="size-4" aria-hidden="true" />}
      {copied ? t("team.copy.copied") : t("team.copy.copy")}
    </button>
  );
}

function PendingInviteRow({ invite }: { invite: PlanInvite }) {
  const { t } = useTranslation("dashboard");
  const [manual, setManual] = React.useState(false);
  const link = inviteLink(invite.token);
  return (
    <li className={cn(ROW, "flex flex-col gap-3")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate text-sm font-medium text-ink-strong">{invite.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <RoleChip role={invite.role} />
            <StatusChip pending />
          </div>
        </div>
        <CopyLinkButton link={link} onFallback={() => setManual(true)} />
      </div>
      {manual && <LinkField link={link} autoSelect label={t("team.pending.linkFor", { email: invite.email })} />}
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
  const { t } = useTranslation("dashboard");
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
      toast.error(t("team.invite.createError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="team-invite-email" className="text-sm font-medium text-ink">
          {t("team.invite.emailLabel")}
        </label>
        <input
          id="team-invite-email"
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("team.invite.emailPlaceholder")}
          className={INPUT}
        />
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-ink">{t("team.invite.role")}</legend>
        <div className="grid gap-2">
          {INVITE_ROLES.map((value) => (
            <label key={value} className="block cursor-pointer">
              <input
                type="radio"
                name="team-invite-role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="peer sr-only"
              />
              <span className="block h-full rounded-xl border border-line-strong bg-raised p-3 transition-colors peer-checked:border-lilac peer-checked:bg-lilac-soft peer-focus-visible:ring-2 peer-focus-visible:ring-lilac">
                <span className="block text-sm font-medium text-ink-strong">{roleLabel(value, t)}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{roleDescription(value, t)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "w-full disabled:opacity-60 sm:w-auto sm:self-start")}>
        {submitting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <UserPlusIcon className="size-4" aria-hidden="true" />}
        {t("team.invite.submit")}
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
  const { t } = useTranslation("dashboard");
  const [manual, setManual] = React.useState(false);
  const link = inviteLink(created.token);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line-strong bg-lilac-soft p-4" role="status">
      <p className="text-sm text-ink">
        <Trans
          i18nKey="team.created.message"
          ns="dashboard"
          components={{
            strong: <span className="font-medium" />,
            email: <span className="break-all font-medium">{created.email}</span>,
          }}
        />
      </p>
      <LinkField link={link} autoSelect={manual} label={t("team.created.linkLabel")} />
      <div className="flex flex-wrap items-center gap-2">
        <CopyLinkButton link={link} onFallback={() => setManual(true)} className="bg-raised" />
        <button
          type="button"
          onClick={onAnother}
          className={cn(
            FOCUS,
            "h-9 rounded-full px-3 text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80"
          )}
        >
          {t("team.created.another")}
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
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  // Invitan y ajustan permisos el dueño y la pareja (reglas de Firestore).
  const myRole = members.find((m) => m.userId === currentUserId)?.role;
  const canManage = Boolean(currentUserId) && (ownerId === currentUserId || myRole === "partner");
  // Quitar a alguien del plan es solo del dueño/a (reglas de Firestore).
  const isOwner = Boolean(currentUserId) && ownerId === currentUserId;
  const [adjusting, setAdjusting] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<{ member: PlanMember; name: string } | null>(null);
  const [removeBusy, setRemoveBusy] = React.useState(false);
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
      const name = userName?.trim() || t("team.you");
      return { name, email: user?.email ?? null };
    }
    if (m.invitedEmail) return { name: m.invitedEmail, email: null };
    return { name: m.role === "owner" ? t("team.planOwner") : t("team.guestFallback"), email: null };
  }

  async function confirmRemove() {
    if (!removing) return;
    const { member, name } = removing;
    setRemoveBusy(true);
    try {
      await removeMember(planId, member.userId);
      if (adjusting === member.userId) setAdjusting(null);
      toast.success(t("team.remove.done", { name }));
      setRemoving(null);
    } catch {
      toast.error(t("team.remove.error"));
    } finally {
      setRemoveBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="team-members-title" className="flex flex-col gap-3">
        <h3 id="team-members-title" className={H3}>
          {t("team.sections.inPlan")}
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
                <li key={m.userId} className={ROW}>
                <div className="flex items-center gap-3">
                  <Avatar label={name} index={i} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-strong">
                      {name}
                      {m.userId === currentUserId && name !== t("team.you") && (
                        <span className="font-normal text-ink-muted"> {t("team.youSuffix")}</span>
                      )}
                    </p>
                    {email && <p className="truncate text-xs text-ink-muted">{email}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <RoleChip role={m.role} />
                      <StatusChip pending={m.status === "pending"} />
                    </div>
                  </div>
                  {canManage && hasAdjustableAccess(m.role) && m.userId !== currentUserId && (
                    <button
                      type="button"
                      aria-expanded={adjusting === m.userId}
                      aria-controls={`team-access-${m.userId}`}
                      onClick={() => setAdjusting(adjusting === m.userId ? null : m.userId)}
                      className={cn(CTA_SECONDARY, "h-11 shrink-0 px-4")}
                    >
                      {t("team.access.adjust")}
                      <ChevronDownIcon
                        className={cn("size-4 transition-transform motion-reduce:transition-none", adjusting === m.userId && "rotate-180")}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                  {isOwner && m.role !== "owner" && m.userId !== currentUserId && (
                    <button
                      type="button"
                      aria-label={t("team.remove.aria", { name })}
                      title={t("team.remove.action")}
                      onClick={() => setRemoving({ member: m, name })}
                      className={cn(
                        FOCUS,
                        "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink motion-reduce:transition-none"
                      )}
                    >
                      <UserMinusIcon className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                {adjusting === m.userId && (
                  <div id={`team-access-${m.userId}`}>
                    <MemberPermissions planId={planId} member={m} memberName={name} />
                  </div>
                )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(invitesLoading || visibleInvites.length > 0) && (
        <section aria-labelledby="team-pending-title" className="flex flex-col gap-3">
          <h3 id="team-pending-title" className={H3}>
            {t("team.sections.pending")}
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
          {t("team.sections.invite")}
        </h3>
        {canManage ? (
          created ? (
            <CreatedInvite created={created} onAnother={() => setCreated(null)} />
          ) : (
            <>
              <p className="text-sm text-ink-muted">
                {t("team.invite.intro")}
              </p>
              <InviteForm planId={planId} planTitle={planTitle} onCreated={setCreated} />
            </>
          )
        ) : (
          <p className="flex items-start gap-2.5 rounded-xl bg-lilac-soft ring-1 ring-lilac-edge p-3.5 text-sm text-ink">
            <LockIcon className="mt-0.5 size-4 shrink-0 text-ink-on-tint" aria-hidden="true" />
            <span>{t("team.ownerOnly")}</span>
          </p>
        )}
      </section>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && !removeBusy && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("team.remove.title", { name: removing?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("team.remove.text")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeBusy}>{t("team.remove.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeBusy}
              onClick={(e) => {
                e.preventDefault();
                void confirmRemove();
              }}
            >
              {removeBusy && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {t("team.remove.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
 * e invitación de nuevas personas. Invitan y ajustan el acceso por sección el
 * dueño y la pareja (reglas de Firestore: `invites` y `members`).
 */
export function TeamDialog({ open, onOpenChange, returnFocusRef, ...body }: TeamDialogProps) {
  const { t } = useTranslation("dashboard");
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
          "max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg gap-5 rounded-2xl border-line bg-surface p-5 text-ink-strong sm:p-6",
          "[&>button]:right-3 [&>button]:top-3 [&>button]:rounded-full [&>button]:p-2 [&>button]:text-ink [&>button]:opacity-80",
          "[&>button]:focus:ring-lilac [&>button]:focus:ring-offset-surface"
        )}
      >
        <div className="flex flex-col gap-1.5 pr-8">
          <DialogTitle className="font-display text-2xl font-semibold leading-tight text-ink">
            {t("team.title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-muted">
            {t("team.description")}
          </DialogDescription>
        </div>
        <TeamBody {...body} />
      </DialogContent>
    </Dialog>
  );
}
