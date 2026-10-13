"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, Loader2, XIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { SELECTED_PLAN_KEY } from "@/components/dashboard/helpers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createWeddingPlan } from "@/lib/firebase/plans";
import {
  applyOnboardingExtras,
  stagesFor,
  type ExtraStage,
  type StageState,
} from "@/lib/firebase/onboarding";
import { useAuth } from "@/lib/hooks/use-auth";
import { useLanguage } from "@/lib/i18n/provider";
import type { Lang } from "@/lib/i18n/config";
import {
  SKIPPABLE,
  defaultPlanTitle,
  emptyAnswers,
  isDefaultPlanTitle,
  screensFor,
  type OnboardingAnswers,
  type ScreenId,
} from "@/lib/onboarding-model";
import { cn } from "@/lib/utils";
import {
  ApproxScreen,
  BudgetScreen,
  CeremonyScreen,
  CreatingScreen,
  DateScreen,
  GuestsScreen,
  HaveScreen,
  HoneymoonScreen,
  ModeScreen,
  NameScreen,
  SummaryScreen,
  VendorsScreen,
  VenueScreen,
  type ScreenProps,
  type StageView,
} from "./screens";
import { buildSubmission, validateScreen } from "./submission";
import { FlowDecorations, ProgressDots, WIZ_CTA, WIZ_QUIET } from "./ui";

/* ------------------------------------------------------------------ */
/* Textos                                                             */
/* ------------------------------------------------------------------ */

interface Copy {
  title: string;
  description?: string;
  /** Texto del botón de saltar; por defecto «Lo relleno después». */
  skip?: string;
}

/** Textos de cada pantalla (`onboarding:copy.<pantalla>.*`). `t` es el de `useTranslation("onboarding")`. */
function copyFor(screen: ScreenId, advanced: boolean, t: TFunction): Copy {
  const variant = advanced && (screen === "date" || screen === "ceremony") ? "titleAdvanced" : "title";
  const skip = t(`copy.${screen}.skip`, { defaultValue: "" });
  return {
    title: t(`copy.${screen}.${variant}`),
    description: t(`copy.${screen}.description`),
    skip: skip || undefined,
  };
}

/** Lo que se borra al saltar una pantalla («Aún no lo sabemos», «Lo relleno después»). */
const SKIP_PATCH: Partial<Record<ScreenId, Partial<OnboardingAnswers>>> = {
  have: { have: [] },
  date: { date: "" },
  budget: { budget: "" },
  ceremony: { ceremony: "" },
  approx: { guestsApprox: "" },
  venue: { venueName: "", venueLocation: "", venueScope: "ambos" },
  guests: { guestsPaste: "" },
  vendors: { vendors: {} },
  honeymoon: { honeymoonDestination: "" },
};

/* ------------------------------------------------------------------ */
/* Borrador en sessionStorage (para que recargar no pierda lo escrito)  */
/* ------------------------------------------------------------------ */

const DRAFT_KEY = "tubodadiy:nuevo-plan";

interface FlowState {
  answers: OnboardingAnswers;
  screen: ScreenId;
}

function loadDraft(uid: string | undefined, lang: Lang): FlowState | null {
  if (typeof window === "undefined" || !uid) return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { uid?: string; screen?: ScreenId; answers?: Partial<OnboardingAnswers> };
    if (draft.uid !== uid || !draft.answers) return null;
    const answers: OnboardingAnswers = { ...emptyAnswers(lang), ...draft.answers };
    if (!Array.isArray(answers.have) || typeof answers.vendors !== "object" || answers.vendors === null) return null;
    const screens = screensFor(answers);
    const screen = draft.screen && screens.includes(draft.screen) ? draft.screen : "name";
    return { answers, screen };
  } catch {
    return null;
  }
}

function saveDraft(uid: string, state: FlowState) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ uid, ...state }));
  } catch {
    // Sin almacenamiento: el flujo sigue funcionando, solo no sobrevive a recargar.
  }
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nada que borrar.
  }
}

