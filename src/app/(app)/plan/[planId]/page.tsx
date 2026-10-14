"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AgendaProviders } from "@/components/appointments/agenda-providers";
import { CARD } from "@/components/dashboard/ui";
import { EditPlanDialog } from "@/components/plan/edit-plan-dialog";
import { EditPlanLauncherProvider } from "@/components/plan/edit-plan-launcher";
import {
  CELEBRATION_END_MS,
  CELEBRATION_LEAVE_MS,
  CELEBRATION_SWITCH_MS,
  PhaseCelebration,
} from "@/components/plan/phase-celebration";
import { PhasePanel } from "@/components/plan/phase-panel";
import { PhaseTabs, type PhaseTab } from "@/components/plan/phase-tabs";
import { Bone, StepCardSkeleton } from "@/components/plan/plan-shell";
import { PlanProgressBar } from "@/components/plan/plan-progress";
import { stepElementId, stepTriggerId } from "@/components/plan/step-card";
import { GIFT_TOOL_VALUE, PLAN_TOOL_PARAM } from "@/components/plan/task-links";
import { PlanToolsProvider, usePlanToolsLauncher } from "@/components/plan-tools/plan-tools-launcher";
import { TimelineLauncherProvider } from "@/components/timeline/timeline-launcher";
import { usePlanContext } from "@/lib/context/plan-context";
import { useLanguage } from "@/lib/i18n/provider";
import {
  computePhases,
  displayPhaseBlurb,
  displayPhaseName,
  isStepDone,
  planProgress,
  recommendedStep,
} from "@/lib/phases";
import { useCollection } from "@/lib/hooks/use-collection";
import { stepsQuery, mapStep } from "@/lib/firebase/plans";
import { lockPhase, unlockPhase } from "@/lib/firebase/mutations";
import { useReconcileStepProgress } from "@/lib/firebase/reconcile";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn, daysUntil, formatCurrency, formatDate } from "@/lib/utils";

/** Pestaña de "Siempre a mano" (pasos sin fase). */
const GENERAL_TAB = "a-mano";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

/** Fase que se acaba de completar en vivo y la que se abre a continuación. */
interface Celebration {
  fromId: string;
  fromName: string;
  /** Fase siguiente (la nueva «actual»); null si era la última que quedaba. */
  toId: string | null;
  toName: string | null;
  /** Se estaba mirando la fase completada: solo entonces se pasa a la siguiente. */
  viewing: boolean;
  /** Con animación (candado + deslizar) o, con movimiento reducido, solo un aviso. */
  animated: boolean;
}

const sameIds = (a: string[] | null, b: string[]) =>
  a !== null && a.length === b.length && a.every((id, i) => id === b[i]);

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

function SummaryItem({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-display text-base font-semibold leading-snug text-ink">
        {children}
      </dd>
    </div>
  );
}

/**
 * Enlace directo `?herramienta=regalo` (lo usa «Configurar en Regalo» de la pestaña
 * Invitación): abre los datos del regalo sobre el Resumen. El parámetro se limpia de
 * la URL al abrirse, para que cerrar y recargar no lo vuelva a abrir.
 */
