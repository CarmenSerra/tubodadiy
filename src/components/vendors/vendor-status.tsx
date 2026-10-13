import { CheckIcon, HeartIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { VendorStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Flujo de decisión en tono calmado. Todos con texto >= 4.5:1 sobre su fondo.
// El texto sale de vendors:status.<estado>.
export const VENDOR_STATUS: Record<VendorStatus, { className: string }> = {
  exploring: { className: "border-line-strong bg-lilac-soft text-ink" },
  visited: { className: "border-transparent bg-lilac-mid text-ink" },
  favorite: { className: "border-transparent bg-sage-pale text-ink" },
  chosen: { className: "border-transparent bg-deep text-on-solid" },
};

export const VENDOR_STATUS_VALUES = Object.keys(VENDOR_STATUS) as VendorStatus[];

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const { t } = useTranslation("vendors");
  const config = VENDOR_STATUS[status];
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", config.className)}
    >
      {status === "favorite" && <HeartIcon className="size-3" aria-hidden="true" />}
      {status === "chosen" && <CheckIcon className="size-3" aria-hidden="true" />}
      {t(`status.${status}`)}
    </Badge>
  );
}
