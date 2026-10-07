"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function PlanNav({ planId }: { planId: string }) {
  const pathname = usePathname();
  const base = `/plan/${planId}`;

  const items = [
    { href: base, label: "Resumen" },
    { href: `${base}/guests`, label: "Invitados" },
    { href: `${base}/vendors`, label: "Proveedores" },
    { href: `${base}/budget`, label: "Presupuesto" },
  ];

  return (
    <nav
      aria-label="Secciones del plan"
      className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-[#E5DDEC] px-4 sm:mx-0 sm:gap-2 sm:px-0"
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
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#927AAC]",
              active
                ? "border-[#927AAC] text-[#26413C]"
                : "border-transparent text-[#586C64] hover:border-[#D4C0EA] hover:text-[#26413C]"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
