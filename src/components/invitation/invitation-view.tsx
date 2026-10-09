import type { ReactNode } from "react";
import {
  CalendarHeartIcon,
  ClockIcon,
  ExternalLinkIcon,
  GiftIcon,
  MapPinIcon,
  NavigationIcon,
} from "lucide-react";

import { CopyButton } from "@/components/invitation/copy-button";
import {
  BotanicalCorner,
  DiamondDivider,
  DotRule,
  Sprig,
} from "@/components/invitation/invitation-ornaments";
import {
  dateParts,
  formatLongDate,
  formatShortDate,
  formatTime,
  mapLink,
  placeIsEmpty,
  type InvitationGift,
  type InvitationGiftItem,
  type InvitationPlace,
  type InvitationPublicData,
} from "@/components/invitation/invitation-model";
import { cn } from "@/lib/utils";

import "./invitation.css";

/** «Ana & Luis» → ["Ana", "Luis"]; si no son dos nombres claros, `null`. */
function splitNames(names: string): [string, string] | null {
  const parts = names.split(/\s*&\s*|\s+\+\s+|\s+y\s+|\s+e\s+/i).filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

function Names({ names }: { names: string }) {
  const pair = splitNames(names);
  if (!pair) return <>{names}</>;
  return (
    <>
      <span className="inv-nameA">{pair[0]}</span>
      <span className="inv-amp" aria-hidden="true">
        &amp;
      </span>
      <span className="inv-nameB">{pair[1]}</span>
      <span className="sr-only">{names}</span>
    </>
  );
}

function PlaceCard({ kind, place }: { kind: string; place: InvitationPlace }) {
  const map = mapLink(place);
  const time = formatTime(place.time);
  return (
    <li className="inv-place">
      <p className="inv-placeKind">{kind}</p>
      {place.name && <p className="inv-placeName">{place.name}</p>}
      {time && (
        <p className="inv-placeLine">
          <ClockIcon aria-hidden="true" />
          {time}
        </p>
      )}
      {place.address && (
        <p className="inv-placeLine">
          <MapPinIcon aria-hidden="true" />
          <span>{place.address}</span>
        </p>
      )}
      {map && (
        <a href={map} target="_blank" rel="noopener noreferrer" className="inv-mapLink">
          <NavigationIcon aria-hidden="true" />
          Cómo llegar
          <span className="sr-only"> a {place.name || kind} (se abre en una pestaña nueva)</span>
        </a>
      )}
    </li>
  );
}

const EURO = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  useGrouping: "always",
});

function GiftListItem({ item }: { item: InvitationGiftItem }) {
  return (
    <li className="inv-giftItem">
      <div className="inv-giftItemMain">
        <p className="inv-giftItemName">{item.name}</p>
        {item.note && <p className="inv-giftItemNote">{item.note}</p>}
      </div>
      <div className="inv-giftItemSide">
        {item.price !== null && (
          <p className="inv-giftItemPrice">
            <span className="sr-only">Precio aproximado: </span>
            <span aria-hidden="true">~ </span>
            {EURO.format(item.price)}
          </p>
        )}
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer nofollow" className="inv-giftItemLink">
            Ver
            <ExternalLinkIcon aria-hidden="true" />
            <span className="sr-only"> «{item.name}» (se abre en una pestaña nueva)</span>
          </a>
        )}
      </div>
    </li>
  );
}

/** Lista de cosas que la pareja quiere recibir. Solo se ve: no hay reservas. */
function GiftList({ gift }: { gift: InvitationGift }) {
  const items = gift.items ?? [];
  return (
    <>
      {gift.message && <p className="inv-giftMessage">{gift.message}</p>}
      {items.length > 0 && (
        <>
          <ul className="inv-giftList" aria-label="Lista de regalos">
            {items.map((item, i) => (
              <GiftListItem key={`${i}-${item.name}`} item={item} />
            ))}
          </ul>
          <p className="inv-giftHint">
            La lista es solo una guía. Si te apetece regalar algo de ella, escríbenos antes para que no se
            repita.
          </p>
        </>
      )}
    </>
  );
}

interface InvitationViewProps {
  data: InvitationPublicData;
  /** `preview`: vista previa del editor (más compacta y sin animaciones de entrada). */
  mode?: "page" | "preview";
  /** Formulario de respuesta (se inyecta para que esta vista no dependa del cliente). */
  rsvp?: ReactNode;
  /** El plazo para confirmar ya ha pasado. */
  closed?: boolean;
}

