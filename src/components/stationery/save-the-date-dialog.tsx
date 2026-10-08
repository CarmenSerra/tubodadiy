"use client";

import * as React from "react";
import {
  CheckIcon,
  FileTextIcon,
  ImageIcon,
  Loader2,
  MessageCircleIcon,
  SaveIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY, Skeleton } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import {
  createPdf,
  createPng,
  downloadBlob,
  whatsappUrl,
} from "@/components/stationery/save-the-date-export";
import {
  DEFAULT_HEADING,
  TEMPLATE_INFO,
  defaultDesign,
  fileBaseName,
  isShareable,
  sameDesign,
  whatsappText,
  withSamples,
} from "@/components/stationery/save-the-date-model";
import {
  CARD_H,
  CARD_W,
  drawSaveTheDate,
  loadCardFonts,
  readCardFonts,
} from "@/components/stationery/save-the-date-render";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { ignoreToastInteraction } from "@/components/timeline/use-timeline-undo";
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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlanContext } from "@/lib/context/plan-context";
import {
  MAX_HEADING,
  MAX_MESSAGE,
  MAX_NAME,
  MAX_PLACE,
  SAVE_THE_DATE_TEMPLATES,
  mapSaveTheDate,
  saveSaveTheDate,
  saveTheDateRef,
  type SaveTheDateDesign,
  type SaveTheDateTemplate,
} from "@/lib/firebase/designs";
import { useDoc } from "@/lib/hooks/use-doc";
import { cn, formatDate } from "@/lib/utils";

/** Pantalla completa en móvil; en escritorio, un diálogo grande con cabecera y pie fijos. */
const MODAL =
  "top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-surface p-0 outline-none " +
  "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:w-[calc(100%-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-line";

const TEXTAREA =
  "min-h-20 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm";

/** Función que el editor registra para frenar el cierre si hay cambios sin guardar. */
type CloseGuard = () => boolean;

