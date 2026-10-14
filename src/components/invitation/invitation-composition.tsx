import type { CSSProperties } from "react";

import { InvitationEnvelope } from "@/components/invitation/invitation-envelope";
import type { InvitationPublicData } from "@/components/invitation/invitation-model";
import { resolveEnvelope } from "@/components/invitation/invitation-theme";
import { ThanksCard } from "@/components/invitation/invitation-thanks";
import { InvitationCard, themeOfInvitation } from "@/components/invitation/invitation-view";
import { cn } from "@/lib/utils";

import "./invitation.css";

/**
 * La vista previa del editor, sobre una mesa de color liso (sin motivos: estos
 * van dentro de las tarjetas): la invitación vertical (ligeramente girada y con
 * sombra) sobre un sobre abierto en diagonal, con la tarjetita de agradecimiento
 * superpuesta abajo a la derecha. Todo se mide en una unidad `--u` (1 % del ancho
 * de la composición) que se calcula con el tamaño del contenedor, así que escala
 * entera para caber en cualquier panel. Sin hooks: vale para servidor y cliente.
 */
export function InvitationComposition({
  data,
  envelopeColor,
  className,
}: {
  data: InvitationPublicData;
  /** Color del sobre elegido a mano; sin valor, el de la paleta. */
  envelopeColor?: string;
  className?: string;
}) {
  const palette = data.palette;
  const theme = themeOfInvitation(data);

  return (
    <div
      className={cn("inv-root inv-preview inv-compose", `inv-${data.template}`, className)}
      data-template={data.template}
      data-themed={palette ? "" : undefined}
      style={palette ? (theme.vars as CSSProperties) : undefined}
      lang={data.lang}
    >
      <div className="inv-composeStage">
        <InvitationEnvelope color={resolveEnvelope(palette, envelopeColor, data.template)} className="inv-composeEnv" />
        <div className="inv-composeCard">
          <InvitationCard data={data} preview />
        </div>
        <div className="inv-composeThanks">
          <ThanksCard data={data} />
        </div>
      </div>
    </div>
  );
}
