"use client";

import * as React from "react";
import { CalendarPlusIcon, ClockIcon, MapPinIcon, PlusIcon, StoreIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AppointmentFormDialog,
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
import { CHECKBOX, DeleteIconButton, EditIconButton } from "@/components/guests/brand-dialog";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className={MODAL}
        // El foco empieza en el propio diálogo (se anuncia su título).
        onOpenAutoFocus={(event) => {
          restoreFocus.onOpenAutoFocus();
          event.preventDefault();
          contentRef.current?.focus();
        }}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
        onInteractOutside={ignoreToastInteraction}
      >
        <DialogHeader className="shrink-0 gap-1 px-5 pb-4 pt-5 pr-14 text-left sm:px-8 sm:pt-7">
          <DialogTitle className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Citas
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-muted">
            Visitas, pruebas y reuniones de tu boda, en un solo sitio.
          </DialogDescription>
        </DialogHeader>
        {open && <AppointmentsBody intent={intent} />}
      </DialogContent>
    </Dialog>
  );
}

function AppointmentsBody({ intent }: { intent: AppointmentsIntent | null }) {
  const { planId } = usePlanContext();
  const appts = useCollection(appointmentsCollection(planId), mapAppointment);
  const vendors = useCollection(vendorsQuery(planId), mapVendor);
  const { upcoming, past } = React.useMemo(() => groupAppointments(appts.data), [appts.data]);

  // Si te llevan aquí para apuntar un tipo de cita (p. ej. «Visitar posibles lugares»),
  // el formulario se abre ya con ese tipo.
  const [form, setForm] = React.useState<{
    open: boolean;
    item?: Appointment;
    category?: AppointmentCategory;
  }>(() => (intent?.category ? { open: true, category: intent.category } : { open: false }));

  function openNew(category?: AppointmentCategory) {
    setForm({ open: true, item: undefined, category });
  }

  function handleChange(change: AppointmentChange) {
    if (change.type === "created") {
      toastWithUndo("Cita añadida", () => deleteAppointment(planId, change.id));
    } else if (change.type === "updated") {
      const { before } = change;
      toastWithUndo(`«${change.title}» actualizada`, () => {
        const { id, createdAt, ...data } = before;
        void createdAt;
        return updateAppointment(planId, id, data);
      });
    } else {
      const { item } = change;
      toastWithUndo(`«${item.title}» eliminada`, () => restoreAppointment(planId, item));
    }
  }

  async function handleToggle(item: Appointment, done: boolean) {
    try {
      await updateAppointment(planId, item.id, { done });
    } catch {
      toast.error("No se ha podido actualizar la cita.");
    }
  }

  async function handleDelete(item: Appointment) {
    try {
      await deleteAppointment(planId, item.id);
      handleChange({ type: "deleted", item });
    } catch {
      toast.error("No se ha podido eliminar la cita.");
    }
  }

  if (appts.error) {
    return (
      <div className="flex-1 px-5 py-6 sm:px-8">
        <p role="alert" className="text-sm text-ink">
          No se han podido cargar las citas. Recarga la página e inténtalo de nuevo.
        </p>
      </div>
    );
  }

  const hasItems = appts.data.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hasItems && (
        <div className="shrink-0 border-y border-line px-5 py-3 sm:px-8">
          <button type="button" onClick={() => openNew()} className={cn(CTA_PRIMARY, "h-10 px-5")}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Nueva cita
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 sm:px-8">
        {appts.loading ? (
          <div role="status" aria-label="Cargando las citas" className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : !hasItems ? (
          <EmptyAgenda onStart={openNew} />
        ) : (
          <div className="flex flex-col gap-7">
            <Group
              title="Próximas"
              items={upcoming}
              emptyText="No tienes citas próximas. Cuando apuntes una, saldrá aquí."
              vendorNames={vendors.data}
              onEdit={(item) => setForm({ open: true, item })}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
            {past.length > 0 && (
              <Group
                title="Pasadas"
                items={past}
                muted
                vendorNames={vendors.data}
                onEdit={(item) => setForm({ open: true, item })}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            )}
          </div>
        )}
      </div>

      <AppointmentFormDialog
        planId={planId}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        item={form.item}
        defaultCategory={form.category}
        vendors={vendors.data}
        onChange={handleChange}
      />
    </div>
  );
}

function EmptyAgenda({ onStart }: { onStart: (category?: AppointmentCategory) => void }) {
  const starters: AppointmentCategory[] = ["lugar", "vestuario", "degustacion"];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-lilac-soft px-5 py-8 ring-1 ring-lilac-edge sm:px-8 sm:py-10">
      <Eucalyptus className="-right-2 -bottom-4 h-36 w-24 opacity-90 sm:h-44 sm:w-28" />
      <Floret className="right-24 top-4 hidden size-8 sm:block" />
      <div className="relative flex max-w-md flex-col gap-4">
        <h3 className="font-display text-xl font-semibold text-ink sm:text-2xl">
          Aún no hay citas apuntadas
        </h3>
        <p className="text-sm text-ink-strong">
          Apunta las visitas a lugares, las pruebas de vestuario, las degustaciones y las reuniones
          con proveedores para no perderte ninguna.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onStart()} className={CTA_PRIMARY}>
            <CalendarPlusIcon aria-hidden="true" className="size-4" />
            Apuntar una cita
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-muted">O empieza por:</span>
          {starters.map((c) => (
            <button key={c} type="button" onClick={() => onStart(c)} className={cn(CTA_SECONDARY, "h-9 px-4")}>
              {CATEGORY_INFO[c].label}
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
  const info = CATEGORY_INFO[item.category];
  const Icon = info.icon;
  const rel = muted ? null : relativeDay(item.date);

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
        <span className="mt-1 text-xs font-medium uppercase tracking-wide">{monthShort(item.date)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2.5">
          <Checkbox
            checked={item.done}
            onCheckedChange={(v) => onToggle(item, Boolean(v))}
            aria-label={`Marcar «${item.title}» como hecha`}
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
          <span className="sr-only">Día: </span>
          {formatLongDate(item.date)}
          {rel && <span className="ml-2 font-medium text-green">{rel}</span>}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-strong">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac-soft px-2.5 py-0.5 text-xs font-medium text-ink-on-lilac ring-1 ring-lilac-edge">
            <Icon aria-hidden="true" className="size-3.5" />
            {info.label}
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
        <EditIconButton label={`Editar «${item.title}»`} onClick={() => onEdit(item)} />
        <DeleteIconButton ariaLabel={`Eliminar «${item.title}»`} onDelete={() => onDelete(item)} />
      </div>
    </li>
  );
}
