import { CheckIcon, HeartIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { VendorStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Flujo de decisión en tono calmado. Todos con texto >= 4.5:1 sobre su fondo.
export const VENDOR_STATUS: Record<VendorStatus, { label: string; className: string }> = {
  exploring: { label: "Explorando", className: "border-line-strong bg-lilac-soft text-ink" },
  visited: { label: "Visitada", className: "border-transparent bg-lilac-mid text-ink" },
  favorite: { label: "Favorita", className: "border-transparent bg-sage-pale text-ink" },
  chosen: { label: "Elegida", className: "border-transparent bg-deep text-on-solid" },
};

export const VENDOR_STATUS_OPTIONS = (Object.keys(VENDOR_STATUS) as VendorStatus[]).map((value) => ({
  value,
  label: VENDOR_STATUS[value].label,
}));

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const config = VENDOR_STATUS[status];
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", config.className)}
    >
      {status === "favorite" && <HeartIcon className="size-3" aria-hidden="true" />}
      {status === "chosen" && <CheckIcon className="size-3" aria-hidden="true" />}
      {config.label}
    </Badge>
  );
}
