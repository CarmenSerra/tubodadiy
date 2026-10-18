"use client";

import * as React from "react";
import { BanIcon, ListMusicIcon, PlusIcon, StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CeremonySection } from "@/components/ceremony/section";
import { CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  DayDialog,
  ExternalLink,
  FormFrame,
  ListBody,
  ROW,
  ROW_MAIN,
  TextField,
  choicePill,
  normalizeLink,
  useEditor,
} from "@/components/dayof/ui";
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
  PLAYLIST_MOMENTS,
  SONG_FLAGS,
  isPlaylistMoment,
  type PlaylistMoment,
  type Song,
  type SongFlag,
} from "@/lib/dayof-model";
import { createDayOfItem, deleteDayOfItem, restoreDayOfItem, updateDayOfItem } from "@/lib/firebase/dayof";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

/** Etiqueta de «imprescindible» / «no poner» (con icono y texto, nunca solo color). */
function FlagBadge({ flag }: { flag: SongFlag }) {
  const { t } = useTranslation("dayof");
  if (flag === "normal") return null;
  const Icon = flag === "must" ? StarIcon : BanIcon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-lilac-soft px-2 py-0.5 text-xs font-medium text-ink ring-1 ring-lilac-edge">
      <Icon aria-hidden="true" className="size-3" />
      {t(`playlist.flags.${flag}`)}
    </span>
  );
}

