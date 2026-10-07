import Link from "next/link";
import { CalendarHeartIcon, ChevronRightIcon } from "lucide-react";

import { cn, formatDate, daysUntil } from "@/lib/utils";
import type { WeddingPlan } from "@/lib/types";

/**
 * Fila compacta de un plan (se usa en "Tus otros planes" de la home).
 * Enlace real a /plan/[id]; mismo hover suave que las tarjetas de la landing.
 */
export function PlanCard({ plan, tone = "lilac" }: { plan: WeddingPlan; tone?: "lilac" | "sage" }) {
  const days = daysUntil(plan.weddingDate);
  const when =
    days === null
      ? "Sin fecha todavía"
      : days > 1
        ? `${formatDate(plan.weddingDate)} · faltan ${days} días`
        : days === 1
          ? `${formatDate(plan.weddingDate)} · es mañana`
          : days === 0
            ? "¡Es hoy!"
            : formatDate(plan.weddingDate);

  return (
    <Link
      href={`/plan/${plan.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-[#E5DDEC] bg-[#F8F5F1] p-4 text-[#102D28] shadow-none outline-none transition-transform duration-300 ease-out hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EB] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-[#474755]",
          tone === "lilac" ? "bg-[#DECDF1]" : "bg-[#D2D7CB]"
        )}
      >
        <CalendarHeartIcon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base font-semibold text-[#102D28]">
          {plan.title}
        </span>
        <span className="block text-sm text-[#586C64]">{when}</span>
      </span>
      <ChevronRightIcon
        className="size-5 shrink-0 text-[#586C64] transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  );
}
