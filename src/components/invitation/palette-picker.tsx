"use client";

import * as React from "react";
import { BanIcon, CheckIcon } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { useTranslation } from "react-i18next";

import {
  BACKGROUND_IDS,
  InvitationBackdrop,
  isMotif,
  templateAllowsMotifs,
  type InvitationBackground,
} from "@/components/invitation/invitation-backgrounds";
import {
  COLOR_ROLES,
  ENVELOPE_SWATCHES,
  LEGACY_COLORS,
  PALETTES,
  needsTextAdjustment,
  normalizeHex,
  manualEnvelope,
  presetFor,
  resolveEnvelope,
  themeFor,
  type ColorRole,
  type InvitationPalette,
  type PaletteColors,
  type TemplateKind,
} from "@/components/invitation/invitation-theme";
import { FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const CARD =
  "flex flex-col gap-2 rounded-xl border bg-raised p-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const CARD_STATE = (active: boolean) =>
  active ? "border-lilac ring-2 ring-lilac" : "border-line-strong hover:border-lilac";

/** Sugerencias por rol: pasteles para colores claros, tonos profundos para el texto. */
const SUGGESTIONS: Record<ColorRole, string[]> = {
  primary: ["#e8b4bc", "#f0ab90", "#e9d27f", "#a9c9a4", "#9db5a3", "#8fa9c4", "#a28bc4", "#d9a7c7", "#e2b5bc", "#d4876a"],
  accent: ["#9db89a", "#7d8450", "#a9bdb0", "#c9b79c", "#d8c3a0", "#b9a07a", "#a3a7ae", "#c9795a", "#a86a8b", "#8fb3cc"],
  soft: ["#f5eee0", "#f4f0f6", "#f7f3ea", "#fbf1e6", "#f8ede6", "#f3f0ee", "#eef3ea", "#eaf1f6", "#faf1ec", "#fbf8f0"],
  dark: ["#2f4a43", "#4f1d2e", "#27394d", "#3a3d45", "#43243b", "#4b2b1f", "#1f3b2e", "#26356b", "#3f4a3a", "#2e4238"],
};

function setRole(colors: PaletteColors, role: ColorRole, hex: string): InvitationPalette {
  const next = { ...colors, [role]: hex };
  const preset = presetFor(next);
  return { id: preset?.id ?? "custom", colors: next };
}

// ---- Color: paletas + personalizar ----

export function ColorEditor({
  template,
  palette,
  envelopeColor,
  onChange,
  onEnvelopeChange,
}: {
  template: TemplateKind;
  palette: InvitationPalette | undefined;
  /** Color del sobre elegido a mano; sin valor, el sobre sigue a la paleta. */
  envelopeColor: string | undefined;
  onChange: (palette: InvitationPalette) => void;
  /** `undefined` = volver al color de la paleta. */
  onEnvelopeChange: (hex: string | undefined) => void;
}) {
  const { t } = useTranslation("invitation");
  const colors = palette?.colors ?? LEGACY_COLORS[template];
  const activePreset = presetFor(palette?.colors);
  const adjust = Boolean(palette) && needsTextAdjustment(colors);
  const envelopeManual = manualEnvelope(envelopeColor);
  const envelopeHex = resolveEnvelope(palette, envelopeColor, template);

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label={t("editor.color.paletteLabel")} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {PALETTES.map((p) => {
          const active = activePreset?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ id: p.id, colors: { ...p.colors } })}
              className={cn(CARD, CARD_STATE(active))}
            >
              <span aria-hidden="true" className="flex gap-1">
                {COLOR_ROLES.map((role) => (
                  <span
                    key={role}
                    className="h-8 flex-1 rounded-md border border-black/10"
                    style={{ background: p.colors[role] }}
                  />
                ))}
              </span>
              <span className="flex min-h-9 items-start gap-1 px-0.5 text-[13px] sm:min-h-5 font-medium leading-tight text-ink-strong">
                {active && <CheckIcon aria-hidden="true" className="mt-px size-3.5 shrink-0 text-green" />}
                {t(`palettes.${p.id}`)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-raised p-4">
        <div>
          <h4 className="text-sm font-semibold text-ink">{t("editor.color.customize")}</h4>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {palette ? (palette.id === "custom" && !activePreset ? t("editor.color.customActive") : t("editor.color.customizeNote")) : t("editor.color.legacy")}
          </p>
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {COLOR_ROLES.map((role) => (
            <ColorDot
              key={role}
              role={role}
              colors={colors}
              onPick={(hex) => onChange(setRole(colors, role, hex))}
            />
          ))}
          <ColorDot
            role="envelope"
            colors={colors}
            hex={envelopeHex}
            paletteRow={paletteRow(colors)}
            suggestions={ENVELOPE_SWATCHES}
            onPick={onEnvelopeChange}
            extra={
              <EnvelopeAuto manual={Boolean(envelopeManual)} onReset={() => onEnvelopeChange(undefined)} />
            }
          />
        </div>
        {adjust && (
          <p role="status" className="rounded-lg bg-lilac-soft px-3 py-2 text-[13px] text-ink">
            {t("editor.color.adjusted")}
          </p>
        )}
      </div>
    </div>
  );
}

/** Estado del color del sobre dentro de su selector, y el botón para volver al de la paleta. */
function EnvelopeAuto({ manual, onReset }: { manual: boolean; onReset: () => void }) {
  const { t } = useTranslation("invitation");
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-ink-muted">{t("editor.color.envelope.note")}</p>
      <p role="status" className="text-[13px] font-medium text-ink">
        {manual ? t("editor.color.envelope.manual") : t("editor.color.envelope.auto")}
      </p>
      {manual && (
        <button
          type="button"
          onClick={onReset}
          className="h-10 self-start rounded-full border border-line-strong px-4 text-sm font-medium text-ink outline-none transition-colors hover:bg-lilac-soft focus-visible:ring-2 focus-visible:ring-lilac"
        >
          {t("editor.color.envelope.useAuto")}
        </button>
      )}
    </div>
  );
}