/** Pantalla con la que se quedan las respuestas tras saltarla (para poder recuperarlas con «Atrás»). */
function restoreSkipped(
  flow: FlowState,
  next: ScreenId,
  stash: Partial<Record<ScreenId, Partial<OnboardingAnswers>>>
): FlowState {
  const saved = stash[next];
  const patch = SKIP_PATCH[next];
  if (!saved || !patch) return flow;
  // Solo si siguen tal y como las dejó «saltar»: si no, lo escrito después gana.
  const untouched = (Object.keys(patch) as (keyof OnboardingAnswers)[]).every(
    (key) => JSON.stringify(flow.answers[key]) === JSON.stringify(patch[key])
  );
  return untouched ? { ...flow, answers: { ...flow.answers, ...saved } } : flow;
}

/** ¿Hay algo escrito que se perdería al salir? */
function hasProgress(answers: OnboardingAnswers, lang: Lang): boolean {
  // El título por defecto (en cualquier idioma) no cuenta como algo escrito.
  const plain = (a: OnboardingAnswers) => JSON.stringify({ ...a, title: isDefaultPlanTitle(a.title) ? "" : a.title });
  return plain(answers) !== plain(emptyAnswers(lang));
}

function rememberSelectedPlan(planId: string) {
  try {
    window.localStorage.setItem(SELECTED_PLAN_KEY, planId);
  } catch {
    // La home mostrará el plan que toque por fecha.
  }
}

/** «a, b y c» / «a, b and c» según el idioma. */
function joinList(items: string[], lang: Lang): string {
  return new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format(items);
}

/* ------------------------------------------------------------------ */
/* Flujo                                                              */
/* ------------------------------------------------------------------ */

type StageRow = { key: "plan" | ExtraStage; label: string; state: StageView };

