"use client";

import * as React from "react";
import { FileCheck2Icon, InfoIcon, LandmarkIcon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY, MiniBar } from "@/components/dashboard/ui";
import { CHECKBOX } from "@/components/guests/brand-dialog";
import { ceremonyLabel } from "@/components/plan-tools/ceremony-model";
import {
  SITUATIONS,
  legalGroups,
  legalIntro,
  requiredLegalDocIds,
  situationId,
} from "@/components/plan-tools/legal-docs-model";
import { ToolDialog } from "@/components/plan-tools/tool-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlanContext } from "@/lib/context/plan-context";
import { setLegalDocChecked } from "@/lib/firebase/plan-tools";
import { cn } from "@/lib/utils";

export function LegalDocsDialog({
  open,
  onOpenChange,
  onChooseCeremony,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Abre el selector de ceremonia (y, al guardarlo, vuelve a esta guía). */
  onChooseCeremony: () => void;
}) {
  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Documentos legales"
      description="Guía de papeles y trámites para casaros en España."
      icon={<FileCheck2Icon />}
      footer={
        <button type="button" onClick={() => onOpenChange(false)} className={CTA_SECONDARY}>
          Cerrar
        </button>
      }
    >
      {open && <LegalDocsBody onChooseCeremony={onChooseCeremony} />}
    </ToolDialog>
  );
}

export function Disclaimer() {
  return (
    <p
      role="note"
      className="flex items-start gap-2.5 rounded-xl border border-line bg-lilac-soft px-3.5 py-3 text-sm text-ink"
    >
      <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="font-medium">Orientativo, confirma en tu Registro Civil.</span> Los requisitos
        cambian según el municipio, la notaría o la parroquia, y esta guía no sustituye su información
        oficial.
      </span>
    </p>
  );
}

export function LegalDocsBody({ onChooseCeremony }: { onChooseCeremony: () => void }) {
  const { planId, plan } = usePlanContext();
  const type = plan?.ceremonyType ?? null;
  const done = React.useMemo(() => plan?.legalDocsDone ?? [], [plan?.legalDocsDone]);

  if (!plan) return null;

  if (!type) {
    return (
      <div className="flex flex-col gap-5">
        <Disclaimer />
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-display text-lg font-semibold text-ink">
            Primero, elige el tipo de ceremonia
          </h3>
          <p className="text-sm text-ink-muted">
            Los papeles son distintos si la boda es civil, religiosa o simbólica. Cuando lo elijas, aquí
            verás la lista que os corresponde.
          </p>
          <button type="button" onClick={onChooseCeremony} className={CTA_PRIMARY}>
            <LandmarkIcon aria-hidden="true" className="size-4" />
            Elegir tipo de ceremonia
          </button>
        </div>
      </div>
    );
  }

  const groups = legalGroups(type, done);
  const required = requiredLegalDocIds(type, done);
  const doneRequired = required.filter((id) => done.includes(id)).length;
  const percent = required.length ? Math.round((doneRequired / required.length) * 100) : 0;

  async function toggle(id: string, checked: boolean) {
    try {
      await setLegalDocChecked(planId, id, checked);
    } catch {
      toast.error("No se ha podido guardar el cambio.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Disclaimer />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm text-ink-muted">
            Ceremonia: <span className="font-medium text-ink">{ceremonyLabel(type)}</span>
          </p>
          <button
            type="button"
            onClick={onChooseCeremony}
            className="text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Cambiar tipo de ceremonia
          </button>
        </div>
        <p className="text-sm text-ink-strong">{legalIntro(type)}</p>
        <div className="flex flex-col gap-1.5" role="group" aria-label="Progreso de los papeles">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink">
              {doneRequired} de {required.length} papeles
            </span>
            <span className="tabular-nums text-ink-muted">{percent}%</span>
          </div>
          <MiniBar value={percent} tone="sage" />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2.5 rounded-2xl border border-line p-4">
        <legend className="px-1.5 text-sm font-medium text-ink">¿Se da alguno de estos casos?</legend>
        {SITUATIONS.map((s) => {
          const id = situationId(s.id);
          const checked = done.includes(id);
          return (
            <label key={s.id} className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => void toggle(id, Boolean(v))}
                className={cn(CHECKBOX, "mt-0.5")}
              />
              <span className="flex flex-col gap-0.5 text-sm">
                <span className="text-ink-strong">{s.label}</span>
                <span className="text-ink-muted">{s.hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`legal-group-${group.id}`} className="flex flex-col gap-1">
          <h3 id={`legal-group-${group.id}`} className="font-display text-lg font-semibold text-ink">
            {group.title}
          </h3>
          <ul className="flex flex-col divide-y divide-line">
            {group.docs.map((doc) => {
              const checked = done.includes(doc.id);
              return (
                <li key={doc.id}>
                  <label className="flex cursor-pointer items-start gap-3 py-3">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => void toggle(doc.id, Boolean(v))}
                      className={cn(CHECKBOX, "mt-0.5")}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          checked ? "text-ink-muted line-through" : "text-ink-strong"
                        )}
                      >
                        {doc.title}
                        {doc.optional && (
                          <span className="ml-2 rounded-full bg-lilac-soft px-2 py-0.5 align-middle text-xs font-medium text-ink no-underline">
                            Opcional
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-ink-muted">{doc.hint}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
