"use client";

import * as React from "react";
import { CheckCircle2Icon, CompassIcon, ExternalLinkIcon, HeartIcon, MapPinIcon, StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, FOCUS } from "@/components/dashboard/ui";
import { DeleteIconButton } from "@/components/guests/brand-dialog";
import {
  DestinationFormDialog,
  EditDestinationTrigger,
} from "@/components/honeymoon/destination-form-dialog";
import { DestinationScene } from "@/components/honeymoon/motifs";
import { EmptyState, HM_CARD, SectionHeader } from "@/components/honeymoon/ui";
import {
  deleteDestination,
  restoreDestination,
  setChosenDestination,
  setDestinationVote,
} from "@/lib/firebase/honeymoon";
import { isHttpUrl, sceneFor, urlHost, type Destination } from "@/lib/honeymoon-model";
import { useLanguage } from "@/lib/i18n/provider";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";

/** Miniatura: la imagen si hay URL (y carga) o un dibujo estable por nombre. */
function Thumb({ dest }: { dest: Destination }) {
  const { t } = useTranslation("honeymoon");
  const uid = React.useId().replace(/:/g, "");
  const url = dest.imageUrl.trim();
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const showImage = isHttpUrl(url) && failedUrl !== url;
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-lilac-soft">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- dominios remotos libres: no se puede usar next/image
        <img
          src={url}
          alt={t("destinations.imageAlt", { name: dest.name })}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
          className="h-full w-full object-cover"
        />
      ) : (
        <DestinationScene variant={sceneFor(dest.name)} uid={uid} />
      )}
    </div>
  );
}

function DestinationCard({
  planId,
  dest,
  uid,
  topVoted,
  chosenIds,
  announce,
}: {
  planId: string;
  dest: Destination;
  uid: string;
  topVoted: boolean;
  chosenIds: string[];
  announce: (message: string) => void;
}) {
  const { t } = useTranslation("honeymoon");
  const { lang } = useLanguage();
  const { canEdit } = usePlanPermission("honeymoon");

  const voted = dest.votes.includes(uid);
  const votes = dest.votes.length;

  async function handleVote() {
    try {
      await setDestinationVote(planId, dest.id, uid, !voted);
      announce(!voted ? t("destinations.announce.liked", { name: dest.name }) : t("destinations.announce.unliked", { name: dest.name }));
    } catch {
      toast.error(t("destinations.errors.vote"));
    }
  }

  async function handleChoose() {
    const previous = chosenIds.find((id) => id !== dest.id) ?? null;
    try {
      if (dest.chosen) {
        await setChosenDestination(planId, null, chosenIds);
        toast.success(t("destinations.toasts.unchosen", { name: dest.name }));
        announce(t("destinations.toasts.unchosen", { name: dest.name }));
      } else {
        await setChosenDestination(planId, dest.id, chosenIds);
        toastWithUndo(t("destinations.toasts.chosen", { name: dest.name }), () => setChosenDestination(planId, previous, [dest.id]));
        announce(t("destinations.toasts.chosen", { name: dest.name }));
      }
    } catch {
      toast.error(t("destinations.errors.choose"));
    }
  }

  async function handleDelete() {
    try {
      await deleteDestination(planId, dest.id);
      toastWithUndo(t("destinations.toasts.deleted"), () => restoreDestination(planId, dest));
      announce(t("destinations.announce.deleted", { name: dest.name }));
    } catch {
      toast.error(t("destinations.errors.delete"));
    }
  }

  const link = isHttpUrl(dest.link) ? dest.link : "";

  return (
    <li
      className={cn(
        HM_CARD,
        "group/card flex flex-col overflow-hidden",
        dest.chosen && "ring-2 ring-deep ring-offset-2 ring-offset-page"
      )}
    >
      <div className="relative">
        <Thumb dest={dest} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {dest.chosen && (
            <span className="inline-flex items-center gap-1 rounded-full bg-deep px-2.5 py-1 text-xs font-semibold text-on-solid shadow-pop">
              <CheckCircle2Icon aria-hidden="true" className="size-3.5" />
              {t("destinations.badges.chosen")}
            </span>
          )}
          {topVoted && !dest.chosen && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-pop">
              <StarIcon aria-hidden="true" className="size-3.5 fill-current" />
              {t("destinations.badges.topVoted")}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="break-words font-display text-xl font-semibold leading-snug text-ink-strong">{dest.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            {dest.country && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon aria-hidden="true" className="size-3.5" />
                {dest.country}
              </span>
            )}
            {dest.approxPrice != null && (
              <span className="font-medium text-ink">
                <span className="sr-only">{t("destinations.approxPrice")} </span>≈ {formatCurrency(dest.approxPrice, lang)}
              </span>
            )}
          </div>
        </div>

        {dest.notes && <p className="whitespace-pre-line break-words text-sm text-ink">{dest.notes}</p>}

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              FOCUS,
              "inline-flex w-fit max-w-full items-center gap-1.5 rounded-md text-sm font-medium text-green underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80"
            )}
          >
            <span className="truncate">{urlHost(link)}</span>
            <ExternalLinkIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="sr-only">{t("destinations.newTab")}</span>
          </a>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-3">
          {canEdit ? (
          <button
            type="button"
            aria-pressed={voted}
            aria-label={t(voted ? "destinations.voteAriaMine" : "destinations.voteAria", { name: dest.name, count: votes })}
            onClick={handleVote}
            className={cn(
              FOCUS,
              "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors motion-reduce:transition-none",
              voted ? "bg-cta text-on-cta" : "bg-lilac-soft text-ink hover:bg-lilac-mid"
            )}
          >
            <HeartIcon aria-hidden="true" className={cn("size-4", voted && "fill-current")} />
            <span aria-hidden="true">{votes}</span>
          </button>
          ) : (
            <span
              role="img"
              aria-label={t("destinations.votesAria", { name: dest.name, count: votes })}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-lilac-soft px-3.5 text-sm font-medium text-ink"
            >
              <HeartIcon aria-hidden="true" className="size-4" />
              <span aria-hidden="true">{votes}</span>
            </span>
          )}
          {canEdit && (
          <>
          <button
            type="button"
            onClick={handleChoose}
            className={cn(
              FOCUS,
              "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors motion-reduce:transition-none",
              dest.chosen
                ? "bg-deep text-on-solid hover:opacity-90"
                : "bg-btn-soft text-ink-on-lilac hover:opacity-90"
            )}
          >
            <CheckCircle2Icon aria-hidden="true" className="size-4" />
            {dest.chosen ? t("destinations.actions.unchoose") : t("destinations.actions.choose")}
          </button>
          <div className="-mr-2 ml-auto flex">
            <DestinationFormDialog
              planId={planId}
              destination={dest}
              trigger={<EditDestinationTrigger name={dest.name} />}
            />
            <DeleteIconButton ariaLabel={t("destinations.actions.deleteAria", { name: dest.name })} onDelete={handleDelete} />
          </div>
          </>
          )}
        </div>
      </div>
    </li>
  );
}

