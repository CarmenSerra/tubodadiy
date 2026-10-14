"use client";

import * as React from "react";
import { AlertCircleIcon, CheckIcon, EyeIcon, Loader2Icon, PencilIcon, SparklesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY, SECTION_TITLE, Skeleton } from "@/components/dashboard/ui";
import { BlankDesignPanel } from "@/components/invitation/blank-design-panel";
import { CustomComposition } from "@/components/invitation/custom-card";
import { placeInDesign, setSpan } from "@/components/invitation/custom-slots";
import { DesignAccordion } from "@/components/invitation/design-accordion";
import { InvitationDataStep } from "@/components/invitation/invitation-data-step";
import { InvitationModeChooser, InvitationModeSwitch } from "@/components/invitation/invitation-mode-switch";
import { InvitationShareStep } from "@/components/invitation/invitation-share-step";
import {
  CUSTOM_SLOTS,
  SLUG_MAX,
  SLUG_MIN,
  cleanContent,
  cleanStyle,
  cleanUrl,
  defaultContent,
  defaultCustomDesign,
  defaultMessage,
  generateSlug,
  invitationPath,
  isDefaultMessage,
  isValidSlug,
  proposeSlug,
  publicGift,
  sameGift,
  styleOf,
  typedSlug,
  whatsappLink,
  type CustomDesign,
  type CustomSlotId,
  type CustomSlotItem,
  type InvitationContent,
  type InvitationDoc,
  type InvitationMode,
  type InvitationPlace,
  type InvitationPublicData,
  type InvitationStyle,
} from "@/components/invitation/invitation-model";
import { InvitationComposition } from "@/components/invitation/invitation-composition";
import {
  applyPlanFill,
  derivePlanFill,
  getField,
  type FillKey,
  type PlanFill,
} from "@/components/invitation/plan-autofill";
import { useAutosave, type SaveStatus } from "@/components/invitation/use-autosave";
import { useSlugAvailability } from "@/components/invitation/use-slug-availability";
import type { GiftItem } from "@/components/plan-tools/gift-model";
import { usePlanContext } from "@/lib/context/plan-context";
import type { Lang } from "@/lib/i18n/config";
import { useLanguage } from "@/lib/i18n/provider";
import {
  SlugTakenError,
  checkSlugAvailability,
  mapInvitation,
  planInvitationQuery,
  saveInvitation,
  setInvitationPublished,
  syncInvitationGift,
} from "@/lib/firebase/invitation";
import { mapStyle, resolveStyle, saveSharedStyle, styleRef } from "@/lib/firebase/invitation-style";
import { mapSaveTheDate, saveTheDateRef } from "@/lib/firebase/designs";
import { giftItemsQuery, mapGiftItem } from "@/lib/firebase/gift-list";
import { mapTimelineItem, mapVendor, timelineItemsQuery, vendorsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { useDoc } from "@/lib/hooks/use-doc";
import type { PlanGift } from "@/lib/types";
import { cn } from "@/lib/utils";

type StepId = "data" | "design" | "share";
const STEPS: readonly StepId[] = ["data", "design", "share"];

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** El mensaje de serie (de cualquier idioma) pasa al idioma indicado; uno escrito a mano o vacío no se toca. */
function localizeMessage(message: string, lang: Lang): string {
  return message.trim() && isDefaultMessage(message) ? defaultMessage(lang) : message;
}

/** Pestaña «Invitación» del plan: editor en tres pasos con vista previa en vivo. */
export function InvitationEditorPage() {
  const { t } = useTranslation("invitationPage");
  return (
    // En monitores grandes esta pestaña sale del ancho del resto del plan (max-w-6xl del <main>)
    // para que la vista previa lateral gane tamaño; hasta ~1100px mide lo mismo que las demás.
    <div className="flex flex-col gap-4 lg:relative lg:left-1/2 lg:w-[max(100%,min(calc(100vw-3rem),100rem))] lg:-translate-x-1/2 md:gap-5">
      <div>
        <h2 className={SECTION_TITLE}>{t("page.title")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("page.description")}</p>
      </div>
      <InvitationLoader />
    </div>
  );
}

function InvitationLoader() {
  const { t } = useTranslation("invitationPage");
  const { planId, plan } = usePlanContext();
  const { data, loading, error } = useCollection(planInvitationQuery(planId), mapInvitation);
  const saved = data[0] ?? null;

  // Lo que la pareja ya ha escrito en el resto del plan, para rellenar la invitación.
  // Si alguna lectura falla, simplemente no hay autorrelleno de esa parte.
  const { data: vendors, loading: vendorsLoading } = useCollection(vendorsQuery(planId), mapVendor);
  const { data: timeline, loading: timelineLoading } = useCollection(timelineItemsQuery(planId), mapTimelineItem);
  const { data: saveTheDate, loading: designLoading } = useDoc(saveTheDateRef(planId), mapSaveTheDate);
  // Estilo compartido con «Reserva la fecha» (plantilla, paleta y fondo).
  const { data: sharedStyle, loading: styleLoading } = useDoc(styleRef(planId), mapStyle);
  // La lista de regalos se copia a la invitación: hay que tenerla cargada antes de comparar.
  const {
    data: giftItems,
    loading: giftItemsLoading,
    error: giftItemsError,
  } = useCollection(giftItemsQuery(planId), mapGiftItem);
  const sourcesLoading = vendorsLoading || timelineLoading || designLoading || giftItemsLoading || styleLoading;
  const planFill = React.useMemo(
    () => derivePlanFill({ plan, saveTheDate, vendors, timeline }),
    [plan, saveTheDate, vendors, timeline]
  );

  // Enlace de reserva por si no hay nombres de los que sacarlo: se decide una vez.
  const [freshSlug] = React.useState(generateSlug);

  if (error) {
    return (
      <p role="alert" className="text-sm text-ink">
        {t("loadError")}
      </p>
    );
  }

  if (loading || sourcesLoading || !plan) {
    return (
      <div role="status" aria-label={t("loading")} className="flex flex-col gap-4">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <Editor
      planId={planId}
      planGift={plan.gift}
      // Si no se pudo leer la lista no se toca el regalo ya publicado.
      giftItems={giftItemsError ? null : giftItems}
      saved={saved}
      planFill={planFill}
      planTitle={plan.title}
      fallbackSlug={freshSlug}
      // Migración suave: estilo compartido → el de la invitación → el de «Reserva la fecha».
      style={resolveStyle({
        shared: sharedStyle,
        invitation: saved ? styleOf(saved) : null,
        stationeryTemplate: saveTheDate?.template ?? null,
      })}
      sharedStyleJson={sharedStyle ? JSON.stringify(cleanStyle(sharedStyle)) : null}
    />
  );
}

/** Lo que se sabe de la invitación en Firestore, también justo después de crearla. */
interface Known {
  slug: string;
  published: boolean;
  gift: InvitationDoc["gift"];
}

function Editor({
  planId,
  planGift,
  giftItems,
  saved,
  planFill,
  planTitle,
  fallbackSlug,
  style,
  sharedStyleJson,
}: {
  planId: string;
  planGift: PlanGift | null;
  giftItems: GiftItem[] | null;
  saved: InvitationDoc | null;
  planFill: PlanFill;
  planTitle: string;
  fallbackSlug: string;
  style: InvitationStyle;
  sharedStyleJson: string | null;
}) {
  const { t } = useTranslation("invitationPage");
  const { lang: appLang } = useLanguage();

  // Una invitación nueva arranca con lo que el plan ya sabe. En una guardada no se rellena
  // sola (un campo en blanco puede ser a propósito: «si algo no aplica, déjalo vacío»):
  // se ofrece «Actualizar desde el plan». Lo escrito a mano nunca se pisa.
  const [initial] = React.useState(() => {
    // El estilo es el compartido con «Reserva la fecha»; lo demás, lo guardado o lo que sabe el plan.
    if (saved) {
      const content = cleanContent(saved);
      return applyPlanFill(
        {
          ...content,
          lang: appLang,
          message: localizeMessage(content.message, appLang),
          ...style,
          envelopeColor: style.envelopeColor,
        },
        {}
      );
    }
    return applyPlanFill({ ...defaultContent(null, appLang), ...style, envelopeColor: style.envelopeColor }, planFill);
  });
  const [form, setForm] = React.useState<InvitationContent>(initial.content);
  /** El formulario más reciente, al instante: lo lee el guardado, que no espera a pintar. */
  const formRef = React.useRef(form);
  // Qué valores puso el plan: mientras un campo siga valiendo eso, se puede refrescar.
  const [filled, setFilled] = React.useState<PlanFill>(initial.filled);
  const [step, setStep] = React.useState<StepId>("data");
  const [acting, setActing] = React.useState<"publish" | "unpublish" | null>(null);
  const [copied, setCopied] = React.useState(false);

  const published = Boolean(saved?.published);
  // El idioma de la invitación es el que la pareja usa en la app. El mensaje de serie se ve (y se guarda)
  // en ese idioma; uno escrito a mano no se toca. Se deriva, no se guarda en el formulario.
  const view = React.useMemo<InvitationContent>(
    () => ({ ...form, lang: appLang, message: localizeMessage(form.message, appLang) }),
    [form, appLang]
  );
  const clean = React.useMemo(() => cleanContent(view), [view]);

  // ---- Guardado ----
  const latest = React.useRef({ saved, planGift, giftItems, planTitle, fallbackSlug, appLang, planId });
  React.useEffect(() => {
    latest.current = { saved, planGift, giftItems, planTitle, fallbackSlug, appLang, planId };
  });
  const known = React.useRef<Known | null>(
    saved ? { slug: saved.slug, published: saved.published, gift: saved.gift } : null
  );
  React.useEffect(() => {
    if (saved) known.current = { slug: saved.slug, published: saved.published, gift: saved.gift };
  }, [saved]);
  /** Enlace que la persona ha confirmado (al salir del campo) y que aún no se ha guardado. */
  const committedSlug = React.useRef<string | null>(null);
  /** El estilo compartido ya guardado, para no reescribirlo en cada autoguardado. */
  const styleWritten = React.useRef<string | null>(sharedStyleJson);

  async function saveDocument({ publish }: { publish?: boolean }): Promise<"saved" | "blocked"> {
    // Se lee TODO al empezar (síncrono): lo que cambie durante el guardado va en el siguiente.
    const ctx = latest.current;
    const f = formRef.current;
    const content = cleanContent({ ...f, lang: ctx.appLang, message: localizeMessage(f.message, ctx.appLang) });
    const current = known.current;
    const nextPublished = publish ?? current?.published ?? false;
    let slug =
      committedSlug.current ??
      current?.slug ??
      (proposeSlug(content.names, ctx.planTitle, content.lang) || ctx.fallbackSlug);

    // El enlace solo cambia si es válido y está libre; si no, se queda el que ya había.
    if (!isValidSlug(slug)) {
      if (!current) return "blocked";
      slug = current.slug;
      committedSlug.current = null;
    }
    if (!current || slug !== current.slug) {
      if ((await checkSlugAvailability(slug, ctx.planId)) === "taken") {
        if (!current) return "blocked";
        slug = current.slug;
        committedSlug.current = null;
      }
    }

    // El estilo es del plan: «Reserva la fecha» se ve igual que la invitación. El modo «Desde cero»
    // tiene diseño propio y no lo toca.
    if (content.mode !== "blank") {
      const style = styleOf(content);
      const styleJson = JSON.stringify(cleanStyle(style));
      if (styleJson !== styleWritten.current) {
        await saveSharedStyle(ctx.planId, style);
        styleWritten.current = styleJson;
      }
    }
    await saveInvitation({
      slug,
      planId: ctx.planId,
      content,
      published: nextPublished,
      planGift: ctx.planGift,
      giftItems: ctx.giftItems,
      isNew: !current,
      previous: current ? { slug: current.slug, gift: current.gift } : null,
    });
    known.current = { slug, published: nextPublished, gift: ctx.saved?.gift ?? current?.gift ?? null };
    if (committedSlug.current === slug) committedSlug.current = null;
    return "saved";
  }

  const autosave = useAutosave<{ publish?: boolean }>({
    delay: 800,
    initial: saved ? "saved" : "idle",
    save: saveDocument,
    onError: (error, args) => {
      toast.error(
        error instanceof SlugTakenError
          ? t("toasts.slugTaken")
          : args.publish
            ? t("toasts.publishFailed")
            : t("toasts.saveFailed"),
        // Un único aviso aunque fallen varios guardados seguidos.
        { id: "invitation-save-error" }
      );
    },
  });
  const { markChanged } = autosave;

  /** Todo cambio de la persona pasa por aquí: se anota y se programa el autoguardado. */
  const update = React.useCallback(
    (change: (f: InvitationContent) => InvitationContent) => {
      const next = change(formRef.current);
      formRef.current = next;
      setForm(next);
      markChanged();
    },
    [markChanged]
  );
  const set = <K extends keyof InvitationContent>(key: K, value: InvitationContent[K]) =>
    update((f) => ({ ...f, [key]: value }));
  const setPlace = (key: "ceremony" | "banquet", patch: Partial<InvitationPlace>) =>
    update((f) => ({ ...f, [key]: { ...f[key], ...patch } }));

  // ---- Modo: «Desde plantilla» (lo de siempre) o «Desde cero» (la pareja coloca cada elemento) ----
  const mode: InvitationMode = view.mode === "blank" ? "blank" : "template";
  const blank = mode === "blank";
  /** Una invitación sin guardar empieza por elegir el modo; una guardada ya lo tiene. */
  const [modeChosen, setModeChosen] = React.useState(Boolean(saved));
  const design = React.useMemo<CustomDesign>(() => view.custom ?? defaultCustomDesign(), [view.custom]);
  /** Elemento de la batería seleccionado con un toque, a la espera de tocar un hueco. */
  const [selected, setSelected] = React.useState<CustomSlotItem | null>(null);
  /** Vista previa: tarjetas planas para colocar o composición final. */
  const [finalView, setFinalView] = React.useState(false);

  function changeMode(next: InvitationMode) {
    if (next === mode) return;
    setSelected(null);
    setFinalView(false);
    // Los dos diseños se conservan: solo cambia cuál se usa.
    update((f) => ({ ...f, mode: next, custom: f.custom ?? defaultCustomDesign() }));
  }

  function chooseMode(next: InvitationMode) {
    setModeChosen(true);
    if (next === "blank") {
      // Sin autoguardar todavía: el documento se crea con el primer cambio real.
      const nextForm = { ...formRef.current, mode: "blank" as const, custom: formRef.current.custom ?? defaultCustomDesign() };
      formRef.current = nextForm;
      setForm(nextForm);
    }
  }

  const updateDesign = React.useCallback(
    (change: (d: CustomDesign) => CustomDesign) =>
      update((f) => ({ ...f, custom: change(f.custom ?? defaultCustomDesign()) })),
    [update]
  );

  /** Coloca (o quita, con `item === null`) un elemento en un hueco; con `from`, es un traslado entre huecos (intercambia). */
  const placeItem = React.useCallback(
    (slot: CustomSlotId, item: CustomSlotItem | null, from?: CustomSlotId) => {
      setSelected(null);
      // Quitar/mover/intercambiar deja coherentes también los spans (ampliar zona).
      updateDesign((d) => placeInDesign(d, slot, item, from));
    },
    [updateDesign]
  );

  /** Ampliar zona: cuántas filas (1–3) ocupa el hueco de una fila. */
  const changeSpan = React.useCallback(
    (slot: CustomSlotId, span: number) => updateDesign((d) => setSpan(d, slot, span)),
    [updateDesign]
  );

  /** Bloques que la invitación necesita para tener sentido y que aún no están colocados en la tarjeta. */
  const missingBlocks = React.useMemo(() => {
    if (!blank) return [];
    const placed = new Set(CUSTOM_SLOTS.map((s) => design.slots[s]).flatMap((i) => (i?.kind === "text" ? [i.block] : [])));
    return (["names", "date"] as const).filter((b) => !placed.has(b));
  }, [blank, design.slots]);

  // ---- Enlace: lo propone el nombre de la pareja (o del plan) y se puede editar ----
  const [slugEdit, setSlugEdit] = React.useState<string | null>(null);
  const proposal = React.useMemo(
    () => proposeSlug(clean.names, planTitle, clean.lang) || fallbackSlug,
    [clean.names, clean.lang, planTitle, fallbackSlug]
  );
  const slug = slugEdit ?? saved?.slug ?? proposal;
  const slugValid = isValidSlug(slug);
  const slugCheck = useSlugAvailability({
    slug,
    valid: slugValid,
    planId,
    savedSlug: saved?.slug ?? null,
    base: proposal,
    palette: clean.palette,
    year: clean.date.slice(0, 4),
  });

  // Si el enlace propuesto para una invitación nueva ya está en uso, se adopta la alternativa libre
  // (si no, no se podría crear el documento y el autoguardado no tendría dónde escribir).
  React.useEffect(() => {
    if (saved || known.current || slugEdit !== null || slugCheck.status !== "taken" || !slugCheck.suggestion) return;
    committedSlug.current = slugCheck.suggestion;
    setSlugEdit(slugCheck.suggestion);
  }, [saved, slugEdit, slugCheck.status, slugCheck.suggestion]);

  /** Confirma el enlace escrito (al salir del campo): a partir de ahí se guarda con el resto. */
  function commitSlug(value: string) {
    if (!isValidSlug(value)) return;
    if (value === slug && slugCheck.status === "taken") return;
    if (value === (committedSlug.current ?? saved?.slug ?? proposal)) return;
    committedSlug.current = value;
    markChanged();
  }

  const slugMoves =
    published && Boolean(saved) && slugValid && slug !== saved?.slug && slugCheck.status !== "taken";

  // ---- Regalo: si la pareja lo cambió en el plan (datos o lista), la copia pública se pone al día ----
  const giftList = giftItems ?? [];
  const giftAvailable = publicGift(planGift, giftList, true) !== null;
  const savedGift = saved?.gift ?? null;
  const wantedGift = saved ? publicGift(planGift, giftList, saved.showGift) : null;
  const giftOutOfSync = Boolean(saved) && giftItems !== null && !sameGift(savedGift, wantedGift);
  React.useEffect(() => {
    if (!saved || !giftOutOfSync) return;
    syncInvitationGift(saved.slug, wantedGift).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giftOutOfSync, saved?.slug]);

  // El enlace que funciona es el guardado; el nuevo vale cuando se guarde.
  const liveSlug = saved?.slug ?? slug;
  const url = typeof window === "undefined" ? "" : `${window.location.origin}${invitationPath(liveSlug)}`;
  const slugPrefix = typeof window === "undefined" ? "/i/" : `${window.location.host}${invitationPath("")}`;

  const preview: InvitationPublicData = React.useMemo(() => {
    const { showGift, ...rest } = clean;
    return { ...rest, gift: publicGift(planGift, giftList, showGift) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, planGift, giftItems]);

  // ---- Rellenado desde el plan ----
  const fromPlan = (Object.keys(filled) as FillKey[]).filter((k) => filled[k] && getField(form, k) === filled[k]);
  const canRefresh = Object.keys(planFill).length > 0;

  function refreshFromPlan() {
    const result = applyPlanFill(formRef.current, planFill, filled);
    if (result.changed === 0) {
      toast.info(t("fill.upToDate"));
      return;
    }
    update(() => result.content);
    setFilled(result.filled);
    toast.success(t("fill.updated", { count: result.changed }));
  }

  const badUrls = (["ceremony", "banquet"] as const).filter((k) => form[k].mapUrl.trim() && !cleanUrl(form[k].mapUrl));

  // ---- Publicar, despublicar, copiar ----
  async function handlePublish() {
    if (!clean.names) {
      toast.error(t("toasts.namesRequired"));
      setStep("data");
      return;
    }
    setActing("publish");
    // Va por la misma cola que el autoguardado: espera a lo que esté en vuelo y guarda todo lo pendiente.
    const outcome = await autosave.saveNow({ publish: true });
    setActing(null);
    if (outcome === "saved") toast.success(t("toasts.published"));
    else if (outcome === "blocked") {
      toast.error(slugValid ? t("toasts.slugTaken") : t("toasts.slugInvalid", { min: SLUG_MIN, max: SLUG_MAX }));
    }
  }

  async function handleUnpublish() {
    setActing("unpublish");
    let ok = false;
    await autosave.run(async () => {
      const current = known.current;
      if (!current) return;
      await setInvitationPublished(current.slug, false);
      known.current = { ...current, published: false };
      ok = true;
    });
    setActing(null);
    if (ok) toast.success(t("toasts.unpublished"));
    else toast.error(t("toasts.unpublishFailed"));
  }

  async function handleCopy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = url;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        area.remove();
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success(t("toasts.linkCopied"));
    } else {
      toast.error(t("toasts.copyFailed"));
    }
  }

  // ---- Pasos y vista previa ----
  const stepperRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previewRef = React.useRef<HTMLElement>(null);
  const stepIndex = STEPS.indexOf(step);
  const [previewVisible, setPreviewVisible] = React.useState(true);

  function goTo(next: StepId) {
    setStep(next);
    // Al cambiar de paso, el principio del paso a la vista y el foco en él (lectores de pantalla y teclado).
    window.requestAnimationFrame(() => {
      stepperRef.current?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      panelRef.current?.focus({ preventScroll: true });
    });
  }

  React.useEffect(() => {
    const el = previewRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPreviewVisible(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [modeChosen]);

  function showPreview() {
    previewRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  const stepTitle = (id: StepId) => t(`steps.${id}.title`);
  const prev = stepIndex > 0 ? STEPS[stepIndex - 1] : null;
  const next = stepIndex < STEPS.length - 1 ? STEPS[stepIndex + 1] : null;

  if (!modeChosen) return <InvitationModeChooser onChoose={chooseMode} />;

  return (
    <>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] md:gap-4 lg:gap-6 xl:gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          <InvitationModeSwitch mode={mode} onChange={changeMode} />
          <div ref={stepperRef} className="scroll-mt-4">
            <nav aria-label={t("steps.label")}>
              <ol className="grid grid-cols-3 gap-2">
                {STEPS.map((id, i) => {
                  const active = id === step;
                  const done = i < stepIndex;
                  return (
                    <li key={id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => goTo(id)}
                        aria-current={active ? "step" : undefined}
                        className={cn(
                          "flex min-h-14 w-full flex-col items-center gap-1 rounded-2xl border px-1.5 py-2 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac sm:flex-row sm:gap-3 sm:px-3.5 sm:text-left md:flex-col md:gap-1 md:px-1.5 md:text-center xl:flex-row xl:gap-3 xl:px-3.5 xl:text-left",
                          active
                            ? "border-2 border-lilac bg-lilac-soft/60"
                            : "border-line bg-surface hover:bg-lilac-soft/50"
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                            active || done ? "bg-cta text-on-cta" : "bg-track text-ink-muted"
                          )}
                        >
                          {done ? <CheckIcon className="size-4" /> : i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {stepTitle(id)}
                            {done && <span className="sr-only"> ({t("steps.done")})</span>}
                          </span>
                          <span className="hidden truncate text-xs text-ink-muted sm:block md:hidden xl:block">{t(`steps.${id}.hint`)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          <div ref={panelRef} tabIndex={-1} className="flex min-w-0 flex-col gap-4 outline-none">
            {step === "data" && (
              <InvitationDataStep
                planId={planId}
                form={view}
                onSet={set}
                onPlace={setPlace}
                badUrls={[...badUrls]}
                showFillNote={fromPlan.length > 0 || canRefresh}
                filledFromPlan={fromPlan.length > 0}
                onRefresh={refreshFromPlan}
                gift={{ available: giftAvailable, planGift }}
              />
            )}
            {step === "design" && blank && (
              <BlankDesignPanel design={design} onChange={updateDesign} selected={selected} onSelect={setSelected} />
            )}
            {step === "design" && !blank && (
              <DesignAccordion
                style={styleOf(view)}
                onChange={(next) =>
                  update((f) => ({
                    ...f,
                    template: next.template,
                    palette: next.palette,
                    background: next.background,
                    layout: next.layout,
                    envelopeColor: next.envelopeColor,
                  }))
                }
                idPrefix="inv-style"
              />
            )}
            {step === "share" && (
              <InvitationShareStep
                published={published}
                slug={slug}
                slugPrefix={slugPrefix}
                slugValid={slugValid}
                slugCheck={slugCheck}
                slugMoves={slugMoves}
                onSlugChange={(value) => setSlugEdit(typedSlug(value))}
                onSlugCommit={() => commitSlug(slug)}
                onSlugPick={(value) => {
                  setSlugEdit(value);
                  commitSlug(value);
                }}
                url={url}
                whatsappHref={whatsappLink(clean, url)}
                acting={acting}
                canPublish={slugValid && slugCheck.status !== "taken"}
                copied={copied}
                onPublish={() => void handlePublish()}
                onUnpublish={() => void handleUnpublish()}
                onCopy={() => void handleCopy()}
                missingBlocks={missingBlocks}
                onGoDesign={() => goTo("design")}
              />
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <SaveIndicator status={autosave.status} onRetry={autosave.flush} onFix={() => goTo("share")} />
            <div className="order-first flex items-center gap-2 sm:order-none">
              {prev && (
                <button type="button" onClick={() => goTo(prev)} className={cn(CTA_SECONDARY, "h-11")}>
                  {t("nav.back")}
                </button>
              )}
              {next && (
                <button
                  type="button"
                  onClick={() => goTo(next)}
                  className={cn(CTA_PRIMARY, "min-w-0 flex-1 sm:flex-none")}
                >
                  {t("nav.next", { step: stepTitle(next) })}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---- Vista previa en vivo: invitación + sobre + tarjetita de agradecimiento ---- */}
        <aside
          ref={previewRef}
          aria-label={t("preview.caption")}
          className="flex scroll-mt-4 flex-col gap-2 md:sticky md:top-4"
        >
          <p className="text-center text-xs font-medium uppercase tracking-wider text-ink-muted">
            {t("preview.caption")}
          </p>
          {blank ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setFinalView((v) => !v);
                }}
                className={cn(CTA_SECONDARY, "mx-auto h-11")}
              >
                {finalView ? <PencilIcon aria-hidden="true" className="size-4" /> : <SparklesIcon aria-hidden="true" className="size-4" />}
                {finalView ? t("blank.preview.backToEdit") : t("blank.preview.final")}
              </button>
              <div role="group" aria-label={t("blank.preview.aria")} className="relative mx-auto w-full">
                <CustomComposition
                  content={view}
                  design={design}
                  arrangement={finalView ? "final" : "flat"}
                  // Siempre editable: en «final» la propia tarjeta desvanece los huecos y no responde.
                  editable
                  selected={selected}
                  onPlace={placeItem}
                  onSpan={changeSpan}
                />
              </div>
              <p className="text-center text-[13px] text-ink-muted">
                {finalView ? t("blank.preview.finalNote") : selected ? t("blank.preview.tapSlot") : t("blank.preview.own")}
              </p>
            </>
          ) : (
            <>
              <div
                role="img"
                aria-label={t("preview.aria")}
                className="relative mx-auto aspect-[4/5] w-full md:max-w-[calc((100dvh-7rem)*0.8)] max-h-[calc(100dvh-9rem)] md:max-h-none overflow-hidden rounded-2xl border border-line-strong shadow-pop"
              >
                <InvitationComposition data={preview} envelopeColor={view.envelopeColor} />
              </div>
              <p className="text-center text-[13px] text-ink-muted">{t("preview.shared")}</p>
            </>
          )}
        </aside>
      </div>

      {/* Móvil (una columna): la vista previa queda debajo; este botón lleva hasta ella. */}
      {!previewVisible && (
        <button
          type="button"
          onClick={showPreview}
          className={cn(CTA_PRIMARY, "fixed right-4 bottom-4 z-30 h-12 px-5 shadow-pop md:hidden")}
        >
          <EyeIcon aria-hidden="true" className="size-4" />
          {t("preview.floating")}
        </button>
      )}
    </>
  );
}

function SaveIndicator({
  status,
  onRetry,
  onFix,
}: {
  status: SaveStatus;
  onRetry: () => void;
  onFix: () => void;
}) {
  const { t } = useTranslation("invitationPage");
  const action =
    "min-h-11 rounded-md px-1 font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-lilac";
  return (
    <p role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
      {status === "pending" || status === "saving" ? (
        <>
          <Loader2Icon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          {t("save.saving")}
        </>
      ) : status === "saved" ? (
        <>
          <CheckIcon aria-hidden="true" className="size-4 text-green" />
          {t("save.saved")}
        </>
      ) : status === "error" ? (
        <>
          <AlertCircleIcon aria-hidden="true" className="size-4 text-danger" />
          <span className="text-danger">{t("save.error")}</span>
          <button type="button" onClick={onRetry} className={action}>
            {t("save.retry")}
          </button>
        </>
      ) : status === "blocked" ? (
        <>
          <AlertCircleIcon aria-hidden="true" className="size-4 text-danger" />
          <span className="text-danger">{t("save.blocked")}</span>
          <button type="button" onClick={onFix} className={action}>
            {t("save.goShare")}
          </button>
        </>
      ) : (
        t("save.idle")
      )}
    </p>
  );
}
