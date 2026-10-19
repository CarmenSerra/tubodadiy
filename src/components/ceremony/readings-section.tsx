"use client";

import * as React from "react";
import { BookOpenIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CeremonySection } from "@/components/ceremony/section";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  DayDialog,
  ExternalLink,
  FormFrame,
  ListBody,
  ROW,
  ROW_MAIN,
  TextField,
  normalizeLink,
  useEditor,
} from "@/components/dayof/ui";
import { useReadings } from "@/components/dayof/use-dayof";
import { FIELD, FIELD_LABEL, ICON_BUTTON } from "@/components/guests/brand-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlanContext } from "@/lib/context/plan-context";
import type { Reading } from "@/lib/dayof-model";
import {
  createDayOfItem,
  deleteDayOfItem,
  restoreDayOfItem,
  swapReadings,
  updateDayOfItem,
} from "@/lib/firebase/dayof";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";

/** «Lecturas»: título, texto o enlace, quién la lee y el orden en que suenan. */
export function ReadingsSection() {
  const { t } = useTranslation("ceremony");
  const { planId } = usePlanContext();
  const { canEdit } = usePlanPermission("ceremony");
  const { data, loading, error } = useReadings(planId);
  const editor = useEditor<Reading>();
  const [announcement, setAnnouncement] = React.useState("");
  const nextOrder = data.length > 0 ? Math.max(...data.map((r) => r.order)) + 10 : 10;

  async function move(index: number, delta: -1 | 1) {
    const a = data[index];
    const b = data[index + delta];
    if (!a || !b) return;
    try {
      await swapReadings(planId, a, b);
      setAnnouncement(t("readings.moved", { title: a.title, position: index + delta + 1, total: data.length }));
    } catch {
      toast.error(t("readings.errors.move"));
    }
  }

  const addButton = (
    <button type="button" onClick={editor.openNew} className={data.length > 0 ? CTA_SECONDARY : CTA_PRIMARY}>
      <PlusIcon aria-hidden="true" className="size-4" />
      {t("readings.add")}
    </button>
  );

  return (
    <CeremonySection
      id="lecturas"
      icon={<BookOpenIcon />}
      title={t("readings.title")}
      description={t("readings.description")}
      action={canEdit && data.length > 0 ? addButton : undefined}
    >
      <ListBody
        loading={loading}
        error={error}
        empty={data.length === 0}
        emptyText={t("readings.empty")}
        emptyAction={canEdit ? addButton : undefined}
      >
        <ol>
          {data.map((reading, index) => (
            <li key={reading.id} className={ROW}>
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lilac-soft font-display text-sm font-semibold tabular-nums text-ink"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <button
                  type="button"
                  onClick={() => editor.openEdit(reading)}
                  aria-label={t("readings.editAria", { title: reading.title })}
                  className={ROW_MAIN}
                >
                  <span className="break-words font-medium text-ink">{reading.title}</span>
                  {reading.reader.trim() && (
                    <span className="text-sm text-ink-muted">{t("readings.readBy", { name: reading.reader })}</span>
                  )}
                  {reading.text.trim() && (
                    <span className="line-clamp-2 whitespace-pre-line break-words text-sm text-ink-strong">
                      {reading.text}
                    </span>
                  )}
                </button>
                {reading.url && <ExternalLink href={reading.url} label={t("readings.openLink")} className="self-start" />}
              </div>
              {canEdit && (
              <div className="flex shrink-0 flex-col sm:flex-row">
                <button
                  type="button"
                  className={cn(ICON_BUTTON, "disabled:opacity-40")}
                  disabled={index === 0}
                  onClick={() => void move(index, -1)}
                  aria-label={t("readings.moveUp", { title: reading.title })}
                >
                  <ChevronUpIcon aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={cn(ICON_BUTTON, "disabled:opacity-40")}
                  disabled={index === data.length - 1}
                  onClick={() => void move(index, 1)}
                  aria-label={t("readings.moveDown", { title: reading.title })}
                >
                  <ChevronDownIcon aria-hidden="true" />
                </button>
              </div>
              )}
            </li>
          ))}
        </ol>
      </ListBody>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <DayDialog open={editor.open} onOpenChange={editor.setOpen} readOnly={!canEdit}>
        <ReadingForm
          key={editor.item?.id ?? "new"}
          planId={planId}
          reading={editor.item}
          nextOrder={nextOrder}
          onDone={() => editor.setOpen(false)}
        />
      </DayDialog>
    </CeremonySection>
  );
}

function ReadingForm({
  planId,
  reading,
  nextOrder,
  onDone,
}: {
  planId: string;
  reading?: Reading;
  nextOrder: number;
  onDone: () => void;
}) {
  const { t } = useTranslation("ceremony");
  const [title, setTitle] = React.useState(reading?.title ?? "");
  const [reader, setReader] = React.useState(reading?.reader ?? "");
  const [body, setBody] = React.useState(reading?.text ?? "");
  const [url, setUrl] = React.useState(reading?.url ?? "");
  const [errors, setErrors] = React.useState<{ title?: string; url?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const textId = React.useId();

  async function submit() {
    const link = normalizeLink(url);
    const found: typeof errors = {};
    if (!title.trim()) found.title = t("readings.errors.title");
    if (link === null) found.url = t("readings.errors.url");
    setErrors(found);
    if (found.title || link === null) return;
    const data = { title: title.trim(), reader: reader.trim(), text: body.trim(), url: link };
    setBusy(true);
    try {
      if (reading) await updateDayOfItem(planId, "readings", reading.id, data);
      else await createDayOfItem(planId, "readings", { ...data, order: nextOrder });
      onDone();
    } catch {
      toast.error(t("readings.errors.save"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!reading) return;
    try {
      await deleteDayOfItem(planId, "readings", reading.id);
      onDone();
      toastWithUndo(t("readings.deleted"), () => restoreDayOfItem(planId, "readings", reading));
    } catch {
      toast.error(t("readings.errors.delete"));
    }
  }

  return (
    <FormFrame
      title={reading ? t("readings.form.editTitle") : t("readings.form.newTitle")}
      description={t("readings.form.description")}
      busy={busy}
      onSubmit={() => void submit()}
      onCancel={onDone}
      onDelete={reading ? () => void remove() : undefined}
      deleteLabel={t("readings.form.delete")}
    >
      <TextField
        label={t("readings.form.fields.title")}
        value={title}
        onChange={(v) => {
          setTitle(v);
          setErrors((e) => ({ ...e, title: undefined }));
        }}
        error={errors.title}
        placeholder={t("readings.form.placeholders.title")}
        required
        autoFocus={!reading}
      />
      <TextField
        label={t("readings.form.fields.reader")}
        value={reader}
        onChange={setReader}
        placeholder={t("readings.form.placeholders.reader")}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={textId} className={FIELD_LABEL}>
          {t("readings.form.fields.text")}
        </Label>
        <Textarea
          id={textId}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className={cn(FIELD, "h-auto min-h-28 py-2.5")}
        />
      </div>
      <TextField
        label={t("readings.form.fields.url")}
        value={url}
        onChange={(v) => {
          setUrl(v);
          setErrors((e) => ({ ...e, url: undefined }));
        }}
        error={errors.url}
        hint={t("readings.form.urlHint")}
        placeholder="https://"
        inputMode="url"
      />
    </FormFrame>
  );
}
