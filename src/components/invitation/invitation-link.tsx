"use client";

import Link from "next/link";
import { MailIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CTA_SECONDARY } from "@/components/dashboard/ui";
import { invitationHref } from "@/components/plan/task-links";
import { cn } from "@/lib/utils";

/** Botón «Invitación» de la cabecera de Invitados: lleva a la pestaña Invitación del plan. */
export function InvitationLink({ planId, className }: { planId: string; className?: string }) {
  const { t } = useTranslation("invitationPage");
  return (
    <Link href={invitationHref(planId)} className={cn(CTA_SECONDARY, "h-11", className)}>
      <MailIcon aria-hidden="true" className="size-4" />
      {t("guestsLink")}
    </Link>
  );
}
