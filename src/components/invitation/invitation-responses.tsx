"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDownIcon, MailCheckIcon, MessageSquareQuoteIcon, UserPlusIcon, UtensilsIcon } from "lucide-react";

import { CARD, IconCircle } from "@/components/dashboard/ui";
import { ROW_FOCUS } from "@/components/guests/brand-dialog";
import type { RsvpRecord } from "@/components/invitation/invitation-model";
import { mapRsvp, rsvpsQuery } from "@/lib/firebase/invitation";
import { useCollection } from "@/lib/hooks/use-collection";
import { cn } from "@/lib/utils";

const PREVIEW_COUNT = 3;

/**
 * Últimas respuestas llegadas por el enlace de la invitación. Compacto: tres a
 * la vista y el resto desplegable. No se pinta si todavía no ha respondido nadie.
 */
export function InvitationResponses({ planId }: { planId: string }) {
  const { data, loading, error } = useCollection(rsvpsQuery(planId), mapRsvp);
  const [expanded, setExpanded] = React.useState(false);

  if (loading || error || data.length === 0) return null;

  const shown = expanded ? data : data.slice(0, PREVIEW_COUNT);
  const hidden = data.length - PREVIEW_COUNT;
  const yes = data.filter((r) => r.attending).length;

  return (
    <section aria-labelledby="invitation-responses-title" className={cn(CARD, "flex flex-col gap-3 p-4 sm:p-5")}>
      <div className="flex items-center gap-3">
        <IconCircle tone="lilac" className="size-9">
          <MailCheckIcon />
        </IconCircle>
        <div className="min-w-0 flex-1">
          <h3 id="invitation-responses-title" className="font-display text-base font-semibold leading-snug text-ink-strong">
            Respuestas de la invitación
          </h3>
          <p className="text-sm text-ink-muted">
            {data.length} {data.length === 1 ? "respuesta" : "respuestas"} · {yes} {yes === 1 ? "asiste" : "asisten"}
          </p>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-line">
        {shown.map((r) => (
          <ResponseRow key={r.id} response={r} />
        ))}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={cn(
            "inline-flex h-10 w-fit items-center gap-1.5 self-start rounded-full px-3 text-sm font-medium text-ink hover:bg-lilac-soft",
            ROW_FOCUS
          )}
        >
          {expanded ? "Ver menos" : `Ver ${hidden} más`}
          <ChevronDownIcon
            aria-hidden="true"
            className={cn("size-4 transition-transform motion-reduce:transition-none", expanded && "rotate-180")}
          />
        </button>
      )}
    </section>
  );
}

function ResponseRow({ response: r }: { response: RsvpRecord }) {
  const when = r.updatedAt ? formatDistanceToNow(r.updatedAt, { addSuffix: true, locale: es }) : "";
  return (
    <li className="flex flex-col gap-1.5 py-3 first:pt-1 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 break-words font-medium text-ink-strong">{r.name}</span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            r.attending ? "bg-sage-pale text-ink" : "bg-lilac-soft text-ink-muted dark:text-ink"
          )}
        >
          {r.attending ? "Asiste" : "No asiste"}
        </span>
        {when && <span className="ml-auto text-xs text-ink-muted">{when}</span>}
      </div>
      {(r.plusOne || r.dietary) && (
        <div className="flex flex-col gap-1 text-sm text-ink-muted">
          {r.plusOne && (
            <span className="flex items-start gap-1.5">
              <UserPlusIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">
                Con acompañante{r.plusOneName ? `: ${r.plusOneName}` : ""}
              </span>
            </span>
          )}
          {r.dietary && (
            <span className="flex items-start gap-1.5">
              <UtensilsIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{r.dietary}</span>
            </span>
          )}
        </div>
      )}
      {r.message && (
        <p className="flex items-start gap-1.5 text-sm text-ink">
          <MessageSquareQuoteIcon className="mt-0.5 size-4 shrink-0 text-lilac" aria-hidden="true" />
          <span className="min-w-0 whitespace-pre-line break-words">{r.message}</span>
        </p>
      )}
    </li>
  );
}
