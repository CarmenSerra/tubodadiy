import Link from "next/link";
import { ChevronRightIcon, StoreIcon, UsersIcon, WalletIcon, HeartHandshakeIcon } from "lucide-react";

import { initials, formatCurrency, cn } from "@/lib/utils";
import type { PlanMember, PlanRole, WeddingPlan } from "@/lib/types";
import {
  pluralize,
  summarizeBudget,
  summarizeGuests,
  summarizeVendors,
  type FeaturedPlanData,
} from "./helpers";
import { CARD, FOCUS, IconCircle, LIFT, MiniBar, Skeleton } from "./ui";

const ROLE_LABEL: Record<PlanRole, string> = {
  owner: "Dueño/a",
  partner: "Pareja",
  planner: "Wedding planner",
};

const COMPANION_LABEL: Record<PlanRole, string> = {
  owner: "otra persona",
  partner: "tu pareja",
  planner: "tu wedding planner",
};

function Tile({
  href,
  title,
  icon,
  tone,
  loading,
  children,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  tone: "lilac" | "sage";
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(CARD, LIFT, FOCUS, "group flex h-full flex-col gap-3 p-4 sm:p-5")}
    >
      <div className="flex items-center gap-3">
        <IconCircle tone={tone} className="size-9 sm:size-10">
          {icon}
        </IconCircle>
        <h3 className="min-w-0 flex-1 font-display text-base font-semibold text-[#102D28]">{title}</h3>
        <ChevronRightIcon
          className="hidden size-5 shrink-0 text-[#586C64] transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none sm:block"
          aria-hidden="true"
        />
      </div>
      {loading ? (
        <span className="flex flex-col gap-2.5" role="status" aria-label={`Cargando ${title.toLowerCase()}`}>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-1.5 w-full" />
        </span>
      ) : (
        children
      )}
    </Link>
  );
}