function ToolFromLink() {
  const launcher = usePlanToolsLauncher();
  const searchParams = useSearchParams();
  const param = searchParams.get(PLAN_TOOL_PARAM);

  React.useEffect(() => {
    if (!param) return;
    if (param === GIFT_TOOL_VALUE) launcher?.open("gift");
    const url = new URL(window.location.href);
    url.searchParams.delete(PLAN_TOOL_PARAM);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [param, launcher]);

  return null;
}

function PlanOverview() {
  const { t } = useTranslation("plan");
  const { lang } = useLanguage();
  const { planId, plan } = usePlanContext();
  const searchParams = useSearchParams();
  const { data: steps, loading } = useCollection(stepsQuery(planId), mapStep);
  // Al abrir el plan se ponen al día tareas y estados que se hubieran quedado atrás.
  const settled = useReconcileStepProgress(planId, plan, steps, loading);

  const progress = planProgress(steps);
  const days = plan ? daysUntil(plan.weddingDate) : null;

  const unlockedPhaseIds = plan?.unlockedPhaseIds;
  const { phases, general, current } = computePhases(steps, unlockedPhaseIds, plan?.lockedPhaseIds);
  const next = recommendedStep(steps);

  const tabs: PhaseTab[] = phases.map((p) => ({
    id: p.id,
    name: displayPhaseName(p, t),
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
      name: t("general.name"),
      done,
      total: general.length,
      complete: false,
      recommended: false,
    });
  }

  // Pestaña activa: la que elijas > la de la URL (?fase=) > la recomendada al
  // cargar. La recomendada se fija una vez. Si completas en vivo la fase que
  // estás mirando, la celebración (más abajo) te lleva a la siguiente.
  const [picked, setPicked] = React.useState<string | null>(null);
  const [initialTab, setInitialTab] = React.useState<string | null>(null);
  if (!loading && initialTab === null && tabs.length > 0) {
    setInitialTab(current?.id ?? tabs[0].id);
  }
  const faseParam = searchParams.get("fase");
  const isTab = (id: string | null): id is string => id !== null && tabs.some((tab) => tab.id === id);
  const selected = isTab(picked) ? picked : isTab(faseParam) ? faseParam : (initialTab ?? "");

  function selectTab(id: string) {
    setPicked(id);
    writeFaseToUrl(id);
  }

  // Fase completada EN VIVO (marcando la última tarea, desde una herramienta o
  // por otra persona del plan): celebración y paso a la siguiente. Lo que ya
  // estaba completo al cargar, o se repara al abrir el plan (`settled`), solo
  // fija la línea base y no celebra.
  const completedIds = phases.filter((p) => p.complete).map((p) => p.id);
  const [baseline, setBaseline] = React.useState<string[] | null>(null);
  const [celebration, setCelebration] = React.useState<Celebration | null>(null);
  // La fase completada ya está saliendo (desvanecida) justo antes del cambio de pestaña.
  const [leaving, setLeaving] = React.useState(false);
  if (!loading && phases.length > 0) {
    if (baseline === null || !settled) {
      if (!sameIds(baseline, completedIds)) setBaseline(completedIds);
    } else if (!sameIds(baseline, completedIds)) {
      setBaseline(completedIds);
      const fresh = phases.filter((p) => p.complete && !baseline.includes(p.id));
      const finished = fresh[fresh.length - 1];
      if (finished) {
        setCelebration({
          fromId: finished.id,
          fromName: displayPhaseName(finished, t),
          toId: current?.id ?? null,
          toName: current ? displayPhaseName(current, t) : null,
          viewing: selected === finished.id,
          animated: !prefersReducedMotion(),
        });
      }
    }
  }

  const selectedRef = React.useRef(selected);
  React.useEffect(() => {
    selectedRef.current = selected;
  });
  React.useEffect(() => {
    if (!celebration) return;
    const { fromId, fromName, toId, toName, viewing, animated } = celebration;
    const goNext = () => {
      // Solo si sigues en la fase completada: no te movemos si ya fuiste a otra.
      if (toId && viewing && selectedRef.current === fromId) {
        setPicked(toId);
        writeFaseToUrl(toId);
      }
    };
    if (!animated || !viewing) {
      // Movimiento reducido (o estabas en otra pestaña): cambio instantáneo y aviso.
      const timer = setTimeout(() => {
        goNext();
        toast.success(
          toName
            ? t("celebration.toastWithNext", { from: fromName, to: toName })
            : t("celebration.toast", { name: fromName })
        );
        setCelebration(null);
      }, 0);
      return () => clearTimeout(timer);
    }
    // Lleva las pestañas a la vista para ver cómo se abre la siguiente fase.
    const list = document.querySelector('[role="tablist"][data-phase-tabs]');
    if (list) {
      const top = Math.max(0, list.getBoundingClientRect().top + window.scrollY - 24);
      window.scrollTo({ top, behavior: "smooth" });
    }
    // Guion (ver phase-celebration.tsx): la tarjeta se lee ~3 s; luego el panel de la fase
    // hecha se desvanece, la pestaña activa se desliza a la siguiente y entra su panel.
    const toLeave = setTimeout(() => setLeaving(true), CELEBRATION_LEAVE_MS);
    const toSwitch = setTimeout(goNext, CELEBRATION_SWITCH_MS);
    const toEnd = setTimeout(() => {
      setLeaving(false);
      setCelebration(null);
    }, CELEBRATION_END_MS);
    return () => {
      clearTimeout(toLeave);
      clearTimeout(toSwitch);
      clearTimeout(toEnd);
      setLeaving(false);
    };
  }, [celebration, t]);

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
      toastWithUndo(t("overview.unlocked"), () => lockPhase(planId, phaseId));
    } catch {
      toast.error(t("overview.errors.unlock"));
    }
  }

  // Volver a bloquear una fase (gana al progreso y a un desbloqueo anterior).
  async function lock(phaseId: string) {
    try {
      await lockPhase(planId, phaseId);
      toastWithUndo(t("overview.locked"), () => unlockPhase(planId, phaseId));
    } catch {
      toast.error(t("overview.errors.lock"));
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

  const celebrating = celebration !== null && celebration.animated && celebration.viewing;

  return (
    <div className="flex flex-col gap-5">
      {celebrating && (
        <PhaseCelebration
          title={t("celebration.title", { name: celebration.fromName })}
          detail={
            celebration.toName
              ? t("celebration.opening", { name: celebration.toName })
              : t("celebration.finale")
          }
          finale={!celebration.toName}
        />
      )}
      {plan && (
        <section
          aria-label={t("overview.summaryAria")}
          className={`${CARD} flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-5`}
        >
          <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <SummaryItem label={t("overview.date")}>{formatDate(plan.weddingDate, lang)}</SummaryItem>
            <SummaryItem label={t("overview.daysLeft")}>
              {days !== null && days >= 0 ? t("overview.days", { count: days }) : "—"}
            </SummaryItem>
            <SummaryItem label={t("overview.budget")}>
              {plan.budgetTotal > 0 ? formatCurrency(plan.budgetTotal, lang) : t("overview.budgetUndefined")}
            </SummaryItem>
            {/* En móvil ocupa todo el ancho: así la barra tiene sitio para llenarse. */}
            <SummaryItem label={t("overview.progress")} className="col-span-2 sm:col-span-1">
              <PlanProgressBar value={progress} />
            </SummaryItem>
          </dl>
          <EditPlanDialog plan={plan} />
        </section>
      )}

      {loading ? (
        <div className="flex flex-col gap-3" role="status" aria-label={t("overview.loading")}>
          <Bone className="h-[4.25rem] w-full rounded-2xl bg-lilac-soft" />
          {[0, 1, 2].map((i) => (
            <StepCardSkeleton key={i} />
          ))}
        </div>
      ) : tabs.length === 0 ? (
        <p className={`${CARD} p-5 text-sm text-ink-muted sm:p-6`}>
          {t("overview.empty")}
        </p>
      ) : (
        <PhaseTabs
          tabs={tabs}
          value={selected}
          onValueChange={selectTab}
          unlockingId={celebrating ? celebration.toId : null}
        >
          {selectedPhase ? (
            <PhasePanel
              key={selectedPhase.id}
              planId={planId}
              tabId={selectedPhase.id}
              name={displayPhaseName(selectedPhase, t)}
              blurb={displayPhaseBlurb(selectedPhase, t)}
              steps={selectedPhase.steps}
              complete={selectedPhase.complete}
              nextPhaseName={
                current && current.id !== selectedPhase.id ? displayPhaseName(current, t) : null
              }
              onGoToNext={() => current && selectTab(current.id)}
              softNote={showSoftNote && current ? displayPhaseName(current, t) : null}
              onDismissNote={() => current && setDismissedNoteFor(current.id)}
              locked={selectedPhase.locked}
              lockable={selectedPhase.lockable}
              onUnlock={() => unlock(selectedPhase.id)}
              onLock={() => lock(selectedPhase.id)}
              recommendedId={next?.id ?? null}
              openIds={openIds}
              onOpenChange={setStepOpen}
              animateIn={celebrating && celebration.toId === selectedPhase.id}
              animateOut={celebrating && leaving && celebration.fromId === selectedPhase.id}
            />
          ) : selected === GENERAL_TAB ? (
            <PhasePanel
              key={GENERAL_TAB}
              planId={planId}
              tabId={GENERAL_TAB}
              name={t("general.name")}
              blurb={t("general.blurb")}
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
              <ToolFromLink />
              <PlanOverview />
            </AgendaProviders>
          </PlanToolsProvider>
        </TimelineLauncherProvider>
      </EditPlanLauncherProvider>
    </React.Suspense>
  );
}
