"use client";

import * as React from "react";
import { CheckIcon, MapPinIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY } from "@/components/dashboard/ui";
import { DIALOG_CONTENT, DIALOG_TITLE, ROW_FOCUS } from "@/components/vendors/vendor-brand";
import { categoryLabel } from "@/components/vendors/vendor-model";
import { VendorPhoto } from "@/components/vendors/vendor-photo";
import { RatingStars } from "@/components/vendors/vendor-rating";
import { VendorStatusBadge } from "@/components/vendors/vendor-status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { appointmentsCollection, mapAppointment } from "@/lib/firebase/appointments";
import { updateVendor } from "@/lib/firebase/mutations";
import { useCollection } from "@/lib/hooks/use-collection";
import { useLanguage } from "@/lib/i18n/provider";
import type { Vendor } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { splitLines } from "@/lib/vendor-extras";
import { cn, formatCurrency } from "@/lib/utils";

const MIN_PICK = 2;
const MAX_PICK = 4;

/** Botón «Comparar» de una categoría: abre el comparador lado a lado de sus opciones. */
export function VendorCompare({
  planId,
  category,
  vendors,
  trigger,
}: {
  planId: string;
  category: string;
  vendors: Vendor[];
  trigger: React.ReactNode;
}) {
  const { t } = useTranslation("vendors");
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={cn(DIALOG_CONTENT, "sm:max-w-5xl")}>
        <DialogHeader className="gap-1.5 pr-6">
          <DialogTitle className={DIALOG_TITLE}>
            {t("compare.title", { category: categoryLabel(category, t) })}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-muted">{t("compare.description")}</DialogDescription>
        </DialogHeader>
        <CompareBody planId={planId} vendors={vendors} />
      </DialogContent>
    </Dialog>
  );
}

/** Opciones que se ven nada más abrir: la elegida y las favoritas primero, hasta 3. */
function initialPick(vendors: Vendor[]): string[] {
  const rank = (v: Vendor) => (v.status === "chosen" ? 0 : v.status === "favorite" ? 1 : v.status === "visited" ? 2 : 3);
  return [...vendors]
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, Math.min(3, vendors.length))
    .map((v) => v.id);
}

const chip = (active: boolean, disabled: boolean) =>
  cn(
    "inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 py-1.5 text-left text-sm transition-colors",
    ROW_FOCUS,
    active
      ? "border-lilac bg-lilac-soft font-semibold text-ink"
      : "border-line-strong bg-raised font-medium text-ink-muted hover:bg-lilac-soft",
    disabled && "pointer-events-none opacity-50"
  );