export function Destinations({
  planId,
  uid,
  destinations,
  announce,
}: {
  planId: string;
  uid: string;
  destinations: Destination[];
  announce: (message: string) => void;
}) {
  const { t } = useTranslation("honeymoon");
  const { canEdit } = usePlanPermission("honeymoon");
  const chosenIds = React.useMemo(() => destinations.filter((d) => d.chosen).map((d) => d.id), [destinations]);
  const maxVotes = Math.max(0, ...destinations.map((d) => d.votes.length));

  return (
    <section aria-labelledby="hm-destinos-title" className="flex flex-col gap-4">
      <SectionHeader
        id="hm-destinos-title"
        icon={<CompassIcon />}
        title={t("destinations.title")}
        description={t("destinations.description")}
        actions={canEdit && destinations.length > 0 ? <DestinationFormDialog planId={planId} /> : undefined}
      />

      {destinations.length === 0 ? (
        <EmptyState
          scene="playa"
          title={t("destinations.empty.title")}
          action={
            canEdit ? (
              <DestinationFormDialog planId={planId} trigger={<button type="button" className={CTA_PRIMARY}>{t("destinations.empty.action")}</button>} />
            ) : undefined
          }
        >
          {t("destinations.empty.text")}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("destinations.listLabel")}>
          {destinations.map((dest) => (
            <DestinationCard
              key={dest.id}
              planId={planId}
              dest={dest}
              uid={uid}
              topVoted={maxVotes > 0 && dest.votes.length === maxVotes && destinations.filter((d) => d.votes.length === maxVotes).length === 1}
              chosenIds={chosenIds}
              announce={announce}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
