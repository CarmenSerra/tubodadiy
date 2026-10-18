"use client";

import * as React from "react";
import { ExternalLinkIcon, ImageOffIcon, ImagePlusIcon, Loader2, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { FIELD, ICON_BUTTON } from "@/components/guests/brand-dialog";
import { addItem, deleteItem, restoreItem, savePalette, updateItem } from "@/components/look/look-firebase";
import {
  MOODBOARD_IMAGE_BYTES,
  MOODBOARD_IMAGE_SIDE,
  MOODBOARD_MAX,
  PALETTE_MAX,
  PALETTE_PRESETS,
  normalizeHex,
  type MoodImage,
} from "@/components/look/look-model";
import { Field, LK_CARD, LK_FOCUS, LookDialog } from "@/components/look/ui";
import { isHttpUrl } from "@/components/vendors/vendor-model";
import { Input } from "@/components/ui/input";
import { compressImageToDataUri } from "@/lib/image-compress";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

/** Paleta de colores y tablero de inspiración (parte de «Decoración y flores»). */
export function Moodboard({ planId, images, palette }: { planId: string; images: MoodImage[]; palette: string[] }) {
  return (
    <div className="flex flex-col gap-8">
      <Palette planId={planId} palette={palette} />
      <Board planId={planId} images={images} />
    </div>
  );
}

// ---------------------------------------------------------------- Paleta

function Palette({ planId, palette }: { planId: string; palette: string[] }) {
  const { t } = useTranslation("look");
  const uid = React.useId();
  const [picked, setPicked] = React.useState("#927aac");
  const [hex, setHex] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const full = palette.length >= PALETTE_MAX;

  async function persist(next: string[], undoTo?: string[]) {
    try {
      await savePalette(planId, next);
      if (undoTo) toastWithUndo(t("palette.replaced"), () => savePalette(planId, undoTo));
    } catch {
      toast.error(t("palette.saveError"));
    }
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const color = hex.trim() ? normalizeHex(hex) : normalizeHex(picked);
    if (!color) {
      setError(t("palette.invalidHex"));
      document.getElementById(`${uid}-hex`)?.focus();
      return;
    }
    setError(null);
    setHex("");
    if (palette.includes(color)) return;
    void persist([...palette, color]);
  }

  return (
    <section aria-labelledby={`${uid}-title`} className={cn(LK_CARD, "flex flex-col gap-4 p-4 sm:p-5")}>
      <div className="min-w-0 max-w-xl">
        <h4 id={`${uid}-title`} className="font-display text-lg font-semibold text-ink sm:text-xl">
          {t("palette.title")}
        </h4>
        <p className="mt-1 text-sm text-ink-muted">{t("palette.description")}</p>
      </div>

      {palette.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {palette.map((color) => (
            <li key={color} className="flex flex-col gap-1.5">
              <span
                role="img"
                aria-label={color.toUpperCase()}
                className="block h-16 w-full rounded-xl border border-line-strong"
                style={{ backgroundColor: color }}
              />
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-xs uppercase text-ink-muted">{color}</span>
                <button
                  type="button"
                  aria-label={t("palette.remove", { color: color.toUpperCase() })}
                  title={t("palette.remove", { color: color.toUpperCase() })}
                  onClick={() => persist(palette.filter((c) => c !== color))}
                  className={cn(ICON_BUTTON, LK_FOCUS)}
                >
                  <XIcon aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!full ? (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${uid}-picker`} className="text-sm font-medium text-ink">
              {t("palette.pick")}
            </label>
            <input
              id={`${uid}-picker`}
              type="color"
              value={picked}
              onChange={(e) => {
                setPicked(e.target.value);
                setHex("");
                setError(null);
              }}
              className={cn("h-11 w-16 cursor-pointer rounded-xl border border-line-strong bg-field p-1", LK_FOCUS)}
            />
          </div>
          <Field id={`${uid}-hex`} label={t("palette.hex")} optional error={error} className="w-40">
            <Input
              id={`${uid}-hex`}
              value={hex}
              onChange={(e) => {
                setHex(e.target.value);
                setError(null);
              }}
              placeholder="#927AAC"
              maxLength={7}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${uid}-hex-error` : undefined}
              className={cn(FIELD, "font-mono uppercase")}
            />
          </Field>
          <button type="submit" className={cn(CTA_SECONDARY, "h-11")}>
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("palette.add")}
          </button>
        </form>
      ) : (
        <p className="text-sm text-ink-muted">{t("palette.full", { max: PALETTE_MAX })}</p>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">{t("palette.presetsTitle")}</p>
        <ul className="flex flex-wrap gap-2">
          {PALETTE_PRESETS.map((preset) => (
            <li key={preset.key}>
              <button
                type="button"
                onClick={() => persist(preset.colors, palette.length > 0 ? palette : undefined)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-field px-3.5 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft",
                  LK_FOCUS
                )}
              >
                <span aria-hidden="true" className="flex -space-x-1">
                  {preset.colors.map((c) => (
                    <span key={c} className="size-4 rounded-full border border-surface" style={{ backgroundColor: c }} />
                  ))}
                </span>
                {t(`palette.presets.${preset.key}`)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ------------------------------------------------------------- Moodboard

function Board({ planId, images }: { planId: string; images: MoodImage[] }) {
  const { t } = useTranslation("look");
  const [adding, setAdding] = React.useState(false);
  const [viewing, setViewing] = React.useState<MoodImage | null>(null);
  const [shown, setShown] = React.useState<MoodImage | null>(null);
  const full = images.length >= MOODBOARD_MAX;

  function view(image: MoodImage) {
    setShown(image);
    setViewing(image);
  }

  return (
    <section aria-labelledby="lk-mood-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 max-w-xl">
          <h4 id="lk-mood-title" className="font-display text-lg font-semibold text-ink sm:text-xl">
            {t("mood.title")}
          </h4>
          <p className="mt-1 text-sm text-ink-muted">{t("mood.description")}</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={full}
            className={cn(CTA_PRIMARY, "disabled:opacity-60")}
          >
            <ImagePlusIcon aria-hidden="true" className="size-4" />
            {t("mood.add")}
          </button>
          <p className="text-xs tabular-nums text-ink-muted">
            {full ? t("mood.full", { max: MOODBOARD_MAX }) : t("mood.count", { current: images.length, max: MOODBOARD_MAX })}
          </p>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-lilac-soft p-5 ring-1 ring-lilac-edge sm:p-6">
          <h5 className="font-display text-lg font-semibold text-ink">{t("mood.empty.title")}</h5>
          <p className="max-w-xl text-sm text-ink-strong">{t("mood.empty.text")}</p>
        </div>
      ) : (
        <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {images.map((image) => (
            <li key={image.id} className="mb-3 break-inside-avoid">
              <Tile image={image} onOpen={() => view(image)} />
            </li>
          ))}
        </ul>
      )}

      <AddDialog planId={planId} open={adding} onOpenChange={setAdding} count={images.length} />
      <ImageDialog planId={planId} open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)} image={shown} />
    </section>
  );
}

function Tile({ image, onOpen }: { image: MoodImage; onOpen: () => void }) {
  const { t } = useTranslation("look");
  const [failed, setFailed] = React.useState(false);
  const name = image.label || t("mood.untitled");
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("mood.open", { name })}
      className={cn(
        "group block w-full overflow-hidden rounded-2xl border border-line bg-surface text-left transition-shadow hover:shadow-pop",
        LK_FOCUS
      )}
    >
      {failed ? (
        <span className="flex h-32 w-full flex-col items-center justify-center gap-1 bg-lilac-soft px-3 text-center text-xs text-ink-muted">
          <ImageOffIcon aria-hidden="true" className="size-5" />
          {t("mood.broken")}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- enlaces remotos libres o imagen ya comprimida (data URI)
        <img
          src={image.src}
          alt={image.label}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="block h-auto w-full"
        />
      )}
      {image.label && <span className="block px-3 py-2 text-sm text-ink-strong [overflow-wrap:anywhere]">{image.label}</span>}
    </button>
  );
}

function AddDialog({
  planId,
  open,
  onOpenChange,
  count,
}: {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
}) {
  const { t } = useTranslation("look");
  return (
    <LookDialog open={open} onOpenChange={onOpenChange} title={t("mood.addDialog.title")}>
      {(close) => <AddForm planId={planId} count={count} onDone={close} />}
    </LookDialog>
  );
}

function AddForm({ planId, count, onDone }: { planId: string; count: number; onDone: () => void }) {
  const { t } = useTranslation("look");
  const uid = React.useId();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [label, setLabel] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const room = MOODBOARD_MAX - count;

  async function handleUrl(e: React.FormEvent) {
    e.preventDefault();
    const src = url.trim();
    if (!isHttpUrl(src)) {
      setUrlError(t("mood.addDialog.invalidUrl"));
      document.getElementById(`${uid}-url`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await addItem(planId, "moodboard", { kind: "url", src, label: label.trim() });
      toast.success(t("mood.added", { count: 1 }));
      onDone();
    } catch {
      toast.error(t("mood.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length === 0) {
      toast.error(t("mood.addDialog.notImage"));
      return;
    }
    const batch = files.slice(0, room);
    setBusy(true);
    let added = 0;
    try {
      for (const file of batch) {
        const src = await compressImageToDataUri(file, {
          maxSide: MOODBOARD_IMAGE_SIDE,
          targetBytes: MOODBOARD_IMAGE_BYTES,
        });
        await addItem(planId, "moodboard", { kind: "upload", src, label: batch.length === 1 ? label.trim() : "" });
        added += 1;
      }
    } catch {
      toast.error(t("mood.addDialog.processError"));
    } finally {
      setBusy(false);
    }
    if (added > 0) {
      toast.success(t("mood.added", { count: added }));
      if (files.length > batch.length) toast(t("mood.someSkipped", { max: MOODBOARD_MAX }));
      onDone();
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-5">
      <Field id={`${uid}-label`} label={t("mood.addDialog.label")} optional hint={t("mood.addDialog.labelHint")}>
        <Input
          id={`${uid}-label`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("mood.addDialog.labelPlaceholder")}
          maxLength={80}
          autoFocus
          autoComplete="off"
          className={FIELD}
        />
      </Field>

      <form onSubmit={handleUrl} noValidate className="flex flex-col gap-3">
        <Field id={`${uid}-url`} label={t("mood.addDialog.url")} error={urlError}>
          <Input
            id={`${uid}-url`}
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError(null);
            }}
            placeholder="https://"
            aria-invalid={urlError ? true : undefined}
            aria-describedby={urlError ? `${uid}-url-error` : undefined}
            autoComplete="off"
            className={FIELD}
          />
        </Field>
        <button type="submit" disabled={busy || !url.trim()} className={cn(CTA_SECONDARY, "h-11 self-start disabled:opacity-60")}>
          {t("mood.addDialog.addUrl")}
        </button>
      </form>

      <div className="flex items-center gap-3 text-sm text-ink-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        {t("mood.addDialog.or")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          id={`${uid}-file`}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label={t("mood.addDialog.upload")}
          onChange={handleFiles}
        />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={cn(CTA_SECONDARY, "h-11 self-start disabled:opacity-60")}>
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <ImagePlusIcon aria-hidden="true" className="size-4" />}
          {busy ? t("mood.addDialog.processing") : t("mood.addDialog.upload")}
        </button>
        <p className="text-xs text-ink-muted">{t("mood.addDialog.uploadHint", { kb: Math.round(MOODBOARD_IMAGE_BYTES / 1024), room })}</p>
      </div>
    </div>
  );
}

function ImageDialog({
  planId,
  open,
  onOpenChange,
  image,
}: {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: MoodImage | null;
}) {
  const { t } = useTranslation("look");
  return (
    <LookDialog open={open && image !== null} onOpenChange={onOpenChange} title={t("mood.view.title")}>
      {(close) => image && <ImageView planId={planId} image={image} onDone={close} />}
    </LookDialog>
  );
}

function ImageView({ planId, image, onDone }: { planId: string; image: MoodImage; onDone: () => void }) {
  const { t } = useTranslation("look");
  const uid = React.useId();
  const [label, setLabel] = React.useState(image.label);
  const [failed, setFailed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateItem(planId, "moodboard", image.id, { label: label.trim() });
      onDone();
    } catch {
      toast.error(t("mood.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteItem(planId, "moodboard", image.id);
      onDone();
      toastWithUndo(t("mood.deleted"), () => restoreItem(planId, "moodboard", image));
    } catch {
      toast.error(t("mood.deleteError"));
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
      <div className="flex max-h-[55dvh] items-center justify-center overflow-hidden rounded-xl bg-lilac-soft">
        {failed ? (
          <span className="flex h-40 flex-col items-center justify-center gap-1 text-sm text-ink-muted">
            <ImageOffIcon aria-hidden="true" className="size-6" />
            {t("mood.broken")}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- enlaces remotos libres o imagen ya comprimida (data URI)
          <img
            src={image.src}
            alt={image.label}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="max-h-[55dvh] w-auto max-w-full object-contain"
          />
        )}
      </div>
      <Field id={`${uid}-label`} label={t("mood.view.label")} optional>
        <Input
          id={`${uid}-label`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("mood.addDialog.labelPlaceholder")}
          maxLength={80}
          autoComplete="off"
          className={FIELD}
        />
      </Field>
      {image.kind === "url" && isHttpUrl(image.src) && (
        <a
          href={image.src}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4", LK_FOCUS)}
        >
          <ExternalLinkIcon aria-hidden="true" className="size-4" />
          {t("mood.view.openOriginal")}
          <span className="sr-only">{t("mood.view.newTab")}</span>
        </a>
      )}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink sm:mr-auto",
            LK_FOCUS
          )}
        >
          <Trash2Icon aria-hidden="true" className="size-4" />
          {t("mood.view.delete")}
        </button>
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          {t("form.cancel")}
        </button>
        <button type="submit" disabled={saving} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {saving && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("form.save")}
        </button>
      </div>
    </form>
  );
}
