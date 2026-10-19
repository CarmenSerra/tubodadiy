"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, EyeIcon, LockIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CARD, CTA_SECONDARY, IconCircle } from "@/components/dashboard/ui";
import { usePlanContext } from "@/lib/context/plan-context";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import type { PlanSection } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/**
 * Guarda de una sección del plan según el permiso de la persona:
 *  - sin acceso: tarjeta amable en lugar de la página (sin errores de Firestore);
 *  - solo ver: la página con un aviso discreto (las reglas ya impiden guardar);
 *  - editar: la página tal cual.
 */
export function SectionGuard({
  section,
  children,
}: {
  section: PlanSection;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("tools");
  const { planId } = usePlanContext();
  const { level, loading } = usePlanPermission(section);

  if (loading) {
    return (
      <div
        role="status"
        aria-label={t("members.access.loading")}
        className="h-40 animate-pulse rounded-2xl bg-lilac-soft motion-reduce:animate-none"
      />
    );
  }

  if (level === "none") {
    return (
      <div className={cn(CARD, "mx-auto my-10 flex max-w-md flex-col items-center p-8 text-center")}>
        <IconCircle tone="lilac" className="size-12">
          <LockIcon />
        </IconCircle>
        <h2 className="mt-4 font-display text-xl font-semibold text-ink">
          {t("members.access.noView.title")}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          {t("members.access.noView.description", { section: t(`members.sections.${section}`) })}
        </p>
        <Link href={`/plan/${planId}`} className={cn(CTA_SECONDARY, "mt-5")}>
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {t("members.access.noView.back")}
        </Link>
      </div>
    );
  }

  return (
    <>
      {level === "view" && (
        <p
          role="note"
          className="mb-5 flex items-start gap-2.5 rounded-xl bg-lilac-soft p-3.5 text-sm text-ink ring-1 ring-lilac-edge"
        >
          <EyeIcon className="mt-0.5 size-4 shrink-0 text-ink-on-tint" aria-hidden="true" />
          <span>{t("members.access.viewOnly", { section: t(`members.sections.${section}`) })}</span>
        </p>
      )}
      {children}
    </>
  );
}
