"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AgendaProviders } from "@/components/appointments/agenda-providers";
import { CARD } from "@/components/dashboard/ui";
import { EditPlanDialog } from "@/components/plan/edit-plan-dialog";
import { EditPlanLauncherProvider } from "@/components/plan/edit-plan-launcher";
import { PhasePanel } from "@/components/plan/phase-panel";
import { PhaseTabs, type PhaseTab } from "@/components/plan/phase-tabs";
import { Bone, StepCardSkeleton } from "@/components/plan/plan-shell";
import { stepElementId, stepTriggerId } from "@/components/plan/step-card";
import { PlanToolsProvider } from "@/components/plan-tools/plan-tools-launcher";
import { TimelineLauncherProvider } from "@/components/timeline/timeline-launcher";
import { usePlanContext } from "@/lib/context/plan-context";
import { computePhases, isStepDone, planProgress, recommendedStep } from "@/lib/phases";
import { useCollection } from "@/lib/hooks/use-collection";
import { stepsQuery, mapStep } from "@/lib/firebase/plans";
import { lockPhase, unlockPhase } from "@/lib/firebase/mutations";
import { toastWithUndo } from "@/lib/undo-toast";
import { daysUntil, formatCurrency, formatDate } from "@/lib/utils";

/** Pestaña de "Siempre a mano" (pasos sin fase). */
const GENERAL_TAB = "a-mano";
const GENERAL_BLURB = "Tu lista libre para todo lo que no encaje en otro sitio.";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Escribe la pestaña elegida en la URL (?fase=…) sin añadir entradas al historial. */
function writeFaseToUrl(id: string, hash = "") {
  const url = new URL(window.location.href);
  url.searchParams.set("fase", id);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${hash}`);
}

/** Lleva la vista y el foco a un paso, esperando a que su pestaña se pinte. */
function revealStep(stepId: string) {
  let tries = 0;
  const tick = () => {
    const row = document.getElementById(stepElementId(stepId));
    if (row) {
      row.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      document.getElementById(stepTriggerId(stepId))?.focus({ preventScroll: true });
    } else if (tries++ < 30) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-display text-base font-semibold leading-snug text-ink">
        {children}
      </dd>
    </div>
  );
}

function PlanOverview() {
  const { planId, plan } = usePlanContext();
  const searchParams = useSearchParams();
  const { data: steps, loading } = useCollection(stepsQuery(planId), mapStep);

  const progress = planProgress(steps);
  const days = plan ? daysUntil(plan.weddingDate) : null;

  const unlockedPhaseIds = plan?.unlockedPhaseIds;
  const { phases, general, current } = computePhases(steps, unlockedPhaseIds, plan?.lockedPhaseIds);
  const next = recommendedStep(steps);

  const tabs: PhaseTab[] = phases.map((p) => ({
    id: p.id,
    name: p.name,
    done: p.done,
    total: p.total,
    complete: p.complete,
    recommended: p.current,
    locked: p.locked,
  }));
  if (general.length > 0) {
    const done = general.filter(isStepDone).length;
    tabs.push({
      id: GENERAL_TAB,
      name: "Siempre a mano",
      done,
      total: general.length,
      complete: false,
      recommended: false,
    });
  }

  // Pestaña activa: la que elijas > la de la URL (?fase=) > la recomendada al
  // cargar. La recomendada se fija una vez: si terminas la fase en la que estás
  // no te movemos de sitio, para que veas el mensaje de "listo".
  const [picked, setPicked] = React.useState<string | null>(null);
  const [initialTab, setInitialTab] = React.useState<string | null>(null);
  if (!loading && initialTab === null && tabs.length > 0) {
    setInitialTab(current?.id ?? tabs[0].id);
  }
  const faseParam = searchParams.get("fase");
  const isTab = (id: string | null): id is string => id !== null && tabs.some((t) => t.id === id);
  const selected = isTab(picked) ? picked : isTab(faseParam) ? faseParam : (initialTab ?? "");

  function selectTab(id: string) {
    setPicked(id);
    writeFaseToUrl(id);
  }

  // Pasos desplegados.
  const [openIds, setOpenIds] = React.useState<string[]>([]);
  function setStepOpen(stepId: string, open: boolean) {
    setOpenIds((prev) => (open ? [...prev.filter((id) => id !== stepId), stepId] : prev.filter((id) => id !== stepId)));
  }

  // Enlace directo #step-{id}: abre su pestaña, despliega el paso y lleva allí
  // la vista y el foco (una sola vez por paso).
  const handledHash = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (loading || steps.length === 0) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#step-")) return;
    let stepId = hash.slice("#step-".length);
    try {
      stepId = decodeURIComponent(stepId);
    } catch {
      /* se usa tal cual */
    }
    if (handledHash.current === stepId) return;
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;
    handledHash.current = stepId;
    const tabId = phases.find((p) => p.steps.some((s) => s.id === stepId))?.id ?? GENERAL_TAB;
    /* eslint-disable react-hooks/set-state-in-effect */
    setPicked(tabId);
    setOpenIds((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
    /* eslint-enable react-hooks/set-state-in-effect */
    writeFaseToUrl(tabId, hash);
    revealStep(stepId);
  }, [loading, steps, phases]);

  // Desbloquear una fase posterior (se guarda en el plan y lo ven todos).
  async function unlock(phaseId: string) {
    try {
      await unlockPhase(planId, phaseId);
      toastWithUndo("Fase desbloqueada", () => lockPhase(planId, phaseId));
    } catch {
      toast.error("No se ha podido desbloquear la fase.");
    }
  }

  // Volver a bloquear una fase (gana al progreso y a un desbloqueo anterior).
  async function lock(phaseId: string) {
    try {
      await lockPhase(planId, phaseId);
      toastWithUndo("Fase bloqueada", () => unlockPhase(planId, phaseId));
    } catch {
      toast.error("No se ha podido bloquear la fase.");
    }
  }

  // Aviso suave (descartable) al mirar una fase posterior a la recomendada que
  // ya está abierta pero no por haberla desbloqueado (eso ya lo has decidido
  // tú); en las bloqueadas lo dice el candado.
  const [dismissedNoteFor, setDismissedNoteFor] = React.useState<string | null>(null);
  const selectedPhase = phases.find((p) => p.id === selected) ?? null;
  const showSoftNote =
    !!current &&
    !!selectedPhase &&
    selectedPhase.index > current.index &&
    !selectedPhase.locked &&
    !unlockedPhaseIds?.includes(selectedPhase.id) &&
    dismissedNoteFor !== current.id;

  return (
    <div className="flex flex-col gap-5">
      {plan && (
        <section
          aria-label="Resumen del plan"
          className={`${CARD} flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-5`}
        >
          <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <SummaryItem label="Fecha">{plan.weddingDate ? formatDate(plan.weddingDate) : "Sin fecha"}</SummaryItem>
            <SummaryItem label="Quedan">
              {days !== null && days >= 0 ? (days === 1 ? "1 día" : `${days} días`) : "—"}
            </SummaryItem>
            <SummaryItem label="Presupuesto">
              {plan.budgetTotal > 0 ? formatCurrency(plan.budgetTotal) : "Sin definir"}
            </SummaryItem>
            <SummaryItem label="Progreso">{progress}%</SummaryItem>
          </dl>
          <EditPlanDialog plan={plan} />
        </section>
      )}

      {loading ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Cargando secciones">
          <Bone className="h-[4.25rem] w-full rounded-2xl bg-lilac-soft" />
          {[0, 1, 2].map((i) => (
            <StepCardSkeleton key={i} />
          ))}
        </div>
      ) : tabs.length === 0 ? (
        <p className={`${CARD} p-5 text-sm text-ink-muted sm:p-6`}>
          Este plan todavía no tiene secciones.
        </p>
      ) : (
        <PhaseTabs tabs={tabs} value={selected} onValueChange={selectTab}>
          {selectedPhase ? (
            <PhasePanel
              key={selectedPhase.id}
              planId={planId}
              tabId={selectedPhase.id}
              name={selectedPhase.name}
              blurb={selectedPhase.blurb}
              steps={selectedPhase.steps}
              complete={selectedPhase.complete}
              nextPhaseName={current && current.id !== selectedPhase.id ? current.name : null}
              onGoToNext={() => current && selectTab(current.id)}
              softNote={showSoftNote && current ? current.name : null}
              onDismissNote={() => current && setDismissedNoteFor(current.id)}
              locked={selectedPhase.locked}
              lockable={selectedPhase.lockable}
              onUnlock={() => unlock(selectedPhase.id)}
              onLock={() => lock(selectedPhase.id)}
              recommendedId={next?.id ?? null}
              openIds={openIds}
              onOpenChange={setStepOpen}
            />
          ) : selected === GENERAL_TAB ? (
            <PhasePanel
              key={GENERAL_TAB}
              planId={planId}
              tabId={GENERAL_TAB}
              name="Siempre a mano"
              blurb={GENERAL_BLURB}
              steps={general}
              complete={false}
              nextPhaseName={null}
              onGoToNext={() => {}}
              softNote={null}
              onDismissNote={() => {}}
              recommendedId={next?.id ?? null}
              openIds={openIds}
              onOpenChange={setStepOpen}
            />
          ) : null}
        </PhaseTabs>
      )}
    </div>
  );
}

export default function PlanOverviewPage() {
  // useSearchParams (?fase=, ?cronograma=) pide un límite de Suspense.
  return (
    <React.Suspense fallback={null}>
      <EditPlanLauncherProvider>
        <TimelineLauncherProvider>
          <PlanToolsProvider>
            <AgendaProviders>
              <PlanOverview />
            </AgendaProviders>
          </PlanToolsProvider>
        </TimelineLauncherProvider>
      </EditPlanLauncherProvider>
    </React.Suspense>
  );
}
