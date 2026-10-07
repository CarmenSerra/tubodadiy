"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";

import { TeamDialog } from "@/components/members/team-dialog";
import { ROLE_LABEL } from "@/components/members/roles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, daysUntil, formatDate, initials } from "@/lib/utils";
import type { PlanMember, WeddingPlan } from "@/lib/types";
import type { FeaturedPlanData } from "./helpers";
import { FOCUS, LINK, Skeleton } from "./ui";

const QUIET_BUTTON = cn(
  FOCUS,
  "inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-[#26413C] transition-colors hover:bg-[#ECE6F4] motion-reduce:transition-none"
);

/** Cuenta atrás tranquila: número grande y la fecha en pequeño. */
function Countdown({ plan, className }: { plan: WeddingPlan; className?: string }) {
  const days = daysUntil(plan.weddingDate);

  let body: React.ReactNode;
  if (days === null) {
    body = (
      <>
        <p className="font-display text-2xl font-medium text-[#26413C]">Aún sin fecha</p>
        <p className="mt-1 text-sm text-[#586C64]">
          <Link href={`/plan/${plan.id}`} className={LINK}>
            Ponle fecha a tu boda
          </Link>
        </p>
      </>
    );
  } else if (days === 0) {
    body = <p className="font-display text-3xl font-medium text-[#26413C]">¡Hoy es el gran día!</p>;
  } else if (days < 0) {
    body = (
      <>
        <p className="font-display text-2xl font-medium text-[#26413C]">Vuestro gran día</p>
        <p className="mt-1 text-sm text-[#586C64]">fue el {formatDate(plan.weddingDate)}</p>
      </>
    );
  } else {
    body = (
      <>
        <p className="flex items-baseline gap-2 sm:justify-end">
          <span className="font-display text-6xl font-medium leading-none tabular-nums text-[#26413C] sm:text-7xl">
            {days}
          </span>
          <span className="font-display text-xl text-[#26413C]">{days === 1 ? "día" : "días"}</span>
        </p>
        <p className="mt-2 text-sm text-[#586C64]">hasta el {formatDate(plan.weddingDate)}</p>
      </>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Decoración muy tenue que abraza la cuenta atrás (solo en pantallas anchas). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden rounded-[2.5rem] bg-[#ECE6F4] sm:block"
      />
      <div className="relative sm:px-9 sm:py-6">{body}</div>
    </div>
  );
}

function memberLabel(member: PlanMember, currentUserId: string, userName: string | null) {
  if (member.userId === currentUserId) return userName || "Tú";
  return member.invitedEmail || "Invitado/a";
}

/** Avatares apilados que abren el modal de equipo. */
function TeamButton({
  plan,
  data,
  currentUserId,
  userName,
}: {
  plan: WeddingPlan;
  data: FeaturedPlanData;
  currentUserId: string;
  userName: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  // El botón no es un <DialogTrigger>: devolvemos el foco a mano al cerrar.
  const openerRef = React.useRef<HTMLElement | null>(null);

  const waiting = data.loading && data.members.length === 0;
  const accepted = data.members.filter((m) => m.status === "accepted");
  const shown = accepted.slice(0, 3);
  const extra = accepted.length - shown.length;
  const alone = accepted.length <= 1;

  if (waiting) {
    return (
      <span role="status" aria-label="Cargando equipo" className="flex h-10 items-center">
        <Skeleton className="size-8" />
      </span>
    );
  }

  const names = shown.map((m) => `${memberLabel(m, currentUserId, userName)}, ${ROLE_LABEL[m.role]}`).join("; ");

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Equipo del plan: ${names || "solo tú"}${extra > 0 ? ` y ${extra} más` : ""}. Abrir`}
        onClick={(e) => {
          openerRef.current = e.currentTarget;
          setOpen(true);
        }}
        className={cn(QUIET_BUTTON, "-ml-1 pl-1")}
      >
        <span aria-hidden="true" className="flex items-center">
          {shown.map((m, i) => (
            <span
              key={m.userId}
              className={cn(
                "-ml-2 flex size-8 items-center justify-center rounded-full border-2 border-[#F4F1EB] text-xs font-semibold text-[#474755] first:ml-0",
                i % 2 === 0 ? "bg-[#DECDF1]" : "bg-[#D2D7CB]"
              )}
            >
              {initials(memberLabel(m, currentUserId, userName))}
            </span>
          ))}
          {extra > 0 && (
            <span className="-ml-2 flex size-8 items-center justify-center rounded-full border-2 border-[#F4F1EB] bg-[#ECE6F4] text-xs font-semibold text-[#26413C]">
              +{extra}
            </span>
          )}
        </span>
        <span aria-hidden="true">{alone ? "Invitar a alguien" : "Equipo"}</span>
      </button>
      <TeamDialog
        open={open}
        onOpenChange={setOpen}
        returnFocusRef={openerRef}
        planId={plan.id}
        planTitle={plan.title}
        ownerId={plan.ownerId}
        members={data.members}
        membersLoading={data.loading}
        currentUserId={currentUserId}
        userName={userName}
      />
    </>
  );
}

/** "Tus planes": solo aparece si hay más de uno. */
function PlanSwitcher({
  plans,
  selectedId,
  onSelect,
}: {
  plans: WeddingPlan[];
  selectedId: string;
  onSelect: (planId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(QUIET_BUTTON, "data-[state=open]:bg-[#ECE6F4]")}>
        Tus planes
        <ChevronDownIcon className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border-[#E5DDEC] bg-[#F8F5F1] p-1.5 text-[#26413C] shadow-none"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-sm font-medium text-[#586C64]">
          Elige qué plan ver
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={selectedId} onValueChange={onSelect}>
          {plans.map((plan) => (
            <DropdownMenuRadioItem
              key={plan.id}
              value={plan.id}
              className="flex-col items-start gap-0 rounded-lg py-2 pl-8 focus:bg-[#ECE6F4] focus:text-[#26413C]"
            >
              <span className="w-full truncate font-medium">{plan.title}</span>
              <span className="text-xs text-[#586C64]">
                {plan.weddingDate ? formatDate(plan.weddingDate) : "Sin fecha todavía"}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Cabecera de la home: saludo y nombre del plan a la izquierda, cuenta atrás a
 * la derecha (debajo del saludo en móvil). Equipo y cambio de plan, discretos.
 */
export function HomeHeader({
  plan,
  plans,
  data,
  greetingName,
  currentUserId,
  userName,
  onSelectPlan,
}: {
  plan: WeddingPlan;
  plans: WeddingPlan[];
  data: FeaturedPlanData;
  greetingName: string | null;
  currentUserId: string;
  userName: string | null;
  onSelectPlan: (planId: string) => void;
}) {
  return (
    <header
      aria-labelledby="home-greeting"
      className="grid gap-x-10 gap-y-5 sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div className="min-w-0 sm:col-start-1">
        <h1
          id="home-greeting"
          className="font-display text-2xl font-semibold leading-tight text-[#26413C] sm:text-3xl"
        >
          {greetingName ? `Hola, ${greetingName}` : "Hola"}
        </h1>
        <p
          className="text-script-accent mt-1 text-balance break-words text-[1.75rem] sm:text-4xl"
          style={{ color: "#26413C" }}
        >
          {plan.title}
        </p>
      </div>

      <Countdown plan={plan} className="sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:self-center sm:text-right" />

      <div className="-mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:col-start-1 sm:self-end">
        <TeamButton plan={plan} data={data} currentUserId={currentUserId} userName={userName} />
        {plans.length > 1 && <PlanSwitcher plans={plans} selectedId={plan.id} onSelect={onSelectPlan} />}
      </div>
    </header>
  );
}
