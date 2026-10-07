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
    { href: `${base}/members`, label: "Miembros" },
  ];

  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 pb-px sm:mx-0 sm:px-0">
      {items.map((item) => {
        const active = item.href === base ? pathname === base : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
