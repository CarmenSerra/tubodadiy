"use client";

import * as React from "react";
import { SearchXIcon, UserPlusIcon, UsersIcon, UtensilsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CARD, CTA_SECONDARY, IconCircle, SECTION_TITLE } from "@/components/dashboard/ui";
import { DeleteIconButton } from "@/components/guests/brand-dialog";
import { EditGuestTrigger, GuestFormDialog } from "@/components/guests/guest-form-dialog";
import { GuestFilterBar } from "@/components/guests/guest-filter-bar";
import {
  GROUP_NONE,
  NO_FILTERS,
  companionName,
  filterGuests,
  hasUngrouped,
  listGroups,
  normalizeText,
  visibleNotes,
  type GuestFilters,
} from "@/components/guests/guest-filters";
import { GuestIdeas } from "@/components/ideas/guest-ideas";
import { GuestSummary, GuestsSkeleton } from "@/components/guests/guest-summary";
import { RsvpMenu, RsvpSegmented } from "@/components/guests/rsvp";
import { InvitationLink } from "@/components/invitation/invitation-link";
import { InvitationResponses } from "@/components/invitation/invitation-responses";
import { useCollection } from "@/lib/hooks/use-collection";
import { guestsQuery, mapGuest } from "@/lib/firebase/plans";
import { deleteGuest, restoreGuest, updateGuest } from "@/lib/firebase/mutations";
import type { Guest, RsvpStatus } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

