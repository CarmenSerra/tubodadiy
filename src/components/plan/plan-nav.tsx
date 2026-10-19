"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { usePlanAccess } from "@/lib/hooks/use-plan-permission";
import type { PlanSection } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function PlanNav({ planId }: { planId: string }) {
  const pathname = usePathname();
  const { t } = useTranslation(["plan", "calendar"]);
  const base = `/plan/${planId}`;
  const access = usePlanAccess();

  const items = [
    { href: base, label: t("nav.overview"), section: "tasks" as PlanSection },
    { href: `${base}/calendario`, label: t("calendar:nav.label"), section: "tasks" as PlanSection },
    { href: `${base}/ceremonia`, label: t("nav.ceremony"), section: "ceremony" as PlanSection },
    { href: `${base}/guests`, label: t("nav.guests"), section: "guests" as PlanSection },
    { href: `${base}/invitation`, label: t("nav.invitation"), section: "invitation" as PlanSection },
    { href: `${base}/banquete`, label: t("nav.banquet"), section: "banquet" as PlanSection },
    { href: `${base}/estilo`, label: t("nav.style"), section: "style" as PlanSection },
    { href: `${base}/vendors`, label: t("nav.vendors"), section: "vendors" as PlanSection },
    { href: `${base}/budget`, label: t("nav.budget"), section: "budget" as PlanSection },
    { href: `${base}/dia-b`, label: t("nav.dayof"), section: "dayof" as PlanSection },
    { href: `${base}/honeymoon`, label: t("nav.honeymoon"), section: "honeymoon" as PlanSection },
  ].filter((item) => access.loading || access.levels[item.section] !== "none");

  return (
    <nav
      aria-label={t("nav.ariaLabel")}
      className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-line px-4 sm:mx-0 sm:gap-2 sm:px-0"
    >
      {items.map((item) => {
        const active = item.href === base ? pathname === base : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium outline-none transition-colors sm:px-4",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lilac",
              active
                ? "border-lilac text-ink"
                : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