/** Los colores de la paleta de los novios (principal, texto, acento, fondo), sin repetir ninguno. */
function paletteRow(colors: PaletteColors): { role: ColorRole; hex: string }[] {
  const seen = new Set<string>();
  const row: { role: ColorRole; hex: string }[] = [];
  for (const role of ["primary", "dark", "accent", "soft"] as const) {
    const hex = colors[role].toLowerCase();
    if (seen.has(hex)) continue;
    seen.add(hex);
    row.push({ role, hex });
  }
  return row;
}

function ColorDot({
  role,
  colors,
  hex: shownHex,
  paletteRow: fromPalette,
  suggestions,
  extra,
  onPick,
}: {
  role: ColorRole | "envelope";
  colors: PaletteColors;
  /** Color que enseña el círculo si no es el del rol (el sobre, que puede ser automático). */
  hex?: string;
  /** Colores de la paleta que se ofrecen delante de las sugerencias (el sobre). */
  paletteRow?: { role: ColorRole; hex: string }[];
  suggestions?: readonly string[];
  /** Contenido extra del selector, sobre el botón «Listo». */
  extra?: React.ReactNode;
  onPick: (hex: string) => void;
}) {
  const { t } = useTranslation("invitation");
  const [open, setOpen] = React.useState(false);
  const hex = shownHex ?? colors[role as ColorRole];
  const label = t(`editor.color.roles.${role}`);
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("editor.color.change", { role: label, hex: hex.toUpperCase() })}
            className="size-11 shrink-0 rounded-full border-2 border-surface p-0 shadow-[0_0_0_1px_var(--line-strong)] outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none motion-reduce:hover:scale-100 data-[state=open]:shadow-[0_0_0_2px_var(--lilac)]"
            style={{ background: hex }}
          />
        </PopoverTrigger>
        <PopoverContent
          align="center"
          sideOffset={8}
          collisionPadding={12}
          aria-label={t("editor.color.popoverLabel", { role: label })}
          className="max-h-[var(--radix-popover-content-available-height)] w-[min(19rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border-line-strong bg-surface p-3.5 shadow-pop"
          // El foco va al selector; Esc o «Listo» devuelven el foco al círculo.
        >
          <ColorPanel
            id={role}
            hex={hex}
            paletteRow={fromPalette}
            suggestions={suggestions ?? SUGGESTIONS[role as ColorRole]}
            adjust={(role === "dark" || role === "soft") && needsTextAdjustment(colors)}
            extra={extra}
            onPick={onPick}
            onDone={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <span className="max-w-full truncate text-xs font-medium text-ink-muted">{label}</span>
    </div>
  );
}