export function OnboardingFlow() {
  const { t } = useTranslation("onboarding");
  const { lang } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const uid = user?.uid;

  const [flow, setFlow] = React.useState<FlowState>(
    () => loadDraft(uid, lang) ?? { answers: emptyAnswers(lang), screen: "name" }
  );
  const { screen } = flow;
  // Mientras el título sea el de por defecto, sigue al idioma activo.
  const answers = React.useMemo(() => {
    const fallback = defaultPlanTitle(lang);
    return isDefaultPlanTitle(flow.answers.title) && flow.answers.title !== fallback
      ? { ...flow.answers, title: fallback }
      : flow.answers;
  }, [flow.answers, lang]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [creating, setCreating] = React.useState(false);
  const [stages, setStages] = React.useState<StageRow[]>([]);
  const [leaveOpen, setLeaveOpen] = React.useState(false);

  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const firstRender = React.useRef(true);
  const finished = React.useRef(false);
  /** Lo que había en las pantallas saltadas, para devolverlo al volver con «Atrás». */
  const skippedRef = React.useRef<Partial<Record<ScreenId, Partial<OnboardingAnswers>>>>({});

  const screens = screensFor(answers);
  const index = Math.max(0, screens.indexOf(screen));
  const advanced = answers.mode === "advanced";
  const copy: Copy = creating
    ? { title: t("creating.title"), description: t("creating.description") }
    : copyFor(screen, advanced, t);

  // El borrador se guarda en cada cambio, salvo cuando ya se está creando.
  React.useEffect(() => {
    if (!uid || creating || finished.current) return;
    saveDraft(uid, flow);
  }, [uid, flow, creating]);

  // Al cambiar de pantalla el foco pasa al título y se vuelve arriba.
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [screen, creating]);

  function set(patch: Partial<OnboardingAnswers>) {
    setFlow((f) => ({ ...f, answers: { ...f.answers, ...patch } }));
    setErrors((e) => (Object.keys(e).length ? {} : e));
  }

  // Cada pantalla es una entrada del historial: el botón «atrás» del navegador o
  // del móvil vuelve a la pantalla anterior en vez de sacar de todo el flujo.
  React.useEffect(() => {
    try {
      window.history.replaceState({ ...window.history.state, onbStep: index }, "");
    } catch {
      /* sin History API: «Atrás» sigue funcionando con el botón */
    }
    // Solo al montar: después cada cambio de pantalla lo gestiona goTo / popstate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const step = (event.state as { onbStep?: unknown } | null)?.onbStep;
      if (typeof step !== "number" || creating || finished.current) return;
      setErrors({});
      setFlow((f) => {
        const seq = screensFor(f.answers);
        const target = seq[Math.min(Math.max(step, 0), seq.length - 1)];
        return target === f.screen ? f : restoreSkipped({ ...f, screen: target }, target, skippedRef.current);
      });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [creating]);

  function goTo(next: ScreenId | undefined, push = false) {
    if (!next) return;
    setErrors({});
    setFlow((f) => restoreSkipped({ ...f, screen: next }, next, skippedRef.current));
    if (push) {
      try {
        window.history.pushState({ onbStep: screens.indexOf(next) }, "");
      } catch {
        /* sin History API */
      }
    }
  }

  function goNext() {
    const found = validateScreen(screen, answers, t, lang);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const firstId = Object.keys(found)[0];
      requestAnimationFrame(() => document.getElementById(firstId)?.focus());
      return;
    }
    goTo(screens[index + 1], true);
  }

  function goBack() {
    // Con entrada de historial propia, «Atrás» la consume (así «adelante» del navegador también funciona).
    if ((window.history.state as { onbStep?: unknown } | null)?.onbStep === index && index > 0) {
      window.history.back();
      return;
    }
    goTo(screens[index - 1]);
  }

  function skip() {
    const patch = SKIP_PATCH[screen];
    if (!patch) return;
    const next = { ...answers, ...patch };
    const seq = screensFor(next);
    const target = seq[seq.indexOf(screen) + 1] ?? "summary";
    // Lo que había se guarda por si se vuelve atrás: saltar no debe borrar sin remedio.
    skippedRef.current[screen] = Object.fromEntries(
      (Object.keys(patch) as (keyof OnboardingAnswers)[]).map((key) => [key, answers[key]])
    ) as Partial<OnboardingAnswers>;
    setErrors({});
    setFlow({ answers: next, screen: target });
    try {
      window.history.pushState({ onbStep: seq.indexOf(target) }, "");
    } catch {
      /* sin History API */
    }
  }

  async function create() {
    if (!user || creating) return;
    const { plan, extras } = buildSubmission(answers, t, lang);

    const labels: Record<ExtraStage, string> = {
      venue: t("creating.stages.venue"),
      guests: t("creating.stages.guests", { count: extras.guests?.length ?? 0 }),
      vendors: t("creating.stages.vendors"),
      steps: t("creating.stages.steps"),
    };
    const setStage = (key: StageRow["key"], state: StageView) =>
      setStages((rows) => rows.map((r) => (r.key === key ? { ...r, state } : r)));

    setStages([
      { key: "plan", label: t("creating.stages.plan"), state: "active" },
      ...stagesFor(extras).map((key): StageRow => ({ key, label: labels[key], state: "pending" })),
    ]);
    setCreating(true);

    let planId: string;
    try {
      planId = await createWeddingPlan(user.uid, plan);
    } catch {
      setCreating(false);
      toast.error(t("create.error"));
      return;
    }
    setStage("plan", "done");

    const result = await applyOnboardingExtras(
      planId,
      extras,
      (stage: ExtraStage, state: StageState) => setStage(stage, state),
      lang
    );

    finished.current = true;
    clearDraft();
    rememberSelectedPlan(planId);
    toast.success(t("create.success"));
    if (result.failed.length > 0) {
      toast.warning(
        t("create.partial", {
          items: joinList(
            result.failed.map((f) => t(`create.failedStage.${f.stage}`)),
            lang
          ),
        }),
        { duration: 10000 }
      );
    }
    router.push("/dashboard");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (screen === "summary") void create();
    else goNext();
  }

  const screenProps: ScreenProps = { answers, set, errors, advanced };
  const submission = React.useMemo(() => buildSubmission(answers, t, lang), [answers, t, lang]);

  let body: React.ReactNode;
  if (creating) {
    body = <CreatingScreen stages={stages} />;
  } else {
    switch (screen) {
      case "name":
        body = <NameScreen {...screenProps} />;
        break;
      case "mode":
        body = <ModeScreen {...screenProps} />;
        break;
      case "have":
        body = <HaveScreen {...screenProps} />;
        break;
      case "date":
        body = <DateScreen {...screenProps} />;
        break;
      case "budget":
        body = <BudgetScreen {...screenProps} />;
        break;
      case "ceremony":
        body = <CeremonyScreen {...screenProps} />;
        break;
      case "approx":
        body = <ApproxScreen {...screenProps} />;
        break;
      case "venue":
        body = <VenueScreen {...screenProps} />;
        break;
      case "guests":
        body = <GuestsScreen {...screenProps} />;
        break;
      case "vendors":
        body = <VendorsScreen {...screenProps} />;
        break;
      case "honeymoon":
        body = <HoneymoonScreen {...screenProps} />;
        break;
      case "summary":
        body = <SummaryScreen title={submission.plan.title} lines={submission.summary} />;
        break;
    }
  }

  const canContinue = screen === "mode" ? answers.mode !== null : true;
  const skippable = SKIPPABLE.has(screen);

  return (
    <>
      <FlowDecorations />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col pb-10 pt-1 sm:pt-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className={cn(creating && "invisible")} aria-hidden={creating || undefined}>
            <Link
              href="/dashboard"
              onClick={(event) => {
                // Con respuestas ya escritas, antes de tirarlas se pregunta.
                if (hasProgress(answers, lang)) {
                  event.preventDefault();
                  setLeaveOpen(true);
                } else {
                  clearDraft();
                }
              }}
              aria-label={t("nav.exitAria")}
              tabIndex={creating ? -1 : undefined}
              className={cn(WIZ_QUIET, "-ml-3")}
            >
              <XIcon className="size-4" aria-hidden="true" />
              {t("nav.exit")}
            </Link>
          </div>
          <ProgressDots current={creating ? screens.length - 1 : index} total={screens.length} />
          <span />
        </div>
        <p id="onb-progress" className="sr-only">
          {t("nav.progress", { current: index + 1, total: screens.length })}
        </p>

        <div
          key={creating ? "creating" : screen}
          className="mt-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none sm:mt-10"
        >
          <header className="mb-7 text-center">
            <h1
              id="onb-heading"
              ref={headingRef}
              tabIndex={-1}
              aria-describedby="onb-progress"
              className="text-balance font-display text-3xl font-semibold text-ink outline-none sm:text-4xl"
            >
              {copy.title}
            </h1>
            {copy.description && (
              <p className="mx-auto mt-2.5 max-w-md text-balance text-base text-ink-muted">{copy.description}</p>
            )}
          </header>

          <form onSubmit={handleSubmit} noValidate>
            {body}

            {!creating && (
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-2 sm:justify-start">
                  {index > 0 ? (
                    <button type="button" onClick={goBack} className={cn(WIZ_QUIET, "-ml-3 sm:ml-0")}>
                      <ArrowLeftIcon className="size-4" aria-hidden="true" />
                      {t("nav.back")}
                    </button>
                  ) : (
                    <span />
                  )}
                  {skippable && (
                    <button type="button" onClick={skip} className={cn(WIZ_QUIET, "-mr-3 sm:mr-0")}>
                      {copy.skip ?? t("nav.skipDefault")}
                    </button>
                  )}
                </div>
                <button type="submit" disabled={!canContinue} className={cn(WIZ_CTA, "w-full sm:w-auto")}>
                  {screen === "summary" ? t("nav.create") : t("nav.continue")}
                  {screen !== "summary" && <ArrowRightIcon className="size-4" aria-hidden="true" />}
                </button>
              </div>
            )}
          </form>
          {creating && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-muted" role="status">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {t("creating.dontClose")}
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="max-w-md gap-4 border-line bg-surface p-5 text-ink-strong shadow-none sm:p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-semibold text-ink sm:text-2xl">
              {t("leave.title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-ink-muted">
              {t("leave.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel className="bg-cta text-on-cta">{t("leave.stay")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearDraft();
                router.push("/dashboard");
              }}
              className="bg-btn-soft text-ink-on-lilac"
            >
              {t("nav.exit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