/** «Playlist»: canciones por momento, con las imprescindibles y las que no hay que poner. */
export function PlaylistSection({
  songs,
  loading,
  error,
}: {
  songs: Song[];
  loading: boolean;
  error: string | null;
}) {
  const { t } = useTranslation("dayof");
  const { planId } = usePlanContext();
  const editor = useEditor<Song>();
  const [presetMoment, setPresetMoment] = React.useState<PlaylistMoment>("cocktail");

  function addTo(moment: PlaylistMoment) {
    setPresetMoment(moment);
    editor.openNew();
  }

  const must = songs.filter((s) => s.flag === "must").length;
  const avoid = songs.filter((s) => s.flag === "avoid").length;

  return (
    <CeremonySection
      id="playlist"
      icon={<ListMusicIcon />}
      title={t("playlist.title")}
      description={t("playlist.description")}
    >
      <ListBody
        loading={loading}
        error={error}
        empty={false}
        emptyText=""
      >
        {songs.length > 0 && (
          <p className="text-sm text-ink-muted">
            {t("playlist.summary", { count: songs.length, must, avoid })}
          </p>
        )}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {PLAYLIST_MOMENTS.map((moment) => {
            const list = songs.filter((s) => s.moment === moment);
            const name = t(`playlist.moments.${moment}`);
            return (
              <section key={moment} aria-label={name} className="overflow-hidden rounded-2xl border border-line">
                <h3 className="flex items-center justify-between gap-3 bg-lilac-soft px-4 py-3 font-display text-lg font-semibold text-ink">
                  {name}
                  <span className="text-sm font-normal tabular-nums text-ink-muted">{list.length}</span>
                </h3>
                {list.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-ink-muted">{t("playlist.emptyMoment")}</p>
                ) : (
                  <ul className="px-2">
                    {list.map((song) => (
                      <li key={song.id} className={ROW}>
                        <button
                          type="button"
                          onClick={() => editor.openEdit(song)}
                          aria-label={t("playlist.editAria", { title: song.title })}
                          className={ROW_MAIN}
                        >
                          <span
                            className={cn(
                              "break-words font-medium text-ink",
                              song.flag === "avoid" && "line-through decoration-2"
                            )}
                          >
                            {song.title}
                          </span>
                          {song.artist.trim() && (
                            <span className="break-words text-sm text-ink-muted">{song.artist}</span>
                          )}
                          <FlagBadge flag={song.flag} />
                        </button>
                        {song.url && <ExternalLink href={song.url} label={t("playlist.listen")} className="shrink-0" />}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="border-t border-line p-3">
                  <button
                    type="button"
                    onClick={() => addTo(moment)}
                    aria-label={t("playlist.addTo", { moment: name })}
                    className={CTA_SECONDARY}
                  >
                    <PlusIcon aria-hidden="true" className="size-4" />
                    {t("playlist.add")}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </ListBody>
      <DayDialog open={editor.open} onOpenChange={editor.setOpen}>
        <SongForm
          key={editor.item?.id ?? `new-${presetMoment}`}
          planId={planId}
          song={editor.item}
          defaultMoment={presetMoment}
          onDone={() => editor.setOpen(false)}
        />
      </DayDialog>
    </CeremonySection>
  );
}

function SongForm({
  planId,
  song,
  defaultMoment,
  onDone,
}: {
  planId: string;
  song?: Song;
  defaultMoment: PlaylistMoment;
  onDone: () => void;
}) {
  const { t } = useTranslation("dayof");
  const [moment, setMoment] = React.useState<PlaylistMoment>(song?.moment ?? defaultMoment);
  const [title, setTitle] = React.useState(song?.title ?? "");
  const [artist, setArtist] = React.useState(song?.artist ?? "");
  const [url, setUrl] = React.useState(song?.url ?? "");
  const [flag, setFlag] = React.useState<SongFlag>(song?.flag ?? "normal");
  const [errors, setErrors] = React.useState<{ title?: string; url?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const momentId = React.useId();
  const flagName = React.useId();

  async function submit() {
    const link = normalizeLink(url);
    const found: typeof errors = {};
    if (!title.trim()) found.title = t("playlist.errors.title");
    if (link === null) found.url = t("playlist.errors.url");
    setErrors(found);
    if (found.title || link === null) return;
    const data = { moment, title: title.trim(), artist: artist.trim(), url: link, flag };
    setBusy(true);
    try {
      if (song) await updateDayOfItem(planId, "songs", song.id, data);
      else await createDayOfItem(planId, "songs", data);
      onDone();
    } catch {
      toast.error(t("playlist.errors.save"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!song) return;
    try {
      await deleteDayOfItem(planId, "songs", song.id);
      onDone();
      toastWithUndo(t("playlist.deleted"), () => restoreDayOfItem(planId, "songs", song));
    } catch {
      toast.error(t("playlist.errors.delete"));
    }
  }

  return (
    <FormFrame
      title={song ? t("playlist.form.editTitle") : t("playlist.form.newTitle")}
      description={t("playlist.form.description")}
      busy={busy}
      onSubmit={() => void submit()}
      onCancel={onDone}
      onDelete={song ? () => void remove() : undefined}
      deleteLabel={t("playlist.form.delete")}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={momentId} className={FIELD_LABEL}>
          {t("playlist.form.fields.moment")}
        </Label>
        <Select value={moment} onValueChange={(v) => isPlaylistMoment(v) && setMoment(v)}>
          <SelectTrigger id={momentId} className={cn(SELECT_TRIGGER, "w-full")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            {PLAYLIST_MOMENTS.map((m) => (
              <SelectItem key={m} value={m} className={SELECT_ITEM}>
                {t(`playlist.moments.${m}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <TextField
        label={t("playlist.form.fields.title")}
        value={title}
        onChange={(v) => {
          setTitle(v);
          setErrors((e) => ({ ...e, title: undefined }));
        }}
        error={errors.title}
        required
        autoFocus={!song}
      />
      <TextField label={t("playlist.form.fields.artist")} value={artist} onChange={setArtist} />
      <TextField
        label={t("playlist.form.fields.url")}
        value={url}
        onChange={(v) => {
          setUrl(v);
          setErrors((e) => ({ ...e, url: undefined }));
        }}
        error={errors.url}
        hint={t("playlist.form.urlHint")}
        placeholder="https://"
        inputMode="url"
      />
      <fieldset className="flex flex-col gap-2">
        <legend className={cn(FIELD_LABEL, "mb-2")}>{t("playlist.form.fields.flag")}</legend>
        <div className="flex flex-wrap gap-2">
          {SONG_FLAGS.map((f) => (
            <label key={f} className={choicePill(flag === f)}>
              <input
                type="radio"
                name={flagName}
                value={f}
                checked={flag === f}
                onChange={() => setFlag(f)}
                className="sr-only"
              />
              {t(`playlist.form.flags.${f}`)}
            </label>
          ))}
        </div>
        <p className="text-sm text-ink-muted">{t(`playlist.form.flagHelp.${flag}`)}</p>
      </fieldset>
    </FormFrame>
  );
}
