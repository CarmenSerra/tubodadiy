"use client";

import * as React from "react";
import { CalendarPlusIcon, ClockIcon, MapPinIcon, PlusIcon, StoreIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  AppointmentForm,
  type AppointmentChange,
} from "@/components/appointments/appointment-form-dialog";
import {
  CATEGORY_INFO,
  dayNumber,
  formatLongDate,
  groupAppointments,
  monthShort,
  relativeDay,
} from "@/components/appointments/appointment-model";
import { Eucalyptus, Floret } from "@/components/brand/welcome-decorations";
import { CTA_PRIMARY, CTA_SECONDARY, Skeleton } from "@/components/dashboard/ui";
import { CHECKBOX, DIALOG_CONTENT, DeleteIconButton, EditIconButton } from "@/components/guests/brand-dialog";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { ignoreToastInteraction } from "@/components/timeline/use-timeline-undo";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlanContext } from "@/lib/context/plan-context";
import {
  appointmentsCollection,
  deleteAppointment,
  mapAppointment,
  restoreAppointment,
  updateAppointment,
  type Appointment,
  type AppointmentCategory,
} from "@/lib/firebase/appointments";
import { mapVendor, vendorsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { useLanguage } from "@/lib/i18n/provider";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

/** Pantalla completa en móvil; en escritorio, un diálogo grande con cabecera fija. */
const MODAL =
  "top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-surface p-0 outline-none " +
  "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-line";

/** Qué pide quien abre la agenda: ver la lista o empezar una cita de un tipo. */
export interface AppointmentsIntent {
  category?: AppointmentCategory;
}

/**
 * Un solo diálogo con dos vistas: la lista de citas y el formulario de una cita
 * (nueva o editada). Pasar de una a otra cambia el contenido, nunca apila un
 * segundo diálogo encima.
 */
type AgendaView = { kind: "list" } | { kind: "form"; item?: Appointment; category?: AppointmentCategory };

function initialView(intent: AppointmentsIntent | null): AgendaView {
  return intent?.category ? { kind: "form", category: intent.category } : { kind: "list" };
}

export function AppointmentsDialog({
  open,
  onOpenChange,
  intent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: AppointmentsIntent | null;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const restoreFocus = useRestoreFocus();
  const [view, setView] = React.useState<AgendaView>(() => initialView(intent));
  const [wasOpen, setWasOpen] = React.useState(open);

  // Cada vez que se abre, arranca en la vista que pide quien la abre (lista o formulario).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setView(initialView(intent));
  }

  const showList = view.kind === "list";
  // Volver a la lista desde el formulario: el foco pasa al diálogo (el botón que lo tenía ya no existe).
  const backToList = React.useCallback(() => {
    setView({ kind: "list" });
    contentRef.current?.focus();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        aria-describedby={undefined}
        className={showList ? MODAL : cn(DIALOG_CONTENT, "max-h-[calc(100dvh-1rem)] outline-none")}
        // El foco empieza en el propio diálogo (se anuncia su título); en el formulario, en el primer campo.
        onOpenAutoFocus={(event) => {
          restoreFocus.onOpenAutoFocus();
          if (showList) {
            event.preventDefault();
            contentRef.current?.focus();
          }
        }}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
        onInteractOutside={ignoreToastInteraction}
      >
        {open && <AppointmentsBody view={view} onView={setView} onBack={backToList} />}
      </DialogContent>
    </Dialog>
  );
}

function AppointmentsBody({
  view,
  onView,
  onBack,
}: {
  view: AgendaView;
  onView: (view: AgendaView) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("tools");
  const { planId } = usePlanContext();
  const appts = useCollection(appointmentsCollection(planId), mapAppointment);
  const vendors = useCollection(vendorsQuery(planId), mapVendor);
  const { upcoming, past } = React.useMemo(() => groupAppointments(appts.data), [appts.data]);

  function openNew(category?: AppointmentCategory) {
    onView({ kind: "form", category });
  }

  function handleChange(change: AppointmentChange) {
    if (change.type === "created") {
      toastWithUndo(t("appointments.toasts.added"), () => deleteAppointment(planId, change.id));
    } else if (change.type === "updated") {
      const { before } = change;
      toastWithUndo(t("appointments.toasts.updated", { title: change.title }), () => {
        const { id, createdAt, ...data } = before;
        void createdAt;
        return updateAppointment(planId, id, data);
      });
    } else {
      const { item } = change;
      toastWithUndo(t("appointments.toasts.deleted", { title: item.title }), () => restoreAppointment(planId, item));
    }
  }

  async function handleToggle(item: Appointment, done: boolean) {
    try {
      await updateAppointment(planId, item.id, { done });
    } catch {
      toast.error(t("appointments.errors.update"));
    }
  }

  async function handleDelete(item: Appointment) {
    try {
      await deleteAppointment(planId, item.id);
      handleChange({ type: "deleted", item });
    } catch {
      toast.error(t("appointments.errors.delete"));
    }
  }

  if (view.kind === "form") {
    return (
      <AppointmentForm
        // Una instancia nueva por cita: el formulario siempre arranca con sus datos.
        key={view.item?.id ?? `new-${view.category ?? ""}`}
        planId={planId}
        item={view.item}
        defaultCategory={view.category}
        vendors={vendors.data}
        onDone={onBack}
        onChange={handleChange}
      />
    );
  }

  const header = (
    <DialogHeader className="shrink-0 gap-1 px-5 pb-4 pt-5 pr-14 text-left sm:px-8 sm:pt-7">
      <DialogTitle className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
        {t("appointments.title")}
      </DialogTitle>
      <DialogDescription className="text-sm text-ink-muted">{t("appointments.description")}</DialogDescription>
    </DialogHeader>
  );

  if (appts.error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {header}
        <div className="flex-1 px-5 py-6 sm:px-8">
          <p role="alert" className="text-sm text-ink">
            {t("appointments.errors.load")}
          </p>
        </div>
      </div>
    );
  }

  const hasItems = appts.data.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      {hasItems && (
        <div className="shrink-0 border-y border-line px-5 py-3 sm:px-8">
          <button type="button" onClick={() => openNew()} className={cn(CTA_PRIMARY, "h-10 px-5")}>
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("appointments.new")}
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 sm:px-8">
        {appts.loading ? (
          <div role="status" aria-label={t("appointments.loading")} className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : !hasItems ? (
          <EmptyAgenda onStart={openNew} />
        ) : (
          <div className="flex flex-col gap-7">
            <Group
              title={t("appointments.groups.upcoming")}
              items={upcoming}
              emptyText={t("appointments.groups.upcomingEmpty")}
              vendorNames={vendors.data}
              onEdit={(item) => onView({ kind: "form", item })}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
            {past.length > 0 && (
              <Group
                title={t("appointments.groups.past")}
                items={past}
                muted
                vendorNames={vendors.data}
                onEdit={(item) => onView({ kind: "form", item })}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            )}
          </div>
        )}
      </div>

    </div>
  );
}

function EmptyAgenda({ onStart }: { onStart: (category?: AppointmentCategory) => void }) {
  const { t } = useTranslation("tools");
  const starters: AppointmentCategory[] = ["lugar", "vestuario", "degustacion"];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-lilac-soft px-5 py-8 ring-1 ring-lilac-edge sm:px-8 sm:py-10">
      <Eucalyptus className="-right-2 -bottom-4 h-36 w-24 opacity-90 sm:h-44 sm:w-28" />
      <Floret className="right-24 top-4 hidden size-8 sm:block" />
      <div className="relative flex max-w-md flex-col gap-4">
        <h3 className="font-display text-xl font-semibold text-ink sm:text-2xl">
          {t("appointments.empty.title")}
        </h3>
        <p className="text-sm text-ink-strong">{t("appointments.empty.text")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onStart()} className={CTA_PRIMARY}>
            <CalendarPlusIcon aria-hidden="true" className="size-4" />
            {t("appointments.empty.action")}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-muted">{t("appointments.empty.startWith")}</span>
          {starters.map((c) => (
            <button key={c} type="button" onClick={() => onStart(c)} className={cn(CTA_SECONDARY, "h-9 px-4")}>
              {t(`appointments.categories.${c}.label`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Group({
  title,
  items,
  emptyText,
  muted,
  vendorNames,
  onEdit,
  onDelete,
  onToggle,
}: {
  title: string;
  items: Appointment[];
  emptyText?: string;
  muted?: boolean;
  vendorNames: { id: string; name: string }[];
  onEdit: (item: Appointment) => void;
  onDelete: (item: Appointment) => void;
  onToggle: (item: Appointment, done: boolean) => void;
}) {
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-3 flex items-baseline gap-2 font-display text-lg font-semibold text-ink">
        {title}
        <span className="text-sm font-normal tabular-nums text-ink-muted">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-lilac-soft px-4 py-4 text-sm text-ink-strong ring-1 ring-lilac-edge">
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <AppointmentRow
              key={item.id}
              item={item}
              muted={muted}
              vendorName={vendorNames.find((v) => v.id === item.vendorId)?.name || item.vendorName}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AppointmentRow({
  item,
  muted,
  vendorName,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: Appointment;
  muted?: boolean;
  vendorName: string;
  onEdit: (item: Appointment) => void;
  onDelete: (item: Appointment) => void;
  onToggle: (item: Appointment, done: boolean) => void;
}) {
  const { t } = useTranslation("tools");
  const { lang } = useLanguage();
  const info = CATEGORY_INFO[item.category];
  const Icon = info.icon;
  const rel = muted ? null : relativeDay(item.date, t);

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-line bg-raised p-3 sm:gap-4 sm:p-4">
      <div
        className={cn(
          "flex w-14 shrink-0 flex-col items-center rounded-xl py-2 text-ink-on-tint",
          muted ? "bg-lilac-soft" : "bg-lilac-mid"
        )}
        aria-hidden="true"
      >
        <span className="font-display text-2xl font-semibold leading-none tabular-nums">{dayNumber(item.date)}</span>
        <span className="mt-1 text-xs font-medium uppercase tracking-wide">{monthShort(item.date, lang)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2.5">
          <Checkbox
            checked={item.done}
            onCheckedChange={(v) => onToggle(item, Boolean(v))}
            aria-label={t("appointments.markDoneAria", { title: item.title })}
            className={cn(CHECKBOX, "mt-0.5")}
          />
          <h4
            className={cn(
              "min-w-0 font-display text-base font-semibold leading-snug text-ink [overflow-wrap:anywhere]",
              item.done && "text-ink-muted line-through decoration-1"
            )}
          >
            {item.title}
          </h4>
        </div>

        <p className="mt-1 text-sm text-ink-muted">
          <span className="sr-only">{t("appointments.dayLabel")} </span>
          {formatLongDate(item.date, lang)}
          {rel && <span className="ml-2 font-medium text-green">{rel}</span>}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-strong">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac-soft px-2.5 py-0.5 text-xs font-medium text-ink-on-lilac ring-1 ring-lilac-edge">
            <Icon aria-hidden="true" className="size-3.5" />
            {t(`appointments.categories.${item.category}.label`)}
          </span>
          {item.time && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <ClockIcon aria-hidden="true" className="size-3.5 text-ink-muted" />
              {item.time}
            </span>
          )}
          {item.place.trim() && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" />
              <span className="[overflow-wrap:anywhere]">{item.place.trim()}</span>
            </span>
          )}
          {vendorName && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <StoreIcon aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" />
              <span className="[overflow-wrap:anywhere]">{vendorName}</span>
            </span>
          )}
        </div>
        {item.notes.trim() && (
          <p className="mt-2 line-clamp-2 text-sm text-ink-muted [overflow-wrap:anywhere]">{item.notes.trim()}</p>
        )}
      </div>

      <div className="-mr-1 flex shrink-0 flex-col sm:flex-row">
        <EditIconButton label={t("appointments.editAria", { title: item.title })} onClick={() => onEdit(item)} />
        <DeleteIconButton ariaLabel={t("appointments.deleteAria", { title: item.title })} onDelete={() => onDelete(item)} />
      </div>
    </li>
  );
}
