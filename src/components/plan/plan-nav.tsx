"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export function PlanNav({ planId }: { planId: string }) {
  const pathname = usePathname();
  const { t } = useTranslation("plan");
  const base = `/plan/${planId}`;

  const items = [
    { href: base, label: t("nav.overview") },
    { href: `${base}/ceremonia`, label: t("nav.ceremony") },
    { href: `${base}/guests`, label: t("nav.guests") },
    { href: `${base}/vendors`, label: t("nav.vendors") },
    { href: `${base}/budget`, label: t("nav.budget") },
    { href: `${base}/honeymoon`, label: t("nav.honeymoon") },
  ];

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
