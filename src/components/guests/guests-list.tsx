"use client";

import * as React from "react";
import { BedDoubleIcon, BusIcon, GiftIcon, ListIcon, SearchXIcon, UserPlusIcon, UsersIcon, UtensilsIcon, UtensilsCrossedIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CARD, CTA_SECONDARY, IconCircle, SECTION_TITLE } from "@/components/dashboard/ui";
import { DeleteIconButton } from "@/components/guests/brand-dialog";
import { DietBadges } from "@/components/diet-icons";
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
import { GuestNeeds } from "@/components/guests/guest-needs";
import { GuestThanks } from "@/components/guests/guest-thanks";
import { hasGift, listHouseholds, sectionGuests, thankUnits, type GroupBy, type GuestSection } from "@/components/guests/guest-model";
import { GuestIdeas } from "@/components/ideas/guest-ideas";
import { GuestSummary, GuestsSkeleton } from "@/components/guests/guest-summary";
import { RsvpMenu, RsvpSegmented } from "@/components/guests/rsvp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvitationLink } from "@/components/invitation/invitation-link";
import { InvitationResponses } from "@/components/invitation/invitation-responses";
import { GuestsExportButton } from "@/components/export/export-buttons";
import { useCollection } from "@/lib/hooks/use-collection";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import { guestsQuery, mapGuest } from "@/lib/firebase/plans";
import { deleteGuest, restoreGuest, updateGuest } from "@/lib/firebase/mutations";
import type { DietId } from "@/lib/diets";
import type { Guest, RsvpStatus } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

const VIEWS = [
  { value: "list", icon: ListIcon },
  { value: "needs", icon: UtensilsCrossedIcon },
  { value: "gifts", icon: GiftIcon },
] as const;
type View = (typeof VIEWS)[number]["value"];

function isView(value: string): value is View {
  return VIEWS.some((v) => v.value === value);
}

/** Lo que necesita un invitado además de comer: alojamiento y transporte, en dos pastillas. */
function NeedChips({ guest }: { guest: Guest }) {
  const { t } = useTranslation("guests");
  if (!guest.needsLodging && !guest.needsTransport) return null;
  const chip = "inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-lilac-soft px-2.5 py-0.5 text-xs font-medium text-ink";
  return (
    <span className="flex flex-wrap gap-1.5">
      {guest.needsLodging && (
        <span className={chip}>
          <BedDoubleIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            {t("list.lodging")}
            {guest.lodgingPlace && <>: {guest.lodgingPlace}</>}
          </span>
        </span>
      )}
      {guest.needsTransport && (
        <span className={chip}>
          <BusIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            {t("list.transport")}
            {guest.transportFrom && <>: {guest.transportFrom}</>}
          </span>
        </span>
      )}
    </span>
  );
}