function CompareBody({ planId, vendors }: { planId: string; vendors: Vendor[] }) {
  const { t } = useTranslation("vendors");
  const { lang } = useLanguage();
  const [picked, setPicked] = React.useState<string[]>(() => initialPick(vendors));
  const [choosing, setChoosing] = React.useState<string | null>(null);
  const { data: appointments } = useCollection(appointmentsCollection(planId), mapAppointment);

  // Solo cuentan los elegidos que siguen existiendo (por si se borra uno con el comparador abierto).
  const selected = picked.map((id) => vendors.find((v) => v.id === id)).filter((v): v is Vendor => Boolean(v));
  const full = selected.length >= MAX_PICK;

  function toggle(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_PICK ? cur : [...cur, id]));
  }

  async function choose(vendor: Vendor) {
    const before = vendor.status;
    setChoosing(vendor.id);
    try {
      await updateVendor(planId, vendor.id, { status: "chosen" });
      toastWithUndo(t("compare.chosenToast", { name: vendor.name }), () =>
        updateVendor(planId, vendor.id, { status: before })
      );
    } catch {
      toast.error(t("compare.chooseError"));
    } finally {
      setChoosing(null);
    }
  }

  // Precio más bajo (solo si hay al menos dos precios distintos que comparar).
  const prices = selected.flatMap((v) => (v.cost != null ? [v.cost] : []));
  const lowest = prices.length >= 2 && Math.min(...prices) !== Math.max(...prices) ? Math.min(...prices) : null;

  const empty = <span className="text-ink-muted">{t("compare.notSpecified")}</span>;

  const rows: { id: string; label: string; cell: (v: Vendor) => React.ReactNode }[] = [
    {
      id: "price",
      label: t("compare.rows.price"),
      cell: (v) =>
        v.cost != null ? (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-lg font-semibold text-ink-strong">{formatCurrency(v.cost, lang)}</span>
            {lowest !== null && v.cost === lowest && (
              <span className="rounded-full bg-sage-pale px-2.5 py-0.5 text-xs font-medium text-ink">
                {t("compare.lowest")}
              </span>
            )}
          </span>
        ) : (
          <span className="text-ink-muted">{t("card.priceTbc")}</span>
        ),
    },
    {
      id: "includes",
      label: t("compare.rows.includes"),
      cell: (v) => <Lines text={v.includes} empty={empty} />,
    },
    { id: "status", label: t("compare.rows.status"), cell: (v) => <VendorStatusBadge status={v.status} /> },
    {
      id: "rating",
      label: t("compare.rows.rating"),
      cell: (v) =>
        v.rating ? (
          <span className="flex items-center gap-2">
            <RatingStars value={v.rating} />
            <span aria-hidden="true" className="text-ink-muted">
              {v.rating}/5
            </span>
          </span>
        ) : (
          empty
        ),
    },
    { id: "pros", label: t("compare.rows.pros"), cell: (v) => <Lines text={v.pros} empty={empty} /> },
    { id: "cons", label: t("compare.rows.cons"), cell: (v) => <Lines text={v.cons} empty={empty} /> },
    {
      id: "location",
      label: t("compare.rows.location"),
      cell: (v) => {
        const text = v.location?.trim() || [v.municipality, v.province].filter(Boolean).join(", ");
        return text ? (
          <span className="flex items-start gap-1.5">
            <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="break-words">{text}</span>
          </span>
        ) : (
          empty
        );
      },
    },
    {
      id: "appointments",
      label: t("compare.rows.appointments"),
      cell: (v) => {
        const mine = appointments.filter((a) => a.vendorId === v.id);
        if (mine.length === 0) return <span className="text-ink-muted">{t("compare.noAppointments")}</span>;
        return t("compare.appointmentsDone", { done: mine.filter((a) => a.done).length, count: mine.length });
      },
    },
  ];

  const chooseButton = (v: Vendor) =>
    v.status === "chosen" ? (
      <span className="inline-flex h-11 items-center gap-2 rounded-full bg-deep px-5 text-sm font-medium text-on-solid">
        <CheckIcon className="size-4" aria-hidden="true" />
        {t("compare.chosen")}
      </span>
    ) : (
      <button
        type="button"
        disabled={choosing === v.id}
        onClick={() => void choose(v)}
        aria-label={t("compare.chooseAria", { name: v.name })}
        className={cn(CTA_PRIMARY, "px-5 disabled:opacity-60")}
      >
        {t("compare.choose")}
      </button>
    );

  return (
    <div className="mt-5 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <span id="compare-pick-label" className="text-sm font-medium text-ink">
            {t("compare.pick")}
          </span>
          <span className="text-sm text-ink-muted" aria-live="polite">
            {t("compare.pickCount", { count: selected.length, max: MAX_PICK })}
          </span>
        </div>
        <div role="group" aria-labelledby="compare-pick-label" className="flex flex-wrap gap-2">
          {vendors.map((v) => {
            const on = picked.includes(v.id);
            return (
              <button
                key={v.id}
                type="button"
                aria-pressed={on}
                disabled={!on && full}
                onClick={() => toggle(v.id)}
                className={chip(on, !on && full)}
              >
                {on && <CheckIcon className="size-4 shrink-0" aria-hidden="true" />}
                <span className="break-words">{v.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected.length < MIN_PICK ? (
        <p className="rounded-xl bg-lilac-soft px-4 py-3.5 text-sm text-ink ring-1 ring-lilac-edge">
          {t("compare.needTwo")}
        </p>
      ) : (
        <>
          {/* Escritorio: tabla lado a lado, con la primera columna como cabecera de fila. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line lg:block">
            <table className="w-full min-w-[44rem] table-fixed border-collapse text-sm text-ink-strong">
              <caption className="sr-only">{t("compare.tableCaption")}</caption>
              <colgroup>
                <col className="w-36" />
                {selected.map((v) => (
                  <col key={v.id} />
                ))}
              </colgroup>
              <thead>
                <tr className="align-bottom">
                  <td className="p-3" />
                  {selected.map((v) => (
                    <th key={v.id} scope="col" className="p-3 text-left align-top font-normal">
                      <VendorPhoto
                        photoData={v.photoData}
                        photoUrl={v.photoUrl}
                        name=""
                        category={v.category}
                        seed={v.placeId ?? v.id}
                        kind={v.placeKind ?? v.category}
                        className="mb-2.5 aspect-[16/9] rounded-xl"
                      />
                      <span className="font-display text-base font-semibold break-words text-ink-strong">{v.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-line align-top">
                    <th scope="row" className="bg-lilac-soft p-3 text-left text-sm font-medium text-ink">
                      {row.label}
                    </th>
                    {selected.map((v) => (
                      <td key={v.id} className="p-3">
                        {row.cell(v)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-line">
                  <th scope="row" className="bg-lilac-soft p-3 text-left text-sm font-medium text-ink">
                    <span className="sr-only">{t("compare.rows.decision")}</span>
                  </th>
                  {selected.map((v) => (
                    <td key={v.id} className="p-3">
                      {chooseButton(v)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Móvil y tableta: una tarjeta por opción. */}
          <ul className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {selected.map((v) => (
              <li key={v.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-raised">
                <VendorPhoto
                  photoData={v.photoData}
                  photoUrl={v.photoUrl}
                  name=""
                  category={v.category}
                  seed={v.placeId ?? v.id}
                  kind={v.placeKind ?? v.category}
                  className="aspect-[2/1] sm:aspect-[16/9]"
                />
                <div className="flex flex-1 flex-col gap-4 p-4">
                  <h4 className="font-display text-lg font-semibold break-words text-ink-strong">{v.name}</h4>
                  <dl className="flex flex-col gap-3.5 text-sm text-ink-strong">
                    {rows.map((row) => (
                      <div key={row.id}>
                        <dt className="text-xs font-medium text-ink-muted">{row.label}</dt>
                        <dd className="mt-0.5">{row.cell(v)}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-auto pt-1">{chooseButton(v)}</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Lines({ text, empty }: { text: string | undefined; empty: React.ReactNode }) {
  const lines = splitLines(text);
  if (lines.length === 0) return <>{empty}</>;
  return (
    <ul className="flex list-disc flex-col gap-1 pl-4 marker:text-lilac">
      {lines.map((line, i) => (
        <li key={i} className="break-words">
          {line}
        </li>
      ))}
    </ul>
  );
}
