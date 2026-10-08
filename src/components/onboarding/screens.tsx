"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  AlertCircleIcon,
  CalendarHeartIcon,
  CheckIcon,
  CircleHelpIcon,
  ChurchIcon,
  ClipboardListIcon,
  GemIcon,
  HandHeartIcon,
  LandmarkIcon,
  Loader2,
  MapPinIcon,
  PlaneIcon,
  ShirtIcon,
  SparklesIcon,
  StoreIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import { CARD, IconCircle } from "@/components/dashboard/ui";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CEREMONY_OPTIONS,
  HAVE_OPTIONS,
  VENDOR_TYPES,
  MAX_PASTED_GUESTS,
  VENUE_SCOPE_OPTIONS,
  formatCount,
  parseGuestList,
  type HaveKey,
  type OnboardingAnswers,
} from "@/lib/onboarding-model";
import type { ExtraStage, StageState } from "@/lib/firebase/onboarding";
import { cn } from "@/lib/utils";
import type { SummaryKind, SummaryLine } from "./submission";
import { OptionCard, WIZ_ERROR, WIZ_FIELD, WIZ_HELP, WIZ_LABEL } from "./ui";

export interface ScreenProps {
  answers: OnboardingAnswers;
  set: (patch: Partial<OnboardingAnswers>) => void;
  /** id del campo → mensaje. */
  errors: Record<string, string>;
  /** Plan pensado para "ya tenemos cosas": cambia algunos textos. */
  advanced: boolean;
}

function FieldError({
  id,
  errors,
  center,
}: {
  id: string;
  errors: Record<string, string>;
  /** Centrado, para los campos con el texto centrado. */
  center?: boolean;
}) {
  const message = errors[id];
  if (!message) return null;
  return (
    <p id={`${id}-error`} role="alert" className={cn(WIZ_ERROR, center && "text-center")}>
      {message}
    </p>
  );
}

/** Atributos de accesibilidad de un campo con posible error. */
function fieldA11y(id: string, errors: Record<string, string>, describedBy?: string) {
  const error = Boolean(errors[id]);
  return {
    "aria-invalid": error || undefined,
    "aria-describedby": [error ? `${id}-error` : null, describedBy].filter(Boolean).join(" ") || undefined,
  };
}

const ERROR_BORDER = "border-[#9F3A38] focus-visible:border-[#9F3A38] focus-visible:ring-[#9F3A38]";

/* ------------------------------------------------------------------ */
/* Nombre y forma de empezar                                          */
/* ------------------------------------------------------------------ */

export function NameScreen({ answers, set }: ScreenProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="onb-title" className="sr-only">
        Nombre del plan
      </Label>
      <Input
        id="onb-title"
        value={answers.title}
        maxLength={80}
        autoComplete="off"
        placeholder="Nuestra boda"
        onChange={(e) => set({ title: e.target.value })}
        className={cn(WIZ_FIELD, "h-14 text-center font-display text-xl")}
      />
    </div>
  );
}

export function ModeScreen({ answers, set }: ScreenProps) {
  return (
    <div role="radiogroup" aria-labelledby="onb-heading" className="grid gap-3">
      <OptionCard
        type="radio"
        name="onb-mode"
        value="scratch"
        size="large"
        icon={SparklesIcon}
        checked={answers.mode === "scratch"}
        onChange={() => set({ mode: "scratch" })}
        title="Desde cero"
        description="Lienzo en blanco, os guiamos paso a paso"
      />
      <OptionCard
        type="radio"
        name="onb-mode"
        value="advanced"
        size="large"
        icon={ClipboardListIcon}
        checked={answers.mode === "advanced"}
        onChange={() => set({ mode: "advanced" })}
        title="Ya tenemos cosas avanzadas"
        description="Pasad aquí lo que ya tenéis y lo organizamos"
      />
    </div>
  );
}

const HAVE_ICON: Record<HaveKey, React.ComponentType<{ className?: string }>> = {
  fecha: CalendarHeartIcon,
  presupuesto: WalletIcon,
  lugar: MapPinIcon,
  invitados: UsersIcon,
  proveedores: StoreIcon,
  ceremonia: ChurchIcon,
  vestuario: ShirtIcon,
  alianzas: GemIcon,
  luna: PlaneIcon,
};