function Metric({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return (
    <span
      className={cn(
        "block font-display font-semibold leading-tight text-[#26413C]",
        small ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
      )}
    >
      {children}
    </span>
  );
}

function Detail({ children }: { children: React.ReactNode }) {
  return <span className="block text-sm text-[#586C64]">{children}</span>;
}

function BudgetTile({ plan, data }: { plan: WeddingPlan; data: FeaturedPlanData }) {
  const b = summarizeBudget(plan, data.budgetItems);
  const empty = b.total === 0 && b.itemCount === 0;
  return (
    <Tile
      href={`/plan/${plan.id}/budget`}
      title="Presupuesto"
      tone="lilac"
      icon={<WalletIcon />}
      loading={data.loading && data.budgetItems.length === 0}
    >
      {empty ? (
        <>
          <Metric small>Por definir</Metric>
          <Detail>Fija tu presupuesto y apunta las primeras partidas.</Detail>
        </>
      ) : (
        <>
          <span>
            <Metric>{formatCurrency(b.spent)}</Metric>
            <Detail>
              {b.total > 0 ? `gastados de ${formatCurrency(b.total)}` : "gastados hasta ahora"}
            </Detail>
          </span>
          {b.total > 0 && <MiniBar value={b.spentRatio} tone="lilac" />}
          <Detail>
            {b.over > 0
              ? `Un poco por encima del total (${formatCurrency(b.over)}). Revisa las partidas con calma.`
              : `Estimado: ${formatCurrency(b.estimated)}`}
          </Detail>
        </>
      )}
    </Tile>
  );
}

function GuestsTile({ plan, data }: { plan: WeddingPlan; data: FeaturedPlanData }) {
  const g = summarizeGuests(data.guests);
  return (
    <Tile
      href={`/plan/${plan.id}/guests`}
      title="Invitados"
      tone="sage"
      icon={<UsersIcon />}
      loading={data.loading && data.guests.length === 0}
    >
      {g.total === 0 ? (
        <>
          <Metric small>Sin lista aún</Metric>
          <Detail>Empieza con las personas que no pueden faltar.</Detail>
        </>
      ) : (
        <>
          <span>
            <Metric>{g.total}</Metric>
            <Detail>{g.total === 1 ? "invitado" : "invitados"} en tu lista</Detail>
          </span>
          <MiniBar value={g.ratio} tone="sage" />
          <Detail>
            {g.confirmed} {g.confirmed === 1 ? "confirmado" : "confirmados"} ·{" "}
            {pluralize(g.pending, "pendiente", "pendientes")} de respuesta
          </Detail>
        </>
      )}
    </Tile>
  );
}

function VendorsTile({ plan, data }: { plan: WeddingPlan; data: FeaturedPlanData }) {
  const v = summarizeVendors(data.vendors);
  return (
    <Tile
      href={`/plan/${plan.id}/vendors`}
      title="Proveedores"
      tone="lilac"
      icon={<StoreIcon />}
      loading={data.loading && data.vendors.length === 0}
    >
      {v.total === 0 ? (
        <>
          <Metric small>Sin proveedores</Metric>
          <Detail>Guarda aquí catering, foto, música, flores...</Detail>
        </>
      ) : (
        <>
          <span>
            <Metric>
              {v.booked} <span className="text-lg font-medium text-[#586C64]">de {v.total}</span>
            </Metric>
            <Detail>{v.booked === 1 ? "contratado" : "contratados"}</Detail>
          </span>
          <MiniBar value={v.ratio} tone="sage" />
          <Detail>{`${v.considering} en estudio`}</Detail>
        </>
      )}
    </Tile>
  );
}

function memberLabel(member: PlanMember, currentUserId: string, userName: string | null) {
  if (member.userId === currentUserId) return userName || "Tú";
  return member.invitedEmail || "Invitado/a";
}

function TeamTile({
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
  const accepted = data.members.filter((m) => m.status === "accepted");
  const pendingCount = data.members.length - accepted.length;
  const shown = accepted.slice(0, 4);
  const extra = accepted.length - shown.length;
  const alone = accepted.length <= 1;
  const others = accepted.filter((m) => m.userId !== currentUserId);

  return (
    <Tile
      href={`/plan/${plan.id}/members`}
      title="Equipo"
      tone="sage"
      icon={<HeartHandshakeIcon />}
      loading={data.loading && data.members.length === 0}
    >
      {accepted.length === 0 ? (
        <>
          <Metric small>Solo tú</Metric>
          <Detail>Invita a tu pareja o a tu wedding planner.</Detail>
        </>
      ) : (
        <>
          <ul className="flex items-center" aria-label="Personas del plan">
            {shown.map((m, i) => {
              const label = memberLabel(m, currentUserId, userName);
              return (
                <li
                  key={m.userId}
                  title={`${label} · ${ROLE_LABEL[m.role]}`}
                  className={cn(
                    "-ml-2 flex size-10 items-center justify-center rounded-full border-2 border-[#F8F5F1] text-sm font-semibold text-[#474755] first:ml-0",
                    i % 2 === 0 ? "bg-[#DECDF1]" : "bg-[#D2D7CB]"
                  )}
                >
                  <span aria-hidden="true">{initials(label)}</span>
                  <span className="sr-only">
                    {label}, {ROLE_LABEL[m.role]}
                  </span>
                </li>
              );
            })}
            {extra > 0 && (
              <li className="-ml-2 flex size-10 items-center justify-center rounded-full border-2 border-[#F8F5F1] bg-[#ECE6F4] text-xs font-semibold text-[#26413C]">
                +{extra}
              </li>
            )}
          </ul>
          <Detail>
            {alone
              ? "Ahora mismo solo estás tú. Invita a tu pareja o a tu planner."
              : others.length === 1
                ? `Organizas junto a ${COMPANION_LABEL[others[0].role]}.`
                : `Organizas junto a ${pluralize(others.length, "persona más", "personas más")}.`}
            {pendingCount > 0 && ` ${pluralize(pendingCount, "invitación pendiente", "invitaciones pendientes")}.`}
          </Detail>
        </>
      )}
    </Tile>
  );
}

export function SnapshotTiles({
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
  return (
    <section aria-labelledby="snapshot-title" className="grid grid-cols-2 gap-3 sm:gap-4">
      <h2 id="snapshot-title" className="sr-only">
        Resumen de tu plan
      </h2>
      <BudgetTile plan={plan} data={data} />
      <GuestsTile plan={plan} data={data} />
      <VendorsTile plan={plan} data={data} />
      <TeamTile plan={plan} data={data} currentUserId={currentUserId} userName={userName} />
    </section>
  );
}