export function SaveTheDateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const restoreFocus = useRestoreFocus();
  const guardRef = React.useRef<CloseGuard | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next && guardRef.current?.()) return;
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
        <DialogHeader className="shrink-0 gap-1 px-5 pb-4 pt-5 pr-14 text-left sm:px-8 sm:pt-7">
          <DialogTitle className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Reserva la fecha
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-muted">
            Diseña un aviso para tus invitados y compártelo antes de enviar la invitación.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <SaveTheDateBody
            onClose={() => onOpenChange(false)}
            registerGuard={(guard) => {
              guardRef.current = guard;
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SaveTheDateBody({
  onClose,
  registerGuard,
}: {
  onClose: () => void;
  registerGuard: (guard: CloseGuard | null) => void;
}) {
  const { planId, plan } = usePlanContext();
  const { data: saved, loading, error } = useDoc(saveTheDateRef(planId), mapSaveTheDate);

  if (error) {
    return (
      <div className="flex-1 px-5 py-6 sm:px-8">
        <p role="alert" className="text-sm text-ink">
          No se ha podido cargar tu diseño. Recarga la página e inténtalo de nuevo.
        </p>
      </div>
    );
  }
  if (loading || !plan) {
    return (
      <div role="status" aria-label="Cargando el diseñador" className="flex flex-1 gap-6 px-5 pb-6 sm:px-8">
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="hidden aspect-[5/7] w-72 rounded-2xl md:block" />
      </div>
    );
  }
  return (
    <Editor
      // Una instancia por apertura: los datos guardados se leen una sola vez.
      initial={saved ?? defaultDesign(plan)}
      hasSaved={saved !== null}
      onClose={onClose}
      registerGuard={registerGuard}
    />
  );
}

/** Dibuja la tarjeta en un canvas (vista previa y miniaturas). */
function CardCanvas({
  design,
  pixels,
  className,
}: {
  design: SaveTheDateDesign;
  pixels: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    const fonts = readCardFonts();
    void loadCardFonts(fonts, design).then(() => {
      if (!cancelled && ref.current) drawSaveTheDate(ref.current, design, fonts);
    });
    return () => {
      cancelled = true;
    };
  }, [design]);

  return (
    <canvas
      ref={ref}
      width={pixels}
      height={Math.round((pixels * CARD_H) / CARD_W)}
      aria-hidden="true"
      className={cn("block h-auto w-full", className)}
    />
  );
}

function Editor({
  initial,
  hasSaved: initiallySaved,
  onClose,
  registerGuard,
}: {
  initial: SaveTheDateDesign;
  hasSaved: boolean;
  onClose: () => void;
  registerGuard: (guard: CloseGuard | null) => void;
}) {
  const { planId, plan } = usePlanContext();
  const [design, setDesign] = React.useState(initial);
  const [baseline, setBaseline] = React.useState(initial);
  const [hasSaved, setHasSaved] = React.useState(initiallySaved);
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState<null | "png" | "pdf">(null);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<"edit" | "preview">("edit");

  const dirty = !sameDesign(design, baseline);
  const shareable = isShareable(design);
  const preview = React.useMemo(() => withSamples(design), [design]);

  const headingId = React.useId();
  const name1Id = React.useId();
  const name2Id = React.useId();
  const dateId = React.useId();
  const placeId = React.useId();
  const messageId = React.useId();
  const hintId = React.useId();

  // El cierre (Esc, X, clic fuera) pide confirmación si hay cambios sin guardar.
  React.useEffect(() => {
    registerGuard(() => {
      if (!dirty) return false;
      setConfirmClose(true);
      return true;
    });
    return () => registerGuard(null);
  }, [dirty, registerGuard]);

  function patch(change: Partial<SaveTheDateDesign>) {
    setDesign((d) => ({ ...d, ...change }));
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    try {
      await saveSaveTheDate(planId, design);
      setBaseline(design);
      setHasSaved(true);
      return true;
    } catch {
      toast.error("No se ha podido guardar el diseño.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (await save()) toast.success("Diseño guardado");
  }

  async function handleSaveAndClose() {
    if (await save()) {
      setConfirmClose(false);
      toast.success("Diseño guardado");
      onClose();
    } else {
      setConfirmClose(false);
    }
  }

  async function handleDownload(kind: "png" | "pdf") {
    if (!shareable || busy) return;
    setBusy(kind);
    try {
      const base = fileBaseName(design);
      if (kind === "png") {
        downloadBlob(await createPng(design), `${base}.png`);
      } else {
        downloadBlob(await createPdf(design, DEFAULT_HEADING), `${base}.pdf`);
      }
    } catch {
      toast.error(kind === "png" ? "No se ha podido crear la imagen." : "No se ha podido crear el PDF.");
    } finally {
      setBusy(null);
    }
  }

  function handleWhatsapp() {
    if (!shareable) return;
    window.open(whatsappUrl(whatsappText(design)), "_blank", "noopener,noreferrer");
  }

  const planDate = plan?.weddingDate ?? "";
  const canUsePlanDate = Boolean(planDate) && planDate !== design.date;
  const status = saving
    ? "Guardando…"
    : dirty
      ? "Cambios sin guardar"
      : hasSaved
        ? "Diseño guardado"
        : "Aún sin guardar";

  return (
    <>
      {/* Móvil: o se edita, o se mira; en escritorio se ven las dos a la vez. */}
      <div className="shrink-0 px-5 pb-3 md:hidden">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-lilac-soft p-1 ring-1 ring-lilac-edge">
          {(
            [
              ["edit", "Editar"],
              ["preview", "Vista previa"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mobileTab === id}
              onClick={() => setMobileTab(id)}
              className={cn(
                "h-9 rounded-full text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac",
                mobileTab === id ? "bg-cta text-on-cta" : "text-ink hover:bg-lilac-soft"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-5 py-5 sm:px-8 md:grid md:grid-cols-[minmax(0,1fr)_19rem] md:items-start md:gap-8">
        {/* Formulario */}
        <div className={cn("flex min-w-0 flex-col gap-5", mobileTab !== "edit" && "hidden md:flex")}>
          <fieldset className="flex flex-col gap-2">
            <legend className={cn(FIELD_LABEL, "mb-2")}>Estilo</legend>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {SAVE_THE_DATE_TEMPLATES.map((id) => (
                <TemplateOption
                  key={id}
                  id={id}
                  checked={design.template === id}
                  design={preview}
                  onSelect={() => patch({ template: id })}
                />
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor={headingId} className={FIELD_LABEL}>
              Encabezado
            </Label>
            <Input
              id={headingId}
              value={design.heading}
              maxLength={MAX_HEADING}
              onChange={(e) => patch({ heading: e.target.value })}
              placeholder={DEFAULT_HEADING}
              autoComplete="off"
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={name1Id} className={FIELD_LABEL}>
                Primer nombre
              </Label>
              <Input
                id={name1Id}
                value={design.name1}
                maxLength={MAX_NAME}
                onChange={(e) => patch({ name1: e.target.value })}
                placeholder="Ana"
                autoComplete="off"
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={name2Id} className={FIELD_LABEL}>
                Segundo nombre
              </Label>
              <Input
                id={name2Id}
                value={design.name2}
                maxLength={MAX_NAME}
                onChange={(e) => patch({ name2: e.target.value })}
                placeholder="Luis"
                autoComplete="off"
                className={FIELD}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={dateId} className={FIELD_LABEL}>
              Fecha
            </Label>
            <DatePicker
              id={dateId}
              value={design.date}
              onChange={(v) => patch({ date: v })}
              className="h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm"
            />
            {canUsePlanDate && (
              <button
                type="button"
                onClick={() => patch({ date: planDate })}
                className="w-fit rounded-md text-left text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-lilac"
              >
                Usar la fecha de la boda ({formatDate(planDate)})
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={placeId} className={FIELD_LABEL}>
              Lugar o ciudad <span className="font-normal text-ink-muted">(opcional)</span>
            </Label>
            <Input
              id={placeId}
              value={design.place}
              maxLength={MAX_PLACE}
              onChange={(e) => patch({ place: e.target.value })}
              placeholder="Sevilla"
              autoComplete="off"
              className={FIELD}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={messageId} className={FIELD_LABEL}>
              Mensaje <span className="font-normal text-ink-muted">(opcional)</span>
            </Label>
            <Textarea
              id={messageId}
              value={design.message}
              maxLength={MAX_MESSAGE}
              onChange={(e) => patch({ message: e.target.value })}
              rows={3}
              placeholder="Muy pronto recibirás la invitación con todos los detalles."
              className={TEXTAREA}
            />
            <p className="text-right text-xs tabular-nums text-ink-muted" aria-hidden="true">
              {design.message.length}/{MAX_MESSAGE}
            </p>
          </div>
        </div>

        {/* Vista previa y exportación */}
        <div
          className={cn(
            "flex min-w-0 flex-col items-center gap-4 md:sticky md:top-0",
            mobileTab !== "preview" && "hidden md:flex"
          )}
        >
          <figure className="w-full max-w-[22rem] md:max-w-none">
            <div
              role="img"
              aria-label={`Vista previa de la tarjeta: ${[design.heading, design.name1, design.name2, design.date ? formatDate(design.date) : "", design.place]
                .map((s) => s.trim())
                .filter(Boolean)
                .join(", ")}`}
              className="overflow-hidden rounded-xl border border-line bg-field shadow-pop"
            >
              <CardCanvas design={preview} pixels={720} />
            </div>
            <figcaption className="sr-only">Así se verá tu tarjeta al descargarla.</figcaption>
          </figure>

          <div className="flex w-full max-w-[22rem] flex-col gap-2 md:max-w-none">
            <p className="text-xs font-medium text-ink-muted">Descargar o compartir</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleDownload("png")}
                disabled={!shareable || busy !== null}
                aria-describedby={shareable ? undefined : hintId}
                aria-label="Descargar imagen PNG"
                className={cn(CTA_SECONDARY, "h-11 w-full px-3 disabled:opacity-50")}
              >
                {busy === "png" ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <ImageIcon aria-hidden="true" className="size-4" />
                )}
                Imagen PNG
              </button>
              <button
                type="button"
                onClick={() => void handleDownload("pdf")}
                disabled={!shareable || busy !== null}
                aria-describedby={shareable ? undefined : hintId}
                aria-label="Descargar PDF"
                className={cn(CTA_SECONDARY, "h-11 w-full px-3 disabled:opacity-50")}
              >
                {busy === "pdf" ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <FileTextIcon aria-hidden="true" className="size-4" />
                )}
                PDF
              </button>
            </div>
            <button
              type="button"
              onClick={handleWhatsapp}
              disabled={!shareable}
              aria-describedby={shareable ? undefined : hintId}
              className={cn(CTA_SECONDARY, "h-11 w-full disabled:opacity-50")}
            >
              <MessageCircleIcon aria-hidden="true" className="size-4" />
              Compartir por WhatsApp
            </button>
            <p id={hintId} className="text-center text-xs text-ink-muted">
              {shareable
                ? "WhatsApp se abre con el texto listo; descarga la imagen y adjúntala en el chat."
                : "Escribe al menos un nombre y elige la fecha para descargar o compartir."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line px-5 py-3 sm:px-8">
        <p role="status" className="flex items-center gap-1.5 text-sm text-ink-muted">
          {!dirty && hasSaved && <CheckIcon aria-hidden="true" className="size-4 text-green" />}
          {status}
        </p>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className={cn(CTA_PRIMARY, "disabled:opacity-60")}
        >
          {saving ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <SaveIcon aria-hidden="true" className="size-4" />
          )}
          Guardar diseño
        </button>
      </div>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Guardar los cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Has cambiado la tarjeta y todavía no la has guardado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogCancel
              onClick={() => {
                setConfirmClose(false);
                onClose();
              }}
            >
              Descartar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleSaveAndClose();
              }}
            >
              Guardar y cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TemplateOption({
  id,
  checked,
  design,
  onSelect,
}: {
  id: SaveTheDateTemplate;
  checked: boolean;
  design: SaveTheDateDesign;
  onSelect: () => void;
}) {
  const info = TEMPLATE_INFO[id];
  const thumb = React.useMemo(() => ({ ...design, template: id }), [design, id]);
  return (
    <label className="group flex min-w-0 cursor-pointer flex-col items-center gap-1.5">
      <input
        type="radio"
        name="save-the-date-template"
        value={id}
        checked={checked}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span
        className={cn(
          "block w-full overflow-hidden rounded-lg border border-line transition-shadow",
          "peer-checked:ring-2 peer-checked:ring-lilac peer-checked:ring-offset-2 peer-checked:ring-offset-surface",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-lilac peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface",
          "group-hover:border-line-strong"
        )}
      >
        <CardCanvas design={thumb} pixels={200} />
      </span>
      <span
        className={cn(
          "text-center text-xs leading-tight",
          checked ? "font-semibold text-ink" : "text-ink-muted"
        )}
        title={info.blurb}
      >
        {info.label}
      </span>
    </label>
  );
}