export function HaveScreen({ answers, set }: ScreenProps) {
  return (
    <div role="group" aria-labelledby="onb-heading" className="grid gap-2.5 sm:grid-cols-2">
      {HAVE_OPTIONS.map((option) => {
        const checked = answers.have.includes(option.key);
        return (
          <OptionCard
            key={option.key}
            type="checkbox"
            name="onb-have"
            value={option.key}
            icon={HAVE_ICON[option.key]}
            checked={checked}
            onChange={(on) =>
              set({ have: on ? [...answers.have, option.key] : answers.have.filter((k) => k !== option.key) })
            }
            title={option.label}
            description={option.hint}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fecha, presupuesto, ceremonia, invitados aproximados               */
/* ------------------------------------------------------------------ */

export function DateScreen({ answers, set }: ScreenProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="onb-date" className="sr-only">
        Fecha de la boda
      </Label>
      <DatePicker
        id="onb-date"
        value={answers.date}
        onChange={(date) => set({ date })}
        min={format(new Date(), "yyyy-MM-dd")}
        placeholder="Elegir la fecha"
        className={cn(WIZ_FIELD, "h-14")}
      />
      <p className={cn(WIZ_HELP, "text-center")}>Con la fecha, tubodadiy empieza la cuenta atrás por vosotros.</p>
    </div>
  );
}

export function BudgetScreen({ answers, set, errors }: ScreenProps) {
  const id = "onb-budget";
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="sr-only">
        Presupuesto total en euros
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="12.000"
          value={answers.budget}
          onChange={(e) => set({ budget: e.target.value })}
          {...fieldA11y(id, errors, `${id}-help`)}
          className={cn(WIZ_FIELD, "h-14 pr-10 text-xl", errors[id] && ERROR_BORDER)}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xl text-[#586C64]"
        >
          €
        </span>
      </div>
      <FieldError id={id} errors={errors} />
      <p id={`${id}-help`} className={WIZ_HELP}>
        Una cifra orientativa; podéis cambiarla cuando queráis.
      </p>
    </div>
  );
}

const CEREMONY_ICON = {
  civil: LandmarkIcon,
  religiosa: ChurchIcon,
  simbolica: HandHeartIcon,
  unknown: CircleHelpIcon,
} as const;

export function CeremonyScreen({ answers, set }: ScreenProps) {
  return (
    <div role="radiogroup" aria-labelledby="onb-heading" className="grid gap-2.5">
      {CEREMONY_OPTIONS.map((option) => (
        <OptionCard
          key={option.value}
          type="radio"
          name="onb-ceremony"
          value={option.value}
          icon={CEREMONY_ICON[option.value]}
          checked={answers.ceremony === option.value}
          onChange={() => set({ ceremony: option.value })}
          title={option.label}
          description={option.hint}
        />
      ))}
    </div>
  );
}

export function ApproxScreen({ answers, set, errors }: ScreenProps) {
  const id = "onb-approx";
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="sr-only">
        Número aproximado de invitados
      </Label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="120"
        value={answers.guestsApprox}
        onChange={(e) => set({ guestsApprox: e.target.value })}
        {...fieldA11y(id, errors, `${id}-help`)}
        className={cn(WIZ_FIELD, "h-14 text-center text-xl", errors[id] && ERROR_BORDER)}
      />
      <FieldError id={id} errors={errors} center />
      <p id={`${id}-help`} className={cn(WIZ_HELP, "text-center")}>
        Con un número aproximado vale. Lo afinaréis al hacer la lista.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lugar, lista de invitados, proveedores, luna de miel               */
/* ------------------------------------------------------------------ */

export function VenueScreen({ answers, set }: ScreenProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="onb-venue-name" className={WIZ_LABEL}>
          Nombre del lugar
        </Label>
        <Input
          id="onb-venue-name"
          autoComplete="off"
          placeholder="Finca El Olivar"
          maxLength={100}
          value={answers.venueName}
          onChange={(e) => set({ venueName: e.target.value })}
          className={WIZ_FIELD}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="onb-venue-location" className={WIZ_LABEL}>
          Dónde está <span className="font-normal text-[#586C64]">(opcional)</span>
        </Label>
        <Input
          id="onb-venue-location"
          autoComplete="off"
          placeholder="Toledo"
          maxLength={150}
          value={answers.venueLocation}
          onChange={(e) => set({ venueLocation: e.target.value })}
          className={WIZ_FIELD}
        />
      </div>
      <div role="radiogroup" aria-labelledby="onb-venue-scope" className="flex flex-col gap-2">
        <p id="onb-venue-scope" className={WIZ_LABEL}>
          ¿Es para la ceremonia, el banquete o ambos?
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {VENUE_SCOPE_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              type="radio"
              name="onb-venue-scope"
              value={option.value}
              checked={answers.venueScope === option.value}
              onChange={() => set({ venueScope: option.value })}
              title={option.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const PREVIEW_ROWS = 5;

export function GuestsScreen({ answers, set }: ScreenProps) {
  const parsed = React.useMemo(() => parseGuestList(answers.guestsPaste), [answers.guestsPaste]);
  const total = parsed.guests.length;
  const rows = parsed.guests.slice(0, PREVIEW_ROWS);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="onb-guests" className={WIZ_LABEL}>
          Pegad aquí vuestra lista
        </Label>
        <Textarea
          id="onb-guests"
          value={answers.guestsPaste}
          onChange={(e) => set({ guestsPaste: e.target.value })}
          rows={7}
          spellCheck={false}
          aria-describedby="onb-guests-help onb-guests-preview"
          placeholder={"Ana García; Familia de la novia\nLuis Pérez; Amigos\nMaría López"}
          className="min-h-44 rounded-xl border-[#D4C0EA] bg-white p-4 text-base text-[#102D28] shadow-none placeholder:text-[#677775] focus-visible:border-[#927AAC] focus-visible:ring-[#927AAC] focus-visible:ring-offset-0"
        />
        <p id="onb-guests-help" className={WIZ_HELP}>
          Un invitado por línea. Si pegáis desde Excel o Google Sheets, la primera columna es el nombre y la segunda,
          el grupo (opcional). También vale separar con «;» o con una coma.
        </p>
      </div>

      <div id="onb-guests-preview" aria-live="polite" className="flex flex-col gap-2">
        {total > 0 && (
          <>
            <p className="font-display text-xl font-semibold text-[#26413C]">
              Vamos a añadir {formatCount(total)} {total === 1 ? "invitado" : "invitados"}
            </p>
            <div className={cn(CARD, "overflow-hidden")}>
              <table className="w-full table-fixed text-left text-sm">
                <caption className="sr-only">Primeros invitados de la lista</caption>
                <thead>
                  <tr className="bg-[#ECE6F4] text-[#26413C]">
                    <th scope="col" className="w-1/2 px-3 py-2 font-medium">
                      Nombre
                    </th>
                    <th scope="col" className="w-1/2 px-3 py-2 font-medium">
                      Grupo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((guest, i) => (
                    <tr key={i} className="border-t border-[#E5DDEC]">
                      <td className="break-words px-3 py-2 text-[#102D28]">{guest.name}</td>
                      <td className="break-words px-3 py-2 text-[#586C64]">{guest.groupName || "Sin grupo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {total > rows.length && (
                <p className="border-t border-[#E5DDEC] px-3 py-2 text-sm text-[#586C64]">
                  … y {formatCount(total - rows.length)} más
                </p>
              )}
            </div>
            {parsed.skippedHeader && (
              <p className={WIZ_HELP}>Hemos ignorado la primera fila porque parece una cabecera.</p>
            )}
            {parsed.truncated && (
              <p className={WIZ_HELP}>Solo añadiremos los primeros {formatCount(MAX_PASTED_GUESTS)}.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function VendorsScreen({ answers, set, errors }: ScreenProps) {
  function update(key: string, patch: Partial<OnboardingAnswers["vendors"][string]>) {
    const current = answers.vendors[key] ?? { on: false, name: "", price: "" };
    set({ vendors: { ...answers.vendors, [key]: { ...current, ...patch } } });
  }

  return (
    <div role="group" aria-labelledby="onb-heading" className="flex flex-col gap-2.5">
      {VENDOR_TYPES.map((type) => {
        const v = answers.vendors[type.key] ?? { on: false, name: "", price: "" };
        const priceId = `onb-vendor-price-${type.key}`;
        const nameId = `onb-vendor-name-${type.key}`;
        return (
          <OptionCard
            key={type.key}
            type="checkbox"
            name="onb-vendors"
            value={type.key}
            checked={v.on}
            onChange={(on) => update(type.key, { on })}
            title={type.label}
          >
            {v.on && (
              <div className="grid gap-3 px-3.5 pb-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:px-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={nameId} className={WIZ_LABEL}>
                    Nombre <span className="font-normal text-[#586C64]">(opcional)</span>
                  </Label>
                  <Input
                    id={nameId}
                    autoComplete="off"
                    maxLength={100}
                    value={v.name}
                    onChange={(e) => update(type.key, { name: e.target.value })}
                    className={WIZ_FIELD}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={priceId} className={WIZ_LABEL}>
                    Precio <span className="font-normal text-[#586C64]">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id={priceId}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="1.500"
                      value={v.price}
                      onChange={(e) => update(type.key, { price: e.target.value })}
                      {...fieldA11y(priceId, errors)}
                      className={cn(WIZ_FIELD, "pr-9", errors[priceId] && ERROR_BORDER)}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-base text-[#586C64]"
                    >
                      €
                    </span>
                  </div>
                  <FieldError id={priceId} errors={errors} />
                </div>
              </div>
            )}
          </OptionCard>
        );
      })}
    </div>
  );
}

export function HoneymoonScreen({ answers, set }: ScreenProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="onb-honeymoon" className="sr-only">
        Destino de la luna de miel
      </Label>
      <Input
        id="onb-honeymoon"
        autoComplete="off"
        maxLength={100}
        placeholder="Japón"
        value={answers.honeymoonDestination}
        onChange={(e) => set({ honeymoonDestination: e.target.value })}
        className={cn(WIZ_FIELD, "h-14 text-center text-xl")}
      />
      <p className={cn(WIZ_HELP, "text-center")}>Es opcional: lo apuntamos en la sección Luna de miel.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resumen y creación                                                 */
/* ------------------------------------------------------------------ */

const SUMMARY_ICON: Record<SummaryKind, React.ComponentType<{ className?: string }>> = {
  date: CalendarHeartIcon,
  budget: WalletIcon,
  ceremony: ChurchIcon,
  venue: MapPinIcon,
  guests: UsersIcon,
  vendors: StoreIcon,
  dress: ShirtIcon,
  rings: GemIcon,
  honeymoon: PlaneIcon,
};

export function SummaryScreen({ title, lines }: { title: string; lines: SummaryLine[] }) {
  return (
    <div className={cn(CARD, "p-5 sm:p-6")}>
      <p className="text-sm text-[#586C64]">Vuestro plan</p>
      <p className="font-display text-2xl font-semibold text-[#26413C]">{title}</p>
      {lines.length > 0 ? (
        <dl className="mt-4 flex flex-col gap-3.5 border-t border-[#E5DDEC] pt-4">
          {lines.map((line, i) => {
            const Icon = SUMMARY_ICON[line.kind];
            return (
              <div key={`${line.kind}-${i}`} className="flex items-start gap-3">
                <IconCircle tone={i % 2 === 0 ? "lilac" : "sage"} className="size-9">
                  <Icon />
                </IconCircle>
                <div className="min-w-0">
                  <dt className="text-sm text-[#586C64]">{line.label}</dt>
                  <dd className="break-words font-medium text-[#102D28]">{line.value}</dd>
                </div>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="mt-4 border-t border-[#E5DDEC] pt-4 text-[#26413C]">
          Empezáis con el lienzo en blanco: os guiamos paso a paso por las 13 secciones del plan.
        </p>
      )}
    </div>
  );
}

export type StageView = StageState | "pending" | "done";

export function CreatingScreen({
  stages,
}: {
  stages: { key: "plan" | ExtraStage; label: string; state: StageView }[];
}) {
  return (
    <ul aria-live="polite" className={cn(CARD, "flex flex-col gap-3 p-5 sm:p-6")}>
      {stages.map((stage) => (
        <li key={stage.key} className="flex items-center gap-3 text-[#26413C]">
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
            {stage.state === "done" ? (
              <span className="flex size-6 items-center justify-center rounded-full bg-[#8FAF8A] text-[#26413C]">
                <CheckIcon className="size-3.5" strokeWidth={3} />
              </span>
            ) : stage.state === "active" ? (
              <Loader2 className="size-5 animate-spin text-[#927AAC] motion-reduce:animate-none" />
            ) : stage.state === "failed" ? (
              <AlertCircleIcon className="size-5 text-[#9F3A38]" />
            ) : (
              <span className="size-3 rounded-full border-2 border-[#D4C0EA]" />
            )}
          </span>
          <span className={cn(stage.state === "pending" && "text-[#586C64]")}>
            {stage.label}
            <span className="sr-only">
              {stage.state === "done" ? " (hecho)" : stage.state === "failed" ? " (no se ha podido)" : ""}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
