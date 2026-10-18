"use client";

import * as React from "react";
import { Music2Icon, PlusIcon } from "lucide-react";
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
import { useCeremonyMusic } from "@/components/dayof/use-dayof";
import {
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlanContext } from "@/lib/context/plan-context";
import {
  CEREMONY_MUSIC_MOMENTS,
  isCeremonyMusicMoment,
  type CeremonyMusicMoment,
  type CeremonyTrack,
} from "@/lib/dayof-model";
import { createDayOfItem, deleteDayOfItem, restoreDayOfItem, updateDayOfItem } from "@/lib/firebase/dayof";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

/** «Música de la ceremonia»: qué suena en la entrada, las firmas, la salida… */
export function MusicSection() {
  const { t } = useTranslation("ceremony");
  const { planId } = usePlanContext();
  const { data, loading, error } = useCeremonyMusic(planId);
  const editor = useEditor<CeremonyTrack>();

  const addButton = (
    <button type="button" onClick={editor.openNew} className={data.length > 0 ? CTA_SECONDARY : CTA_PRIMARY}>
      <PlusIcon aria-hidden="true" className="size-4" />
      {t("music.add")}
    </button>
  );

  return (
    <CeremonySection
      id="musica"
      icon={<Music2Icon />}
      title={t("music.title")}
      description={t("music.description")}
      action={data.length > 0 ? addButton : undefined}
    >
      <ListBody
        loading={loading}
        error={error}
        empty={data.length === 0}
        emptyText={t("music.empty")}
        emptyAction={addButton}
      >
        <ul>
          {data.map((track) => (
            <li key={track.id} className={ROW}>
              <button
                type="button"
                onClick={() => editor.openEdit(track)}
                aria-label={t("music.editAria", { song: track.song })}
                className={ROW_MAIN}
              >
                <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t(`music.moments.${track.moment}`)}
                </span>
                <span className="break-words font-medium text-ink">{track.song}</span>
                {track.artist.trim() && <span className="break-words text-sm text-ink-muted">{track.artist}</span>}
              </button>
              {track.url && <ExternalLink href={track.url} label={t("music.listen")} className="shrink-0" />}
            </li>
          ))}
        </ul>
      </ListBody>
      <DayDialog open={editor.open} onOpenChange={editor.setOpen}>
        <TrackForm
          key={editor.item?.id ?? "new"}
          planId={planId}
          track={editor.item}
          onDone={() => editor.setOpen(false)}
        />
      </DayDialog>
    </CeremonySection>
  );
}

function TrackForm({ planId, track, onDone }: { planId: string; track?: CeremonyTrack; onDone: () => void }) {
  const { t } = useTranslation("ceremony");
  const [moment, setMoment] = React.useState<CeremonyMusicMoment>(track?.moment ?? "entrance");
  const [song, setSong] = React.useState(track?.song ?? "");
  const [artist, setArtist] = React.useState(track?.artist ?? "");
  const [url, setUrl] = React.useState(track?.url ?? "");
  const [errors, setErrors] = React.useState<{ song?: string; url?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const momentId = React.useId();

  async function submit() {
    const link = normalizeLink(url);
    const found: typeof errors = {};
    if (!song.trim()) found.song = t("music.errors.song");
    if (link === null) found.url = t("music.errors.url");
    setErrors(found);
    if (found.song || link === null) return;
    const data = { moment, song: song.trim(), artist: artist.trim(), url: link };
    setBusy(true);
    try {
      if (track) await updateDayOfItem(planId, "music", track.id, data);
      else await createDayOfItem(planId, "music", data);
      onDone();
    } catch {
      toast.error(t("music.errors.save"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!track) return;
    try {
      await deleteDayOfItem(planId, "music", track.id);
      onDone();
      toastWithUndo(t("music.deleted"), () => restoreDayOfItem(planId, "music", track));
    } catch {
      toast.error(t("music.errors.delete"));
    }
  }

  return (
    <FormFrame
      title={track ? t("music.form.editTitle") : t("music.form.newTitle")}
      description={t("music.form.description")}
      busy={busy}
      onSubmit={() => void submit()}
      onCancel={onDone}
      onDelete={track ? () => void remove() : undefined}
      deleteLabel={t("music.form.delete")}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={momentId} className={FIELD_LABEL}>
          {t("music.form.fields.moment")}
        </Label>
        <Select value={moment} onValueChange={(v) => isCeremonyMusicMoment(v) && setMoment(v)}>
          <SelectTrigger id={momentId} className={cn(SELECT_TRIGGER, "w-full")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            {CEREMONY_MUSIC_MOMENTS.map((m) => (
              <SelectItem key={m} value={m} className={SELECT_ITEM}>
                {t(`music.moments.${m}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <TextField
        label={t("music.form.fields.song")}
        value={song}
        onChange={(v) => {
          setSong(v);
          setErrors((e) => ({ ...e, song: undefined }));
        }}
        error={errors.song}
        required
        autoFocus={!track}
      />
      <TextField label={t("music.form.fields.artist")} value={artist} onChange={setArtist} />
      <TextField
        label={t("music.form.fields.url")}
        value={url}
        onChange={(v) => {
          setUrl(v);
          setErrors((e) => ({ ...e, url: undefined }));
        }}
        error={errors.url}
        hint={t("music.form.urlHint")}
        placeholder="https://"
        inputMode="url"
      />
    </FormFrame>
  );
}