function ColorPanel({
  id,
  hex,
  paletteRow: fromPalette,
  suggestions,
  adjust = false,
  extra,
  onPick,
  onDone,
}: {
  /** Para que los campos de varios selectores no compartan identificador. */
  id: string;
  hex: string;
  /** Colores de la paleta elegida, en una fila delante de las sugerencias. */
  paletteRow?: { role: ColorRole; hex: string }[];
  suggestions: readonly string[];
  /** Aviso de que el texto se ajustará solo para leerse. */
  adjust?: boolean;
  /** Contenido propio del selector (el estado del sobre), sobre el botón «Listo». */
  extra?: React.ReactNode;
  onPick: (hex: string) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation("invitation");
  const [draft, setDraft] = React.useState<string | null>(null);
  const shown = draft ?? hex.toUpperCase();
  const invalid = draft !== null && draft.trim() !== "" && !normalizeHex(draft);

  return (
    <div className="flex flex-col gap-3">
      <HexColorPicker
        color={hex}
        onChange={(next) => {
          setDraft(null);
          onPick(next.toLowerCase());
        }}
        className="inv-picker"
        aria-label={t("editor.color.area")}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`pk-hex-${id}`} className={FIELD_LABEL}>
          {t("editor.color.hex")}
        </label>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-9 shrink-0 rounded-lg border border-line-strong" style={{ background: hex }} />
          <Input
            id={`pk-hex-${id}`}
            value={shown}
            onChange={(e) => {
              const value = e.target.value.slice(0, 7);
              setDraft(value);
              const next = normalizeHex(value);
              if (next) onPick(next);
            }}
            onBlur={() => setDraft(null)}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={invalid}
            aria-describedby={invalid ? `pk-hex-${id}-err` : undefined}
            className={cn(FIELD, "font-mono uppercase", invalid && "border-danger")}
          />
        </div>
        {invalid && (
          <p id={`pk-hex-${id}-err`} role="alert" className="text-[13px] text-danger">
            {t("editor.color.hexInvalid")}
          </p>
        )}
      </div>
      {fromPalette && fromPalette.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className={FIELD_LABEL}>{t("editor.color.fromPalette")}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-2">
            {fromPalette.map(({ role, hex: swatch }) => {
              const label = t(`editor.color.roles.${role}`);
              return (
                <div key={role} className="flex min-w-0 flex-col items-center gap-1">
                  <button
                    type="button"
                    aria-label={t("editor.color.fromPaletteColor", { role: label, hex: swatch.toUpperCase() })}
                    aria-pressed={swatch === hex.toLowerCase()}
                    onClick={() => {
                      setDraft(null);
                      onPick(swatch);
                    }}
                    className={cn(
                      "relative size-8 rounded-full border border-black/10 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none motion-reduce:hover:scale-100",
                      swatch === hex.toLowerCase() && "ring-2 ring-lilac ring-offset-2 ring-offset-surface"
                    )}
                    style={{ background: swatch }}
                  />
                  <span className="max-w-full truncate text-[11px] font-medium text-ink-muted">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <p className={FIELD_LABEL}>{t("editor.color.suggestions")}</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              aria-label={t("editor.color.suggestion", { hex: s.toUpperCase() })}
              aria-pressed={s === hex}
              onClick={() => {
                setDraft(null);
                onPick(s);
              }}
              className={cn(
                "relative size-8 rounded-full border border-black/10 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none motion-reduce:hover:scale-100",
                s === hex && "ring-2 ring-lilac ring-offset-2 ring-offset-surface"
              )}
              style={{ background: s }}
            />
          ))}
        </div>
      </div>
      {adjust && (
        <p role="status" className="rounded-lg bg-lilac-soft px-3 py-2 text-[13px] text-ink">
          {t("editor.color.adjusted")}
        </p>
      )}
      {extra}
      <button
        type="button"
        onClick={onDone}
        className="h-10 self-end rounded-full px-4 text-sm font-medium text-ink outline-none transition-colors hover:bg-lilac-soft focus-visible:ring-2 focus-visible:ring-lilac"
      >
        {t("editor.color.done")}
      </button>
    </div>
  );
}

// ---- Fondo ----

export function BackgroundEditor({
  template,
  palette,
  background,
  onChange,
}: {
  template: TemplateKind;
  palette: InvitationPalette | undefined;
  background: InvitationBackground | undefined;
  onChange: (background: InvitationBackground) => void;
}) {
  const { t } = useTranslation("invitation");
  const theme = React.useMemo(() => themeFor(palette, template), [palette, template]);
  // Plantillas con dibujos propios (retro, doodle, azulejo): los motivos de acuarela no se ofrecen ni se ven.
  const motifsAllowed = templateAllowsMotifs(template);
  const selected = !motifsAllowed && isMotif(background) ? "plain" : (background ?? "plain");
  const plain = BACKGROUND_IDS.filter((id) => !isMotif(id));
  const motifs = BACKGROUND_IDS.filter((id) => isMotif(id));

  type Option = { id: InvitationBackground; label: string; active: boolean; none?: boolean };
  const options = (ids: readonly InvitationBackground[]): Option[] =>
    ids.map((id) => ({ id, label: t(`backgrounds.${id}`), active: selected === id }));
  // «Sin motivos» deja el fondo en liso; se ve marcada mientras el fondo no sea un motivo.
  const motifOptions: Option[] = [
    { id: "plain", label: t("editor.background.noMotifs"), active: !isMotif(selected), none: true },
    ...options(motifs),
  ];

  const grid = (items: Option[], label: string, disabled = false) => (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cn("grid grid-cols-3 gap-2.5", disabled && "pointer-events-none opacity-50")}
    >
      {items.map(({ id, label: name, active, none }) => (
        <button
          key={none ? "none" : id}
          type="button"
          role="radio"
          aria-checked={active}
          disabled={disabled}
          onClick={() => onChange(id)}
          className={cn(CARD, "p-2", CARD_STATE(active))}
        >
          <span
            aria-hidden="true"
            className="relative flex h-28 items-center justify-center overflow-hidden rounded-lg border border-black/10 isolate"
            style={{ background: "var(--inv-app-table)" }}
          >
            {/* La mesa es lisa; el fondo elegido va dentro de la tarjeta. */}
            <span
              className="inv-miniCard relative flex h-[84%] flex-col items-center justify-center gap-1 overflow-hidden rounded-[3px] border px-2"
              style={{ background: theme.paper, borderColor: theme.line }}
            >
              {none ? (
                <BanIcon className="relative z-[1] size-7 opacity-60" strokeWidth={1.5} style={{ color: theme.ink }} />
              ) : (
                <>
                  <InvitationBackdrop kind={id} theme={theme} scale={2.2} />
                  <span className="relative z-[1] h-1.5 w-4/5 rounded-full" style={{ background: theme.ink }} />
                  <span className="relative z-[1] h-1 w-1/2 rounded-full" style={{ background: theme.primary }} />
                </>
              )}
            </span>
          </span>
          <span className="flex min-h-8 items-start gap-1 px-0.5 text-[13px] font-medium leading-tight text-ink-strong">
            {active && <CheckIcon aria-hidden="true" className="mt-px size-3.5 shrink-0 text-green" />}
            {name}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {grid(options(plain), t("editor.background.label"))}
      <div className="flex flex-col gap-3">
        <div>
          <h4 className="text-sm font-semibold text-ink">{t("editor.background.motifsTitle")}</h4>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {motifsAllowed ? t("editor.background.motifsNote") : t("editor.background.ownArt")}
          </p>
        </div>
        {grid(motifOptions, t("editor.background.motifsLabel"), !motifsAllowed)}
      </div>
    </div>
  );
}
