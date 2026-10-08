"use client";

import * as React from "react";
import { CheckCircle2Icon, CompassIcon, ExternalLinkIcon, HeartIcon, MapPinIcon, StarIcon } from "lucide-react";
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
import { toastWithUndo } from "@/lib/undo-toast";
import { cn, formatCurrency } from "@/lib/utils";

/** Miniatura: la imagen si hay URL (y carga) o un dibujo estable por nombre. */
function Thumb({ dest }: { dest: Destination }) {
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
          alt={`Imagen de ${dest.name}`}
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
  const voted = dest.votes.includes(uid);
  const votes = dest.votes.length;

  async function handleVote() {
    try {
      await setDestinationVote(planId, dest.id, uid, !voted);
      announce(!voted ? `Te gusta «${dest.name}»` : `Ya no te gusta «${dest.name}»`);
    } catch {
      toast.error("No se ha podido guardar tu voto.");
    }
  }

  async function handleChoose() {
    const previous = chosenIds.find((id) => id !== dest.id) ?? null;
    try {
      if (dest.chosen) {
        await setChosenDestination(planId, null, chosenIds);
        toast.success(`«${dest.name}» ya no es el destino elegido`);
        announce(`«${dest.name}» ya no es el destino elegido`);
      } else {
        await setChosenDestination(planId, dest.id, chosenIds);
        toastWithUndo(`«${dest.name}» elegido como destino`, () => setChosenDestination(planId, previous, [dest.id]));
        announce(`«${dest.name}» elegido como destino`);
      }
    } catch {
      toast.error("No se ha podido cambiar el destino elegido.");
    }
  }

  async function handleDelete() {
    try {
      await deleteDestination(planId, dest.id);
      toastWithUndo("Destino eliminado", () => restoreDestination(planId, dest));
      announce(`Destino «${dest.name}» eliminado`);
    } catch {
      toast.error("No se ha podido eliminar el destino.");
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
              Elegido
            </span>
          )}
          {topVoted && !dest.chosen && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-pop">
              <StarIcon aria-hidden="true" className="size-3.5 fill-current" />
              Más votado
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
                <span className="sr-only">Precio aproximado: </span>≈ {formatCurrency(dest.approxPrice)}
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
            <span className="sr-only">(se abre en una pestaña nueva)</span>
          </a>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-3">
          <button
            type="button"
            aria-pressed={voted}
            aria-label={`Me gusta «${dest.name}». ${votes} ${votes === 1 ? "voto" : "votos"}${voted ? ", incluido el tuyo" : ""}`}
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
            {dest.chosen ? "Quitar elección" : "Elegir"}
          </button>
          <div className="-mr-2 ml-auto flex">
            <DestinationFormDialog
              planId={planId}
              destination={dest}
              trigger={<EditDestinationTrigger name={dest.name} />}
            />
            <DeleteIconButton ariaLabel={`Eliminar «${dest.name}»`} onDelete={handleDelete} />
          </div>
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
  const chosenIds = React.useMemo(() => destinations.filter((d) => d.chosen).map((d) => d.id), [destinations]);
  const maxVotes = Math.max(0, ...destinations.map((d) => d.votes.length));

  return (
    <section aria-labelledby="hm-destinos-title" className="flex flex-col gap-4">
      <SectionHeader
        id="hm-destinos-title"
        icon={<CompassIcon />}
        title="Destinos e ideas"
        description="Reúne los sitios que te ilusionan, vota y elige uno."
        actions={destinations.length > 0 ? <DestinationFormDialog planId={planId} /> : undefined}
      />

      {destinations.length === 0 ? (
        <EmptyState
          scene="playa"
          title="Aún no hay destinos en la lista"
          action={<DestinationFormDialog planId={planId} trigger={<button type="button" className={CTA_PRIMARY}>Añadir el primer destino</button>} />}
        >
          Apunta playas, ciudades o rutas con las que sueñas. Cada persona del plan puede votar con un corazón y,
          cuando lo tengas claro, marca uno como elegido.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Destinos candidatos">
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