export function GuestsList({
  planId,
  initialStatus,
}: {
  planId: string;
  /** Filtro de respuesta con el que se abre la lista (p. ej. «pendientes»). */
  initialStatus?: RsvpStatus;
}) {
  const { t } = useTranslation("guests");
  const { canEdit } = usePlanPermission("guests");
  // El botón «Invitación» lleva a otra pestaña: solo si se puede ver.
  const { canView: canViewInvitation } = usePlanPermission("invitation");
  const { data: stored, loading } = useCollection(guestsQuery(planId), mapGuest);
  const [filters, setFilters] = React.useState<GuestFilters>(() =>
    initialStatus ? { ...NO_FILTERS, status: initialStatus } : NO_FILTERS
  );
  // Cambios de respuesta aún sin confirmar por Firestore: se ven al instante.
  const [pendingRsvp, setPendingRsvp] = React.useState<Record<string, RsvpStatus>>({});
  const [announcement, setAnnouncement] = React.useState("");
  const [view, setView] = React.useState<View>("list");
  const [groupBy, setGroupBy] = React.useState<GroupBy>("none");

  const guests = React.useMemo(
    () =>
      stored.map((g) => (pendingRsvp[g.id] ? { ...g, rsvpStatus: pendingRsvp[g.id] } : g)),
    [stored, pendingRsvp]
  );
  const groups = React.useMemo(() => listGroups(guests), [guests]);
  const ungrouped = React.useMemo(() => hasUngrouped(guests), [guests]);
  const households = React.useMemo(() => listHouseholds(guests), [guests]);
  const hasDiets = React.useMemo(() => guests.some((g) => g.dietIds.length > 0), [guests]);
  const pendingThanks = React.useMemo(() => thankUnits(guests).filter((u) => !u.sent).length, [guests]);

  // Si el grupo filtrado ya no existe (p. ej. se renombró), vuelve a "todos".
  const effective = React.useMemo<GuestFilters>(() => {
    const groupExists =
      filters.group === NO_FILTERS.group ||
      (filters.group === GROUP_NONE && ungrouped) ||
      groups.some((g) => normalizeText(g) === normalizeText(filters.group));
    return groupExists ? filters : { ...filters, group: NO_FILTERS.group };
  }, [filters, groups, ungrouped]);

  const visible = React.useMemo(() => filterGuests(guests, effective), [guests, effective]);
  const sections = React.useMemo(() => sectionGuests(visible, groupBy), [visible, groupBy]);

  function showDiet(id: DietId) {
    setFilters({ ...NO_FILTERS, diet: id });
    setView("list");
  }

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
        {canViewInvitation && <InvitationLink planId={planId} />}
        {!loading && guests.length > 0 && (
          <>
            <GuestsExportButton planId={planId} guests={guests} />
            {canEdit && (
              <>
                <GuestFormDialog planId={planId} groups={groups} households={households} />
                <GuestIdeas planId={planId} groups={groups} align="end" />
              </>
            )}
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
          {canEdit && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <GuestFormDialog planId={planId} households={households} />
              <GuestIdeas planId={planId} groups={groups} align="center" />
            </div>
          )}
        </div>
      </div>
    );
  }

  const clearFilters = () => setFilters(NO_FILTERS);

  return (
    <div className="flex flex-col gap-5">
      {header}

      <Tabs value={view} onValueChange={(v) => isView(v) && setView(v)} className="gap-5">
        <TabsList
          aria-label={t("views.label")}
          className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl bg-surface p-1.5 shadow-pop ring-1 ring-line"
        >
          {VIEWS.map(({ value, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "min-h-14 flex-col gap-1 rounded-xl px-1 py-2 text-xs font-medium text-ink-muted sm:min-h-12 sm:flex-row sm:gap-2 sm:text-sm",
                "hover:text-ink data-[state=active]:bg-cta data-[state=active]:text-on-cta data-[state=active]:shadow-pop",
                "outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              )}
            >
              <Icon aria-hidden="true" className="size-5 sm:size-4" />
              {t(`views.${value}`)}
              {value === "gifts" && pendingThanks > 0 && (
                <span className="rounded-full bg-lilac-soft px-1.5 text-xs font-semibold text-ink">
                  <span className="sr-only">{t("views.pendingThanks", { count: pendingThanks })}</span>
                  <span aria-hidden="true">{pendingThanks}</span>
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="list" className="flex flex-col gap-5">
          <InvitationResponses planId={planId} />
          <GuestSummary guests={guests} />
          <GuestFilterBar
            filters={effective}
            onChange={setFilters}
            onClear={clearFilters}
            groups={groups}
            hasUngrouped={ungrouped}
            hasDiets={hasDiets}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            shown={visible.length}
            total={guests.length}
          />

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
              <div className="flex flex-col gap-5 md:hidden">
                {sections.map((section) => (
                  <section
                    key={section.key || "__none__"}
                    aria-label={sectionLabel(section, groupBy) ?? t("list.guests")}
                    className="flex flex-col gap-3"
                  >
                    <SectionTitle section={section} groupBy={groupBy} />
                    <ul className="flex flex-col gap-3">
                      {section.guests.map((guest) => (
                        <MobileCard
                          key={guest.id}
                          guest={guest}
                          planId={planId}
                          groups={groups}
                          households={households}
                          canEdit={canEdit}
                          onRsvp={handleRsvpChange}
                          onDelete={handleDelete}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

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
                  {sections.map((section) => (
                    <tbody key={section.key || "__none__"}>
                      {groupBy !== "none" && (
                        <tr className="border-t border-line bg-lilac-soft">
                          <th scope="colgroup" colSpan={6} className="px-5 py-2 text-left">
                            <SectionTitle section={section} groupBy={groupBy} />
                          </th>
                        </tr>
                      )}
                      {section.guests.map((guest) => (
                        <TableRow
                          key={guest.id}
                          guest={guest}
                          planId={planId}
                          groups={groups}
                          households={households}
                          canEdit={canEdit}
                          onRsvp={handleRsvpChange}
                          onDelete={handleDelete}
                        />
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="needs">
          <GuestNeeds guests={guests} onFilterDiet={showDiet} />
        </TabsContent>

        <TabsContent value="gifts">
          <GuestThanks planId={planId} guests={guests} canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function sectionLabel(section: GuestSection, groupBy: GroupBy): string | null {
  if (groupBy === "none") return null;
  return section.label;
}

/** Título de una sección agrupada: nombre del grupo o familia (o «Sin grupo» / «Sin familia») y cuántos son. */
function SectionTitle({ section, groupBy }: { section: GuestSection; groupBy: GroupBy }) {
  const { t } = useTranslation("guests");
  if (groupBy === "none") return null;
  return (
    <h3 className="flex flex-wrap items-baseline gap-x-2 font-display text-base font-semibold text-ink">
      <span className="min-w-0 break-words">
        {section.label ?? (groupBy === "group" ? t("list.noGroup") : t("list.noHousehold"))}
      </span>
      <span className="text-sm font-normal text-ink-muted">{t("filters.total", { count: section.guests.length })}</span>
    </h3>
  );
}

interface RowProps {
  guest: Guest;
  planId: string;
  groups: string[];
  households: string[];
  /** Solo ver: sin editar, borrar ni cambiar la respuesta. */
  canEdit: boolean;
  onRsvp: (guest: Guest, status: RsvpStatus) => void;
  onDelete: (id: string) => void;
}

function MobileCard({ guest, planId, groups, households, canEdit, onRsvp, onDelete }: RowProps) {
  const { t } = useTranslation("guests");
  const meta = [guest.groupName.trim() || t("list.noGroup"), guest.householdName.trim()].filter(Boolean).join(" · ");
  const hasExtras =
    guest.plusOne || guest.dietIds.length > 0 || guest.dietaryNotes || guest.needsLodging || guest.needsTransport || visibleNotes(guest);
  return (
    <li className={cn(CARD, "flex flex-col gap-3 p-4")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-display text-lg font-semibold leading-snug text-ink-strong">
            {guest.name}
          </p>
          <p className="mt-0.5 break-words text-sm text-ink-muted">{meta}</p>
        </div>
        {canEdit && (
          <div className="-mr-2 -mt-1 flex shrink-0">
            <GuestFormDialog
              planId={planId}
              guest={guest}
              groups={groups}
              households={households}
              trigger={<EditGuestTrigger guestName={guest.name} />}
            />
            <DeleteIconButton
              ariaLabel={t("list.deleteGuest", { name: guest.name })}
              onDelete={() => onDelete(guest.id)}
            />
          </div>
        )}
      </div>
      {hasExtras && (
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
          <DietBadges ids={guest.dietIds} />
          {guest.dietaryNotes && (
            <span className="flex items-start gap-1.5">
              <UtensilsIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">
                <span className="sr-only">{t("list.dietaryPrefix")} </span>
                {guest.dietaryNotes}
              </span>
            </span>
          )}
          <NeedChips guest={guest} />
          {hasGift(guest) && (
            <span className="inline-flex w-fit items-center gap-1.5 text-xs">
              <GiftIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {guest.thankYouSent ? t("list.giftThanked") : t("list.giftPending")}
            </span>
          )}
          {visibleNotes(guest) && <span className="break-words">{visibleNotes(guest)}</span>}
        </div>
      )}
      <RsvpSegmented
        name={guest.name}
        value={guest.rsvpStatus}
        onChange={(status) => onRsvp(guest, status)}
        readOnly={!canEdit}
      />
    </li>
  );
}

function TableRow({ guest, planId, groups, households, canEdit, onRsvp, onDelete }: RowProps) {
  const { t } = useTranslation("guests");
  return (
    <tr className="border-t border-line transition-colors hover:bg-page/60">
      <td className="max-w-64 px-5 py-3 align-middle">
        <p className="break-words font-medium text-ink-strong">{guest.name}</p>
        {guest.householdName.trim() && (
          <p className="mt-0.5 break-words text-xs text-ink-muted">{guest.householdName.trim()}</p>
        )}
        {visibleNotes(guest) && (
          <p className="mt-0.5 line-clamp-1 break-words text-xs text-ink-muted" title={visibleNotes(guest)}>
            {visibleNotes(guest)}
          </p>
        )}
        {(guest.needsLodging || guest.needsTransport) && (
          <div className="mt-1.5">
            <NeedChips guest={guest} />
          </div>
        )}
      </td>
      <td className="px-3 py-3 align-middle text-ink-muted">
        {guest.groupName || <span aria-label={t("list.noGroup")}>—</span>}
      </td>
      <td className="px-3 py-3 align-middle">
        <RsvpMenu
          name={guest.name}
          value={guest.rsvpStatus}
          onChange={(status) => onRsvp(guest, status)}
          readOnly={!canEdit}
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
        {guest.dietIds.length > 0 || guest.dietaryNotes ? (
          <div className="flex flex-col gap-1.5">
            <DietBadges ids={guest.dietIds} />
            {guest.dietaryNotes && <span className="break-words">{guest.dietaryNotes}</span>}
          </div>
        ) : (
          <span aria-label={t("list.noNotes")}>—</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle">
        {canEdit && (
          <div className="flex justify-end">
            <GuestFormDialog
              planId={planId}
              guest={guest}
              groups={groups}
              households={households}
              trigger={<EditGuestTrigger guestName={guest.name} />}
            />
            <DeleteIconButton
              ariaLabel={t("list.deleteGuest", { name: guest.name })}
              onDelete={() => onDelete(guest.id)}
            />
          </div>
        )}
      </td>
    </tr>
  );
}
