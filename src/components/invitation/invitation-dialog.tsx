"use client";

import * as React from "react";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MessageCircleIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY, Skeleton } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import {
  LIMITS,
  TEMPLATES,
  cleanContent,
  cleanUrl,
  defaultContent,
  generateSlug,
  invitationPath,
  publicGift,
  sameGift,
  whatsappLink,
  type InvitationContent,
  type InvitationDoc,
  type InvitationPlace,
  type InvitationPublicData,
} from "@/components/invitation/invitation-model";
import {
  FILL_GROUP_LABEL,
  applyPlanFill,
  derivePlanFill,
  getField,
  type FillKey,
  type PlanFill,
} from "@/components/invitation/plan-autofill";
import { InvitationView } from "@/components/invitation/invitation-view";
import type { GiftItem } from "@/components/plan-tools/gift-model";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { ignoreToastInteraction } from "@/components/timeline/use-timeline-undo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { Textarea } from "@/components/ui/textarea";
import { usePlanContext } from "@/lib/context/plan-context";
import {
  mapInvitation,
  planInvitationQuery,
  saveInvitation,
  setInvitationPublished,
  syncInvitationGift,
} from "@/lib/firebase/invitation";
import { mapSaveTheDate, saveTheDateRef } from "@/lib/firebase/designs";
import { giftItemsQuery, mapGiftItem } from "@/lib/firebase/gift-list";
import { mapTimelineItem, mapVendor, timelineItemsQuery, vendorsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { useDoc } from "@/lib/hooks/use-doc";
import type { PlanGift } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Pantalla completa en móvil; en escritorio, un diálogo grande con el
 * formulario a la izquierda y la vista previa a la derecha.
 */
const MODAL =
  "top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-surface p-0 outline-none " +
  "sm:top-1/2 sm:left-1/2 sm:h-[min(52rem,92vh)] sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-6xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-line";

const SWITCH =
  "h-6 w-11 shrink-0 data-[state=checked]:bg-cta data-[state=unchecked]:bg-line-strong focus-visible:ring-lilac [&>span]:size-5 [&>span]:data-[state=checked]:translate-x-[1.375rem] [&>span]:data-[state=unchecked]:translate-x-0.5";

const AREA = cn(FIELD, "h-auto min-h-24 py-2.5");

export function InvitationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const restoreFocus = useRestoreFocus();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const dirtyRef = React.useRef(false);

  function handleOpenChange(next: boolean) {
    if (!next && dirtyRef.current && !window.confirm("Tienes cambios sin guardar. ¿Cerrar sin guardarlos?")) {
      return;
    }
    dirtyRef.current = false;
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        ref={contentRef}
        className={MODAL}
        onOpenAutoFocus={(event) => {
          restoreFocus.onOpenAutoFocus();
          event.preventDefault();
          contentRef.current?.focus();
        }}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
        onInteractOutside={ignoreToastInteraction}
      >
        <DialogHeader className="shrink-0 gap-1 px-5 pb-3 pt-5 pr-14 text-left sm:px-8 sm:pt-6">
          <DialogTitle className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Invitación de boda
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-muted">
            Personaliza tu invitación y comparte un único enlace: quien lo abra podrá confirmar sin crear cuenta.
          </DialogDescription>
        </DialogHeader>
        {open && <InvitationBody dirtyRef={dirtyRef} onClose={() => handleOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function contentOf(doc: InvitationDoc): InvitationContent {
  return cleanContent(doc);
}

function InvitationBody({
  dirtyRef,
  onClose,
}: {
  dirtyRef: React.RefObject<boolean>;
  onClose: () => void;
}) {
  const { planId, plan } = usePlanContext();
  const { data, loading, error } = useCollection(planInvitationQuery(planId), mapInvitation);
  const saved = data[0] ?? null;

  // Lo que la pareja ya ha escrito en el resto del plan, para rellenar la invitación.
  // Si alguna lectura falla, simplemente no hay autorrelleno de esa parte.
  const { data: vendors, loading: vendorsLoading } = useCollection(vendorsQuery(planId), mapVendor);
  const { data: timeline, loading: timelineLoading } = useCollection(timelineItemsQuery(planId), mapTimelineItem);
  const { data: saveTheDate, loading: designLoading } = useDoc(saveTheDateRef(planId), mapSaveTheDate);
  // La lista de regalos se copia a la invitación: hay que tenerla cargada antes de comparar.
  const { data: giftItems, loading: giftItemsLoading, error: giftItemsError } = useCollection(
    giftItemsQuery(planId),
    mapGiftItem
  );
  const sourcesLoading = vendorsLoading || timelineLoading || designLoading || giftItemsLoading;
  const planFill = React.useMemo(
    () => derivePlanFill({ plan, saveTheDate, vendors, timeline }),
    [plan, saveTheDate, vendors, timeline]
  );

  // El slug se decide una vez: el de la invitación guardada o uno nuevo.
  const [freshSlug] = React.useState(generateSlug);

  if (error) {
    return (
      <div className="flex-1 px-5 py-6 sm:px-8">
        <p role="alert" className="text-sm text-ink">
          No se ha podido cargar la invitación. Recarga la página e inténtalo de nuevo.
        </p>
      </div>
    );
  }

  if (loading || sourcesLoading || !plan) {
    return (
      <div role="status" aria-label="Cargando la invitación" className="flex flex-col gap-4 px-5 py-4 sm:px-8">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <Editor
      key={saved?.slug ?? "new"}
      planId={planId}
      planGift={plan.gift}
      // Si no se pudo leer la lista no se toca el regalo ya publicado.
      giftItems={giftItemsError ? null : giftItems}
      saved={saved}
      planFill={planFill}
      slug={saved?.slug ?? freshSlug}
      dirtyRef={dirtyRef}
      onClose={onClose}
    />
  );
}

function Editor({
  planId,
  planGift,
  giftItems,
  saved,
  planFill,
  slug,
  dirtyRef,
  onClose,
}: {
  planId: string;
  planGift: PlanGift | null;
  giftItems: GiftItem[] | null;
  saved: InvitationDoc | null;
  planFill: PlanFill;
  slug: string;
  dirtyRef: React.RefObject<boolean>;
  onClose: () => void;
}) {
  // Una invitación nueva arranca con lo que el plan ya sabe. En una guardada no se rellena
  // sola (un campo en blanco puede ser a propósito: «si algo no aplica, déjalo vacío»):
  // se ofrece «Actualizar desde el plan». Lo escrito a mano nunca se pisa.
  const [initial] = React.useState(() =>
    saved ? applyPlanFill(contentOf(saved), {}) : applyPlanFill(defaultContent(null), planFill)
  );
  const [form, setForm] = React.useState<InvitationContent>(initial.content);
  // Qué valores puso el plan: mientras un campo siga valiendo eso, se puede refrescar.
  const [filled, setFilled] = React.useState<PlanFill>(initial.filled);
  const [tab, setTab] = React.useState<"edit" | "preview">("edit");
  const [busy, setBusy] = React.useState<"save" | "publish" | null>(null);
  const [copied, setCopied] = React.useState(false);

  const published = Boolean(saved?.published);
  const clean = React.useMemo(() => cleanContent(form), [form]);
  const dirty = !saved || JSON.stringify(clean) !== JSON.stringify(contentOf(saved));
  React.useEffect(() => {
    dirtyRef.current = Boolean(saved) && dirty;
    return () => {
      dirtyRef.current = false;
    };
  }, [dirty, saved, dirtyRef]);

  const giftList = giftItems ?? [];
  const giftAvailable = publicGift(planGift, giftList, true) !== null;
  const giftIsList = planGift?.mode === "list";

  // Si la pareja cambió el regalo (datos o lista) en el plan, la copia pública se pone al día.
  const savedGift = saved?.gift ?? null;
  const wantedGift = saved ? publicGift(planGift, giftList, saved.showGift) : null;
  const giftOutOfSync = Boolean(saved) && giftItems !== null && !sameGift(savedGift, wantedGift);
  React.useEffect(() => {
    if (!saved || !giftOutOfSync) return;
    syncInvitationGift(saved.slug, wantedGift).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giftOutOfSync, saved?.slug]);

  const url = typeof window === "undefined" ? "" : `${window.location.origin}${invitationPath(slug)}`;

  const preview: InvitationPublicData = React.useMemo(() => {
    const { showGift, ...rest } = clean;
    return { ...rest, gift: publicGift(planGift, giftList, showGift) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, planGift, giftItems]);

  const fromPlan = (Object.keys(filled) as FillKey[]).filter((k) => filled[k] && getField(form, k) === filled[k]);
  const fromPlanLabels = [...new Set(fromPlan.map((k) => FILL_GROUP_LABEL[k]))];
  const canRefresh = Object.keys(planFill).length > 0;

  function refreshFromPlan() {
    const result = applyPlanFill(form, planFill, filled);
    if (result.changed === 0) {
      toast.info("Tu invitación ya está al día con los datos de tu plan.");
      return;
    }
    setForm(result.content);
    setFilled(result.filled);
    toast.success(
      result.changed === 1 ? "Se ha actualizado 1 campo con los datos de tu plan." : `Se han actualizado ${result.changed} campos con los datos de tu plan.`
    );
  }

  const set = <K extends keyof InvitationContent>(key: K, value: InvitationContent[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setPlace = (key: "ceremony" | "banquet", patch: Partial<InvitationPlace>) =>
    setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }));

  const badUrls = (["ceremony", "banquet"] as const).filter(
    (k) => form[k].mapUrl.trim() && !cleanUrl(form[k].mapUrl)
  );

  async function persist(nextPublished: boolean, kind: "save" | "publish") {
    if (badUrls.length > 0) {
      toast.error("Revisa el enlace del mapa: tiene que ser una dirección web válida.");
      return false;
    }
    if (nextPublished && !clean.names) {
      toast.error("Escribe los nombres de la pareja antes de publicar.");
      return false;
    }
    setBusy(kind);
    try {
      await saveInvitation({
        slug,
        planId,
        content: clean,
        published: nextPublished,
        planGift,
        giftItems,
        isNew: !saved,
      });
      return true;
    } catch {
      toast.error("No se ha podido guardar la invitación. Inténtalo de nuevo.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function handleSave() {
    if (await persist(published, "save")) toast.success("Invitación guardada");
  }

  async function handlePublishChange(next: boolean) {
    if (next) {
      if (await persist(true, "publish")) toast.success("Invitación publicada. Ya puedes compartir el enlace.");
      return;
    }
    if (!saved) return;
    setBusy("publish");
    try {
      await setInvitationPublished(saved.slug, false);
      toast.success("Invitación despublicada. El enlace ya no funciona.");
    } catch {
      toast.error("No se ha podido despublicar. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
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
      toast.success("Enlace copiado");
    } else {
      toast.error("No se ha podido copiar. Selecciona el enlace y cópialo a mano.");
    }
  }

  return (
    <>
      {/* Móvil: alterna entre editar y ver cómo queda */}
      <div className="shrink-0 px-5 pb-3 lg:hidden" role="tablist" aria-label="Vista">
        <div className="grid grid-cols-2 gap-1 rounded-full border border-line-strong bg-raised p-1">
          {(
            [
              ["edit", "Editar"],
              ["preview", "Vista previa"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`ed-tab-${id}`}
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "h-9 rounded-full text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac",
                tab === id ? "bg-btn-soft text-ink-on-lilac" : "text-ink-muted hover:bg-lilac-soft"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] border-t border-line lg:grid-cols-[minmax(0,1fr)_25rem]">
        {/* ---- Formulario ---- */}
        <div
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain px-5 pb-8 pt-5 sm:px-8",
            tab === "preview" && "hidden lg:block"
          )}
          role="tabpanel"
          aria-labelledby="ed-tab-edit"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-8">
            {(fromPlan.length > 0 || canRefresh) && (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-line bg-raised px-4 py-3">
                <p className="flex min-w-0 items-start gap-2 text-sm text-ink-muted">
                  <SparklesIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lilac" />
                  <span className="min-w-0">
                    {fromPlan.length > 0 ? (
                      <>
                        <span className="font-medium text-ink">Rellenado con los datos de tu plan</span>
                        {" "}({fromPlanLabels.join(", ")}). Cámbialo si quieres: lo que escribas no se pisa.
                      </>
                    ) : (
                      "Los campos vacíos se pueden rellenar con los datos de tu plan."
                    )}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={refreshFromPlan}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink outline-none transition-colors hover:bg-lilac-soft focus-visible:ring-2 focus-visible:ring-lilac"
                >
                  <RefreshCwIcon aria-hidden="true" className="size-3.5" />
                  Actualizar desde el plan
                </button>
              </div>
            )}
            <Section title="Estilo">
              <div role="radiogroup" aria-label="Plantilla" className="grid grid-cols-3 gap-2.5">
                {TEMPLATES.map((t) => {
                  const active = form.template === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set("template", t.id)}
                      className={cn(
                        "flex flex-col gap-2 rounded-xl border bg-raised p-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                        active ? "border-lilac ring-2 ring-lilac" : "border-line-strong hover:border-lilac"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-14 flex-col items-center justify-center gap-1 rounded-lg border border-black/5"
                        style={{ background: t.swatch.bg }}
                      >
                        <span className="h-1.5 w-10 rounded-full" style={{ background: t.swatch.ink }} />
                        <span className="h-1 w-6 rounded-full" style={{ background: t.swatch.accent }} />
                      </span>
                      <span className="flex items-center gap-1 px-0.5 text-sm font-medium leading-tight text-ink-strong">
                        {active && <CheckIcon aria-hidden="true" className="size-3.5 shrink-0 text-green" />}
                        {t.label}
                      </span>
                      <span className="hidden px-0.5 text-xs leading-snug text-ink-muted sm:block">{t.hint}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="La pareja">
              <Field label="Nombres" htmlFor="ed-names">
                <Input
                  id="ed-names"
                  value={form.names}
                  onChange={(e) => set("names", e.target.value)}
                  maxLength={LIMITS.names}
                  placeholder="Ana & Luis"
                  autoComplete="off"
                  className={FIELD}
                />
              </Field>
              <Field label="Mensaje" htmlFor="ed-message" hint="Unas palabras de bienvenida para tus invitados.">
                <Textarea
                  id="ed-message"
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  maxLength={LIMITS.message}
                  rows={4}
                  className={AREA}
                />
              </Field>
            </Section>

            <Section title="Cuándo">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fecha de la boda" htmlFor="ed-date">
                  <DatePicker id="ed-date" value={form.date} onChange={(v) => set("date", v)} className={FIELD} />
                </Field>
                <Field label="Confirmar antes del" htmlFor="ed-deadline" hint="Opcional. Después, el formulario se cierra.">
                  <DatePicker
                    id="ed-deadline"
                    value={form.rsvpDeadline}
                    onChange={(v) => set("rsvpDeadline", v)}
                    className={FIELD}
                    placeholder="Sin fecha límite"
                  />
                </Field>
              </div>
            </Section>

            <Section title="Dónde" note="Si algo no aplica, déjalo en blanco y no aparecerá.">
              <PlaceFields
                id="ed-ceremony"
                title="Ceremonia"
                place={form.ceremony}
                onChange={(patch) => setPlace("ceremony", patch)}
                badUrl={badUrls.includes("ceremony")}
              />
              <PlaceFields
                id="ed-banquet"
                title="Banquete"
                place={form.banquet}
                onChange={(patch) => setPlace("banquet", patch)}
                badUrl={badUrls.includes("banquet")}
              />
            </Section>

            <Section title="Regalo">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <label htmlFor="ed-gift" className="text-sm font-medium text-ink">
                    Mostrar los datos del regalo
                  </label>
                  <p id="ed-gift-help" className="mt-1 text-sm text-ink-muted">
                    {giftAvailable
                      ? giftIsList
                        ? "Tus invitados verán la lista de cosas que has guardado en el plan (sin lo que ya tenéis)."
                        : "Tus invitados verán el IBAN o Bizum que has guardado en el plan."
                      : planGift?.showOnInvitation
                        ? giftIsList
                          ? "Tu lista de regalos aún no tiene nada que enseñar. Añade alguna cosa en los datos del regalo de tu plan."
                          : "Aún no has añadido un IBAN o un Bizum en los datos del regalo de tu plan."
                        : planGift
                          ? "Tienes un regalo preparado, pero no está marcado para mostrarse en la invitación. Actívalo en los datos del regalo de tu plan."
                          : "Aún no has elegido cómo recibir el regalo (dinero o lista de cosas). Hazlo en el paso «Regalo» de tu plan."}
                  </p>
                </div>
                <Switch
                  id="ed-gift"
                  checked={giftAvailable && form.showGift}
                  onCheckedChange={(v) => set("showGift", v)}
                  disabled={!giftAvailable}
                  aria-describedby="ed-gift-help"
                  className={SWITCH}
                />
              </div>
            </Section>

            <Section title="Publicar y compartir">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <label htmlFor="ed-published" className="text-sm font-medium text-ink">
                    Invitación publicada
                  </label>
                  <p id="ed-published-help" className="mt-1 text-sm text-ink-muted">
                    {published
                      ? "Cualquiera con el enlace puede verla y confirmar. Al despublicarla, el enlace deja de funcionar."
                      : "Ahora mismo es un borrador: nadie puede verla. Al publicar se guardan también tus cambios."}
                  </p>
                </div>
                <Switch
                  id="ed-published"
                  checked={published}
                  onCheckedChange={(v) => void handlePublishChange(v)}
                  disabled={busy !== null}
                  aria-describedby="ed-published-help"
                  className={SWITCH}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="ed-link" className={FIELD_LABEL}>
                  Enlace para tus invitados
                </label>
                <Input
                  id="ed-link"
                  readOnly
                  value={published ? url : "Publica la invitación para obtener el enlace"}
                  onFocus={(e) => e.currentTarget.select()}
                  className={cn(FIELD, !published && "text-ink-muted")}
                />
                {published && dirty && (
                  <p className="text-sm text-ink-muted">
                    Tienes cambios sin guardar: guárdalos para que se vean en el enlace.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!published}
                  className={cn(CTA_SECONDARY, "h-11 disabled:pointer-events-none disabled:opacity-50")}
                >
                  {copied ? <CheckIcon aria-hidden="true" className="size-4" /> : <CopyIcon aria-hidden="true" className="size-4" />}
                  Copiar enlace
                </button>
                {published ? (
                  <a
                    href={whatsappLink(clean, url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(CTA_SECONDARY, "h-11")}
                  >
                    <MessageCircleIcon aria-hidden="true" className="size-4" />
                    Compartir por WhatsApp
                    <span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </a>
                ) : (
                  <button type="button" disabled className={cn(CTA_SECONDARY, "h-11 disabled:opacity-50")}>
                    <MessageCircleIcon aria-hidden="true" className="size-4" />
                    Compartir por WhatsApp
                  </button>
                )}
                {published ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className={cn(CTA_SECONDARY, "h-11")}>
                    <ExternalLinkIcon aria-hidden="true" className="size-4" />
                    Ver invitación
                    <span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </a>
                ) : (
                  <button type="button" disabled className={cn(CTA_SECONDARY, "h-11 disabled:opacity-50")}>
                    <ExternalLinkIcon aria-hidden="true" className="size-4" />
                    Ver invitación
                  </button>
                )}
              </div>
            </Section>
          </div>
        </div>

        {/* ---- Vista previa ---- */}
        <div
          className={cn(
            "min-h-0 bg-page p-4 lg:border-l lg:border-line",
            tab === "edit" && "hidden lg:block"
          )}
          role="tabpanel"
          aria-labelledby="ed-tab-preview"
        >
          <div className="mx-auto flex h-full max-w-[26rem] flex-col gap-2">
            <p className="shrink-0 text-center text-xs font-medium uppercase tracking-wider text-ink-muted">
              Así la verán tus invitados
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-line-strong bg-white shadow-pop">
              <InvitationView data={preview} mode="preview" rsvp={<RsvpForm slug={slug} preview />} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line px-5 py-3 sm:px-8">
        <p role="status" aria-live="polite" className="text-sm text-ink-muted">
          {!saved ? "Aún no guardada" : dirty ? "Cambios sin guardar" : "Todo guardado"}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className={cn(CTA_SECONDARY, "h-11")}>
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={busy !== null || (Boolean(saved) && !dirty)}
            className={cn(CTA_PRIMARY, "disabled:opacity-60")}
          >
            {busy === "save" && <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        {note && <p className="mt-0.5 text-sm text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={htmlFor} className={FIELD_LABEL}>
        {label}
      </label>
      {children}
      {hint && <p className="text-[13px] text-ink-muted">{hint}</p>}
    </div>
  );
}

function PlaceFields({
  id,
  title,
  place,
  onChange,
  badUrl,
}: {
  id: string;
  title: string;
  place: InvitationPlace;
  onChange: (patch: Partial<InvitationPlace>) => void;
  badUrl: boolean;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-raised p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-[1fr_8.5rem]">
        <Field label="Lugar" htmlFor={`${id}-name`}>
          <Input
            id={`${id}-name`}
            value={place.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={LIMITS.placeName}
            placeholder={title === "Ceremonia" ? "Iglesia de San Miguel" : "Finca Los Olivos"}
            autoComplete="off"
            className={FIELD}
          />
        </Field>
        <Field label="Hora" htmlFor={`${id}-time`}>
          <TimePicker
            id={`${id}-time`}
            value={place.time}
            onChange={(time) => onChange({ time })}
            className={FIELD}
          />
        </Field>
      </div>
      <Field label="Dirección" htmlFor={`${id}-address`}>
        <Input
          id={`${id}-address`}
          value={place.address}
          onChange={(e) => onChange({ address: e.target.value })}
          maxLength={LIMITS.address}
          placeholder="Calle, número, localidad"
          autoComplete="off"
          className={FIELD}
        />
      </Field>
      <Field
        label="Enlace al mapa (opcional)"
        htmlFor={`${id}-map`}
        hint="Si lo dejas vacío, «Cómo llegar» buscará la dirección en Google Maps."
      >
        <Input
          id={`${id}-map`}
          type="url"
          inputMode="url"
          value={place.mapUrl}
          onChange={(e) => onChange({ mapUrl: e.target.value })}
          maxLength={LIMITS.url}
          placeholder="https://maps.app.goo.gl/…"
          aria-invalid={badUrl}
          aria-describedby={badUrl ? `${id}-map-error` : undefined}
          className={cn(FIELD, badUrl && "border-danger")}
        />
        {badUrl && (
          <p id={`${id}-map-error`} role="alert" className="text-[13px] text-danger">
            Pega una dirección web que empiece por http:// o https://.
          </p>
        )}
      </Field>
    </fieldset>
  );
}