export function GuestsList({
  planId,
  initialStatus,
}: {
  planId: string;
  /** Filtro de respuesta con el que se abre la lista (p. ej. «pendientes»). */
  initialStatus?: RsvpStatus;
}) {
  const { t } = useTranslation("guests");
  const { data: stored, loading } = useCollection(guestsQuery(planId), mapGuest);
  const [filters, setFilters] = React.useState<GuestFilters>(() =>
    initialStatus ? { ...NO_FILTERS, status: initialStatus } : NO_FILTERS
  );
  // Cambios de respuesta aún sin confirmar por Firestore: se ven al instante.
  const [pendingRsvp, setPendingRsvp] = React.useState<Record<string, RsvpStatus>>({});
  const [announcement, setAnnouncement] = React.useState("");

  const guests = React.useMemo(
    () =>
      stored.map((g) => (pendingRsvp[g.id] ? { ...g, rsvpStatus: pendingRsvp[g.id] } : g)),
    [stored, pendingRsvp]
  );
  const groups = React.useMemo(() => listGroups(guests), [guests]);
  const ungrouped = React.useMemo(() => hasUngrouped(guests), [guests]);

  // Si el grupo filtrado ya no existe (p. ej. se renombró), vuelve a "todos".
  const effective = React.useMemo<GuestFilters>(() => {
    const groupExists =
      filters.group === NO_FILTERS.group ||
      (filters.group === GROUP_NONE && ungrouped) ||
      groups.some((g) => normalizeText(g) === normalizeText(filters.group));
    return groupExists ? filters : { ...filters, group: NO_FILTERS.group };
  }, [filters, groups, ungrouped]);

  const visible = React.useMemo(() => filterGuests(guests, effective), [guests, effective]);

  async function handleRsvpChange(guest: Guest, status: RsvpStatus) {
    if (guest.rsvpStatus === status) return;
    setPendingRsvp((prev) => ({ ...prev, [guest.id]: status }));
    try {
      await updateGuest(planId, guest.id, { rsvpStatus: status });
      setAnnouncement(`${guest.name}: ${t(`rsvp.${status}`)}`);
    } catch {
      toast.error(t("list.rsvpError"));
    } finally {
      setPendingRsvp((prev) => {
        const next = { ...prev };
        delete next[guest.id];
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    // El invitado tal como está guardado (sin el cambio de respuesta aún pendiente).
    const guest = stored.find((g) => g.id === id);
    try {
      await deleteGuest(planId, id);
      if (guest) toastWithUndo(t("list.deleted"), () => restoreGuest(planId, guest));
      else toast.success(t("list.deleted"));
    } catch {
      toast.error(t("list.deleteError"));
    }
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div>
        <h2 className={SECTION_TITLE}>{t("list.title")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("list.description")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <InvitationLink planId={planId} />
        {!loading && guests.length > 0 && (
          <>
            <GuestFormDialog planId={planId} groups={groups} />
            <GuestIdeas planId={planId} groups={groups} align="end" />
          </>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <GuestsSkeleton />
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <InvitationResponses planId={planId} />
        <div className={cn(CARD, "flex flex-col items-center px-6 py-12 text-center sm:py-14")}>
          <IconCircle tone="sage" className="size-12 [&_svg]:size-6">
            <UsersIcon />
          </IconCircle>
          <h3 className="mt-4 font-display text-xl font-semibold text-ink">
            {t("list.empty.title")}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            {t("list.empty.text")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <GuestFormDialog planId={planId} />
            <GuestIdeas planId={planId} groups={groups} align="center" />
          </div>
        </div>
      </div>
    );
  }

  const clearFilters = () => setFilters(NO_FILTERS);

  return (
    <div className="flex flex-col gap-5">
      {header}
      <InvitationResponses planId={planId} />
      <GuestSummary guests={guests} />
      <GuestFilterBar
        filters={effective}
        onChange={setFilters}
        onClear={clearFilters}
        groups={groups}
        hasUngrouped={ungrouped}
        shown={visible.length}
        total={guests.length}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {visible.length === 0 ? (
        <div className={cn(CARD, "flex flex-col items-center px-6 py-10 text-center sm:py-12")}>
          <IconCircle tone="lilac" className="size-12 [&_svg]:size-6">
            <SearchXIcon />
          </IconCircle>
          <h3 className="mt-4 font-display text-xl font-semibold text-ink">
            {t("list.noMatches.title")}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            {t("list.noMatches.text")}
          </p>
          <button type="button" onClick={clearFilters} className={cn(CTA_SECONDARY, "mt-6")}>
            {t("filters.clear")}
          </button>
        </div>
      ) : (
        <>
          {/* Móvil: tarjetas */}
          <ul className="flex flex-col gap-3 md:hidden" aria-label={t("list.guests")}>
            {visible.map((guest) => (
              <li key={guest.id} className={cn(CARD, "flex flex-col gap-3 p-4")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-display text-lg font-semibold leading-snug text-ink-strong">
                      {guest.name}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">{guest.groupName || t("list.noGroup")}</p>
                  </div>
                  <div className="-mr-2 -mt-1 flex shrink-0">
                    <GuestFormDialog
                      planId={planId}
                      guest={guest}
                      groups={groups}
                      trigger={<EditGuestTrigger guestName={guest.name} />}
                    />
                    <DeleteIconButton
                      ariaLabel={t("list.deleteGuest", { name: guest.name })}
                      onDelete={() => handleDelete(guest.id)}
                    />
                  </div>
                </div>
                {(guest.plusOne || guest.dietaryNotes || visibleNotes(guest)) && (
                  <div className="flex flex-col gap-1.5 text-sm text-ink-muted">
                    {guest.plusOne && (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lilac-soft px-2.5 py-0.5 text-xs font-medium text-ink">
                        <UserPlusIcon className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 break-words">
                          {t("form.plusOne")}
                          {companionName(guest) && <>: {companionName(guest)}</>}
                        </span>
                      </span>
                    )}
                    {guest.dietaryNotes && (
                      <span className="flex items-start gap-1.5">
                        <UtensilsIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 break-words">
                          <span className="sr-only">{t("list.dietaryPrefix")} </span>
                          {guest.dietaryNotes}
                        </span>
                      </span>
                    )}
                    {visibleNotes(guest) && <span className="break-words">{visibleNotes(guest)}</span>}
                  </div>
                )}
                <RsvpSegmented
                  name={guest.name}
                  value={guest.rsvpStatus}
                  onChange={(status) => handleRsvpChange(guest, status)}
                />
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <div className={cn(CARD, "hidden overflow-hidden md:block")}>
            <table className="w-full text-sm">
              <caption className="sr-only">{t("list.title")}</caption>
              <thead className="bg-page text-left text-xs font-medium text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    {t("list.columns.name")}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    {t("list.columns.group")}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    {t("list.columns.response")}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    {t("list.columns.companion")}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    {t("list.columns.dietary")}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    <span className="sr-only">{t("list.columns.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((guest) => (
                  <tr key={guest.id} className="border-t border-line transition-colors hover:bg-page/60">
                    <td className="max-w-64 px-5 py-3 align-middle">
                      <p className="break-words font-medium text-ink-strong">{guest.name}</p>
                      {visibleNotes(guest) && (
                        <p className="mt-0.5 line-clamp-1 break-words text-xs text-ink-muted" title={visibleNotes(guest)}>
                          {visibleNotes(guest)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle text-ink-muted">
                      {guest.groupName || <span aria-label={t("list.noGroup")}>—</span>}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <RsvpMenu
                        name={guest.name}
                        value={guest.rsvpStatus}
                        onChange={(status) => handleRsvpChange(guest, status)}
                      />
                    </td>
                    <td className="max-w-48 px-3 py-3 align-middle text-ink-muted">
                      {guest.plusOne ? (
                        <span className="break-words">
                          <span className="font-medium text-ink-strong">{t("list.yes")}</span>
                          {companionName(guest) && <> · {companionName(guest)}</>}
                        </span>
                      ) : (
                        t("list.no")
                      )}
                    </td>
                    <td className="max-w-56 px-3 py-3 align-middle text-ink-muted">
                      {guest.dietaryNotes ? (
                        <span className="break-words">{guest.dietaryNotes}</span>
                      ) : (
                        <span aria-label={t("list.noNotes")}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex justify-end">
                        <GuestFormDialog
                          planId={planId}
                          guest={guest}
                          groups={groups}
                          trigger={<EditGuestTrigger guestName={guest.name} />}
                        />
                        <DeleteIconButton
                          ariaLabel={t("list.deleteGuest", { name: guest.name })}
                          onDelete={() => handleDelete(guest.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
