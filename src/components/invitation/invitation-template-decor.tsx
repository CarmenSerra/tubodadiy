import type { CSSProperties, ReactNode } from "react";

import { Doodle, InitialsHearts, doodlePatternSvg, type DoodleName } from "@/components/invitation/doodles";
import { splitNames } from "@/components/invitation/invitation-card-layouts";
import type { InvitationTemplateId } from "@/components/invitation/invitation-model";
import { mix, themeFor, type InvitationPalette } from "@/components/invitation/invitation-theme";

/**
 * Plantillas de dibujitos (`doodle`, `hilo`, `retro`, `azulejo`): las capas de
 * adorno de la tarjeta y de la tarjetita de agradecimiento, y el adorno central.
 * Todo son SVG de línea que toman el color con `currentColor` (lo fija el CSS con
 * los colores de la paleta elegida) y se miden en cqw, así que escalan con la
 * tarjeta. Sin hooks: vale para servidor y cliente.
 */

export const DOODLE_TEMPLATES: readonly InvitationTemplateId[] = ["doodle", "hilo", "retro", "azulejo"];

export function isDoodleTemplate(template: InvitationTemplateId): boolean {
  return DOODLE_TEMPLATES.includes(template);
}

/** Iniciales de la pareja para el patrón y los corazones: «Ana & Luis» → { a: "A", b: "L" }; con un solo nombre, `null`. */
export function coupleInitials(names: string): { a: string; b: string } | null {
  const pair = splitNames(names);
  if (!pair) return null;
  const first = (text: string) => Array.from(text.trim())[0]?.toLocaleUpperCase() ?? "";
  const [a, b] = [first(pair[0]), first(pair[1])];
  return a && b ? { a, b } : null;
}

function Corner({ name, className, style }: { name: DoodleName; className: string; style?: CSSProperties }) {
  return <Doodle name={name} className={`inv-tplDoodle ${className}`} style={style} />;
}

/**
 * Patrón de dibujitos como SVG en línea. Se genera en un sistema de coordenadas fijo
 * (la tarjeta mide 400 × 560 y la tarjetita 420 × 280) y se estira al tamaño de la
 * caja, así la densidad es la misma en la página, en la vista previa y en
 * «Reserva la fecha», cuyo lienzo usa el mismo generador.
 */
function PatternLayer({
  template,
  palette,
  names,
  width,
  height,
  seed,
  density,
}: {
  template: InvitationTemplateId;
  palette: InvitationPalette | undefined;
  names: string;
  width: number;
  height: number;
  seed: number;
  density: "low" | "mid" | "high";
}) {
  const theme = themeFor(palette, template);
  const initials = coupleInitials(names);
  const svg = doodlePatternSvg({
    width,
    height,
    color: mix(theme.primary, theme.ink, 0.38),
    fill: mix(theme.primary, theme.bg, 0.3),
    seed,
    density,
    initials: initials ?? undefined,
    fontFamily: "Georgia, 'Times New Roman', serif",
  });
  return <div className="inv-tplLayer inv-ddLayer" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Cinta ondulada de color suave por detrás del texto (plantilla retro). */
function Wave({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M100 30 C 76 36, 78 62, 52 74 C 30 84, 16 100, 0 104 L 0 134 C 22 132, 38 116, 62 104 C 90 90, 86 70, 100 66 Z" />
    </svg>
  );
}

/** Capas de adorno de la tarjeta de invitación (detrás del texto). */
export function TemplateDecor({
  template,
  palette,
  names,
}: {
  template: InvitationTemplateId;
  palette: InvitationPalette | undefined;
  names: string;
}): ReactNode {
  switch (template) {
    case "doodle":
      return <PatternLayer template={template} palette={palette} names={names} width={400} height={560} seed={7} density="mid" />;
    case "retro":
      return (
        <div className="inv-tplLayer inv-rtLayer" aria-hidden="true">
          <Wave className="inv-rtWave" />
          <Corner name="cornerSwirl" className="inv-rtSwirl inv-rtTL" />
          <Corner name="cornerSwirl" className="inv-rtSwirl inv-rtBR" />
          <Corner name="discoBall" className="inv-rtDoodle inv-rtTR" />
          <Corner name="coupes" className="inv-rtDoodle inv-rtBL" />
        </div>
      );
    case "azulejo":
      return (
        <div className="inv-tplLayer inv-azLayer" aria-hidden="true">
          <div className="inv-azPanel" />
        </div>
      );
    default:
      return null;
  }
}

/** Adorno central de las composiciones (ocupa el lugar de la ramita de las demás plantillas). */
export function TemplateOrnament({ template, names }: { template: InvitationTemplateId; names: string }): ReactNode {
  const initials = coupleInitials(names);
  switch (template) {
    case "doodle":
      return initials ? (
        <InitialsHearts a={initials.a} b={initials.b} className="inv-ornament inv-ddHearts" />
      ) : (
        <Doodle name="heart" className="inv-ornament inv-ddHeart" />
      );
    case "hilo":
      return <Doodle name="threadHands" className="inv-ornament inv-hiloHands" />;
    case "retro":
      return (
        <span className="inv-ornament inv-rtOrnament" aria-hidden="true">
          <Doodle name="sparkle" className="inv-rtSpark" />
          <Doodle name="heart" className="inv-rtHeart" />
          <Doodle name="sparkle" className="inv-rtSpark" />
        </span>
      );
    case "azulejo":
      return <Doodle name="heartCouple" className="inv-ornament inv-azCouple" />;
    default:
      return null;
  }
}

/** Capas de adorno de la tarjetita de agradecimiento. */
export function ThanksDecor({
  template,
  palette,
  names,
}: {
  template: InvitationTemplateId;
  palette: InvitationPalette | undefined;
  names: string;
}): ReactNode {
  switch (template) {
    case "doodle":
      return <PatternLayer template={template} palette={palette} names={names} width={420} height={280} seed={11} density="low" />;
    case "retro":
      return (
        <div className="inv-tplLayer inv-rtLayer" aria-hidden="true">
          <Wave className="inv-rtWave" />
          <Corner name="heart" className="inv-rtDoodle inv-rtTL" />
          <Corner name="sparkle" className="inv-rtDoodle inv-rtBR" />
        </div>
      );
    case "azulejo":
      return (
        <div className="inv-tplLayer inv-azLayer" aria-hidden="true">
          <div className="inv-azPanel" />
        </div>
      );
    default:
      return null;
  }
}