export function InvitationView({ data, mode = "page", rsvp, closed = false }: InvitationViewProps) {
  const longDate = formatLongDate(data.date);
  const parts = dateParts(data.date);
  const places: [string, InvitationPlace][] = [
    ["Ceremonia", data.ceremony],
    ["Banquete", data.banquet],
  ];
  const shownPlaces = places.filter(([, p]) => !placeIsEmpty(p));
  const hasWhen = Boolean(parts) || shownPlaces.length > 0;
  const deadline = formatShortDate(data.rsvpDeadline);
  const preview = mode === "preview";
  const Body = preview ? "div" : "main";

  return (
    <div
      className={cn("inv-root", `inv-${data.template}`, preview && "inv-preview")}
      data-template={data.template}
    >
      <header className="inv-hero">
        {data.template === "botanico" && (
          <>
            <BotanicalCorner className={cn("inv-corner", "inv-cornerLeft")} />
            <BotanicalCorner className={cn("inv-corner", "inv-cornerRight")} />
          </>
        )}
        <div className="inv-heroInner">
          <p className={cn("inv-eyebrow", "inv-rise")}>
            {data.template === "minimal" ? "Nos casamos" : "¡Nos casamos!"}
          </p>
          <h1 className={cn("inv-names", "inv-rise")} style={{ animationDelay: "80ms" }}>
            <Names names={data.names || "Ana & Luis"} />
          </h1>
          {data.template === "elegante" ? (
            <DiamondDivider className={cn("inv-divider", "inv-rise")} />
          ) : data.template === "minimal" ? (
            <DotRule className={cn("inv-divider", "inv-rise")} />
          ) : (
            <Sprig className={cn("inv-divider", "inv-rise")} />
          )}
          {longDate && (
            <p className={cn("inv-heroDate", "inv-rise")} style={{ animationDelay: "160ms" }}>
              {longDate}
            </p>
          )}
          {!preview && (
            <a href="#confirmar" className={cn("inv-heroCta", "inv-rise")} style={{ animationDelay: "240ms" }}>
              Confirmar asistencia
            </a>
          )}
        </div>
      </header>

      <Body className="inv-body">
        {data.message && (
          <section className="inv-section" aria-label="Mensaje de la pareja">
            <p className="inv-message">{data.message}</p>
          </section>
        )}

        {hasWhen && (
          <section className="inv-section" aria-labelledby="inv-when">
            <h2 id="inv-when" className="inv-sectionTitle">
              Cuándo y dónde
            </h2>
            {parts && (
              <div className="inv-dateSeal">
                <CalendarHeartIcon aria-hidden="true" className="inv-sealIcon" />
                <p className="inv-sealWeekday">{parts.weekday}</p>
                <p className="inv-sealDay">{parts.day}</p>
                <p className="inv-sealMonth">
                  {parts.month} {parts.year}
                </p>
              </div>
            )}
            {shownPlaces.length > 0 && (
              <ul className="inv-places">
                {shownPlaces.map(([kind, place]) => (
                  <PlaceCard key={kind} kind={kind} place={place} />
                ))}
              </ul>
            )}
          </section>
        )}

        {data.gift && (
          <section className="inv-section" aria-labelledby="inv-gift">
            <h2 id="inv-gift" className="inv-sectionTitle">
              {data.gift.mode === "list" ? "Lo que nos haría ilusión" : "Si quieres tener un detalle"}
            </h2>
            <div className="inv-gift">
              <GiftIcon aria-hidden="true" className="inv-sealIcon" />
              {data.gift.mode === "list" && <GiftList gift={data.gift} />}
              {data.gift.mode !== "list" && data.gift.message && (
                <p className="inv-giftMessage">{data.gift.message}</p>
              )}
              {data.gift.mode !== "list" && data.gift.iban && (
                <div className="inv-giftRow">
                  <div className="inv-giftValue">
                    <span className="inv-giftLabel">Transferencia (IBAN)</span>
                    <span className="inv-giftNumber">{data.gift.iban}</span>
                  </div>
                  <CopyButton value={data.gift.iban.replace(/\s+/g, "")} label="IBAN" />
                </div>
              )}
              {data.gift.mode !== "list" && data.gift.bizum && (
                <div className="inv-giftRow">
                  <div className="inv-giftValue">
                    <span className="inv-giftLabel">Bizum</span>
                    <span className="inv-giftNumber">{data.gift.bizum}</span>
                  </div>
                  <CopyButton value={data.gift.bizum} label="número de Bizum" />
                </div>
              )}
            </div>
          </section>
        )}

        <section id="confirmar" className={cn("inv-section", "inv-rsvp")} aria-labelledby="inv-rsvp">
          <h2 id="inv-rsvp" className="inv-sectionTitle">
            ¿Nos acompañas?
          </h2>
          {closed ? (
            <p className="inv-deadline">
              El plazo para confirmar terminó{deadline ? ` el ${deadline}` : ""}. Si aún quieres
              avisarnos, escríbenos directamente.
            </p>
          ) : (
            <>
              {deadline && (
                <p className="inv-deadline">
                  Por favor, confirma antes del <strong>{deadline}</strong>.
                </p>
              )}
              {rsvp}
            </>
          )}
        </section>
      </Body>

      <footer className="inv-footer">
        <p>Con cariño, {data.names || "Ana & Luis"}</p>
        <p className="inv-made">Invitación creada con tubodadiy</p>
      </footer>
    </div>
  );
}
