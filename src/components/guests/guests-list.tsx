"use client";

import * as React from "react";
import { SearchXIcon, UserPlusIcon, UsersIcon, UtensilsIcon } from "lucide-react";
import { toast } from "sonner";

import { CARD, CTA_SECONDARY, IconCircle, SECTION_TITLE } from "@/components/dashboard/ui";
import { ConfirmDeleteButton } from "@/components/guests/brand-dialog";
import { EditGuestTrigger, GuestFormDialog } from "@/components/guests/guest-form-dialog";
import { GuestFilterBar } from "@/components/guests/guest-filter-bar";
import {
  GROUP_NONE,
  NO_FILTERS,
  filterGuests,
  hasUngrouped,
  listGroups,
  normalizeText,
  type GuestFilters,
} from "@/components/guests/guest-filters";
import { GuestIdeas } from "@/components/ideas/guest-ideas";
import { GuestSummary, GuestsSkeleton } from "@/components/guests/guest-summary";
import { RSVP_CONFIG, RsvpMenu, RsvpSegmented } from "@/components/guests/rsvp";
import { useCollection } from "@/lib/hooks/use-collection";
import { guestsQuery, mapGuest } from "@/lib/firebase/plans";
import { deleteGuest, updateGuest } from "@/lib/firebase/mutations";
import type { Guest, RsvpStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GuestsList({
  planId,
  initialStatus,
}: {
  planId: string;
  /** Filtro de respuesta con el que se abre la lista (p. ej. «pendientes»). */
  initialStatus?: RsvpStatus;
}) {
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
      setAnnouncement(`${guest.name}: ${RSVP_CONFIG[status].label}`);
    } catch {
      toast.error("No se ha podido cambiar la respuesta. Inténtalo de nuevo.");
    } finally {
      setPendingRsvp((prev) => {
        const next = { ...prev };
        delete next[guest.id];
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteGuest(planId, id);
      toast.success("Invitado eliminado");
    } catch {
      toast.error("No se ha podido eliminar el invitado.");
    }
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div>
        <h2 className={SECTION_TITLE}>Lista de invitados</h2>
        <p className="mt-1 text-sm text-ink-muted">Quién viene, quién falta por contestar y qué necesita cada persona.</p>
      </div>
      {!loading && guests.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <GuestFormDialog planId={planId} groups={groups} />
          <GuestIdeas planId={planId} groups={groups} align="end" />
        </div>
      )}
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
        <div className={cn(CARD, "flex flex-col items-center px-6 py-12 text-center sm:py-14")}>
          <IconCircle tone="sage" className="size-12 [&_svg]:size-6">
            <UsersIcon />
          </IconCircle>
          <h3 className="mt-4 font-display text-xl font-semibold text-ink">
            Tu lista de invitados empieza aquí
          </h3>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            Añade a las personas que no pueden faltar y ve apuntando quién confirma, quién lleva
            acompañante y qué necesita cada uno. Sin prisa.
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
            No encontramos a nadie con esos filtros
          </h3>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            Prueba con otro nombre o quita algún filtro para volver a ver tu lista completa.
          </p>
          <button type="button" onClick={clearFilters} className={cn(CTA_SECONDARY, "mt-6")}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          {/* Móvil: tarjetas */}
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Invitados">
            {visible.map((guest) => (
              <li key={guest.id} className={cn(CARD, "flex flex-col gap-3 p-4")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-display text-lg font-semibold leading-snug text-ink-strong">
                      {guest.name}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">{guest.groupName || "Sin grupo"}</p>
                  </div>
                  <div className="-mr-2 -mt-1 flex shrink-0">
                    <GuestFormDialog
                      planId={planId}
                      guest={guest}
                      groups={groups}
                      trigger={<EditGuestTrigger guestName={guest.name} />}
                    />
                    <ConfirmDeleteButton
                      itemLabel={`a ${guest.name}`}
                      ariaLabel={`Eliminar a ${guest.name}`}
                      onConfirm={() => handleDelete(guest.id)}
                    />
                  </div>
                </div>
                {(guest.plusOne || guest.dietaryNotes || guest.notes) && (
                  <div className="flex flex-col gap-1.5 text-sm text-ink-muted">
                    {guest.plusOne && (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lilac-soft px-2.5 py-0.5 text-xs font-medium text-ink">
                        <UserPlusIcon className="size-3.5" aria-hidden="true" />
                        Lleva acompañante
                      </span>
                    )}
                    {guest.dietaryNotes && (
                      <span className="flex items-start gap-1.5">
                        <UtensilsIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 break-words">
                          <span className="sr-only">Notas dietéticas: </span>
                          {guest.dietaryNotes}
                        </span>
                      </span>
                    )}
                    {guest.notes && <span className="break-words">{guest.notes}</span>}
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
              <caption className="sr-only">Lista de invitados</caption>
              <thead className="bg-page text-left text-xs font-medium text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Nombre
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Grupo
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Respuesta
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Acompañante
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Notas dietéticas
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((guest) => (
                  <tr key={guest.id} className="border-t border-line transition-colors hover:bg-page/60">
                    <td className="max-w-64 px-5 py-3 align-middle">
                      <p className="break-words font-medium text-ink-strong">{guest.name}</p>
                      {guest.notes && (
                        <p className="mt-0.5 line-clamp-1 break-words text-xs text-ink-muted" title={guest.notes}>
                          {guest.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle text-ink-muted">
                      {guest.groupName || <span aria-label="Sin grupo">—</span>}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <RsvpMenu
                        name={guest.name}
                        value={guest.rsvpStatus}
                        onChange={(status) => handleRsvpChange(guest, status)}
                      />
                    </td>
                    <td className="px-3 py-3 align-middle text-ink-muted">{guest.plusOne ? "Sí" : "No"}</td>
                    <td className="max-w-56 px-3 py-3 align-middle text-ink-muted">
                      {guest.dietaryNotes ? (
                        <span className="break-words">{guest.dietaryNotes}</span>
                      ) : (
                        <span aria-label="Sin notas">—</span>
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
                        <ConfirmDeleteButton
                          itemLabel={`a ${guest.name}`}
                          ariaLabel={`Eliminar a ${guest.name}`}
                          onConfirm={() => handleDelete(guest.id)}
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
