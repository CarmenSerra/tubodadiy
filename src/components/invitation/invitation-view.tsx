import type { CSSProperties, ReactNode } from "react";
import type { TFunction } from "i18next";
import {
  CalendarHeartIcon,
  ClockIcon,
  ExternalLinkIcon,
  GiftIcon,
  MapPinIcon,
  NavigationIcon,
} from "lucide-react";

import { CopyButton } from "@/components/invitation/copy-button";
import { InvitationBackdrop } from "@/components/invitation/invitation-backgrounds";
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
import { buildTheme, LEGACY_COLORS } from "@/components/invitation/invitation-theme";
import type { Lang } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/i18n/format";
import { getServerT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

import "./invitation.css";

/** «Ana & Luis» → ["Ana", "Luis"]; si no son dos nombres claros, `null`. */
function splitNames(names: string): [string, string] | null {
  const parts = names.split(/\s*&\s*|\s+\+\s+|\s+(?:y|e|and)\s+/i).filter(Boolean);
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

function PlaceCard({
  kind,
  place,
  t,
  lang,
}: {
  kind: string;
  place: InvitationPlace;
  t: TFunction;
  lang: Lang;
}) {
  const map = mapLink(place);
  const time = formatTime(place.time, lang);
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
          {t("view.directions")}
          <span className="sr-only"> {t("view.directionsSr", { place: place.name || kind })}</span>
        </a>
      )}
    </li>
  );
}

function GiftListItem({ item, t, lang }: { item: InvitationGiftItem; t: TFunction; lang: Lang }) {
  return (
    <li className="inv-giftItem">
      <div className="inv-giftItemMain">
        <p className="inv-giftItemName">{item.name}</p>
        {item.note && <p className="inv-giftItemNote">{item.note}</p>}
      </div>
      <div className="inv-giftItemSide">
        {item.price !== null && (
          <p className="inv-giftItemPrice">
            <span className="sr-only">{t("view.gift.priceSr")} </span>
            <span aria-hidden="true">~ </span>
            {formatMoney(item.price, lang)}
          </p>
        )}
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer nofollow" className="inv-giftItemLink">
            {t("view.gift.view")}
            <ExternalLinkIcon aria-hidden="true" />
            <span className="sr-only"> {t("view.gift.viewSr", { name: item.name })}</span>
          </a>
        )}
      </div>
    </li>
  );
}

/** Lista de cosas que la pareja quiere recibir. Solo se ve: no hay reservas. */
function GiftList({ gift, t, lang }: { gift: InvitationGift; t: TFunction; lang: Lang }) {
  const items = gift.items ?? [];
  return (
    <>
      {gift.message && <p className="inv-giftMessage">{gift.message}</p>}
      {items.length > 0 && (
        <>
          <ul className="inv-giftList" aria-label={t("view.gift.listLabel")}>
            {items.map((item, i) => (
              <GiftListItem key={`${i}-${item.name}`} item={item} t={t} lang={lang} />
            ))}
          </ul>
          <p className="inv-giftHint">
            {t("view.gift.hint")}
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
  // El texto de la invitación sigue el idioma que eligió la pareja, no el de quien la abre.
  const lang = data.lang;
  const t = getServerT(lang, "invitation");
  const longDate = formatLongDate(data.date, lang);
  const parts = dateParts(data.date, lang);
  const places: ["ceremony" | "banquet", InvitationPlace][] = [
    ["ceremony", data.ceremony],
    ["banquet", data.banquet],
  ];
  const shownPlaces = places.filter(([, p]) => !placeIsEmpty(p));
  const hasWhen = Boolean(parts) || shownPlaces.length > 0;
  const deadline = formatShortDate(data.rsvpDeadline, lang);
  const preview = mode === "preview";
  const Body = preview ? "div" : "main";

  // Con paleta, las variables de color salen de ella; sin paleta (invitaciones anteriores)
  // mandan los colores de la plantilla. El fondo se dibuja con los colores que toque.
  const palette = data.palette;
  const theme = palette || data.background ? buildTheme(palette?.colors ?? LEGACY_COLORS[data.template], data.template) : null;

  return (
    <div
      className={cn("inv-root", `inv-${data.template}`, preview && "inv-preview")}
      data-template={data.template}
      data-themed={palette ? "" : undefined}
      data-bg={data.background && data.background !== "plain" ? data.background : undefined}
      style={palette && theme ? (theme.vars as CSSProperties) : undefined}
      lang={lang}
    >
      {theme && <InvitationBackdrop kind={data.background} theme={theme} />}
      <header className="inv-hero">
        {data.template === "botanico" && (
          <>
            <BotanicalCorner className={cn("inv-corner", "inv-cornerLeft")} />
            <BotanicalCorner className={cn("inv-corner", "inv-cornerRight")} />
          </>
        )}
        <div className="inv-heroInner">
          <p className={cn("inv-eyebrow", "inv-rise")}>
            {data.template === "minimal" ? t("view.eyebrowMinimal") : t("view.eyebrow")}
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
              {t("view.cta")}
            </a>
          )}
        </div>
      </header>

      <Body className="inv-body">
        {data.message && (
          <section className="inv-section" aria-label={t("view.messageLabel")}>
            <p className="inv-message">{data.message}</p>
          </section>
        )}

        {hasWhen && (
          <section className="inv-section" aria-labelledby="inv-when">
            <h2 id="inv-when" className="inv-sectionTitle">
              {t("view.when")}
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
                  <PlaceCard key={kind} kind={t(`view.places.${kind}`)} place={place} t={t} lang={lang} />
                ))}
              </ul>
            )}
          </section>
        )}

        {data.gift && (
          <section className="inv-section" aria-labelledby="inv-gift">
            <h2 id="inv-gift" className="inv-sectionTitle">
              {data.gift.mode === "list" ? t("view.gift.titleList") : t("view.gift.titleMoney")}
            </h2>
            <div className="inv-gift">
              <GiftIcon aria-hidden="true" className="inv-sealIcon" />
              {data.gift.mode === "list" && <GiftList gift={data.gift} t={t} lang={lang} />}
              {data.gift.mode !== "list" && data.gift.message && (
                <p className="inv-giftMessage">{data.gift.message}</p>
              )}
              {data.gift.mode !== "list" && data.gift.iban && (
                <div className="inv-giftRow">
                  <div className="inv-giftValue">
                    <span className="inv-giftLabel">{t("view.gift.iban")}</span>
                    <span className="inv-giftNumber">{data.gift.iban}</span>
                  </div>
                  <CopyButton value={data.gift.iban.replace(/\s+/g, "")} label={t("view.gift.ibanName")} lang={lang} />
                </div>
              )}
              {data.gift.mode !== "list" && data.gift.bizum && (
                <div className="inv-giftRow">
                  <div className="inv-giftValue">
                    <span className="inv-giftLabel">{t("view.gift.bizum")}</span>
                    <span className="inv-giftNumber">{data.gift.bizum}</span>
                  </div>
                  <CopyButton value={data.gift.bizum} label={t("view.gift.bizumName")} lang={lang} />
                </div>
              )}
            </div>
          </section>
        )}

        <section id="confirmar" className={cn("inv-section", "inv-rsvp")} aria-labelledby="inv-rsvp">
          <h2 id="inv-rsvp" className="inv-sectionTitle">
            {t("view.rsvpTitle")}
          </h2>
          {closed ? (
            <p className="inv-deadline">
              {deadline ? t("view.deadline.closedOn", { date: deadline }) : t("view.deadline.closed")}
            </p>
          ) : (
            <>
              {deadline && (
                <p className="inv-deadline">
                  {t("view.deadline.beforePrefix")}
                  <strong>{deadline}</strong>
                  {t("view.deadline.beforeSuffix")}
                </p>
              )}
              {rsvp}
            </>
          )}
        </section>
      </Body>

      <footer className="inv-footer">
        <p>{t("view.footer.withLove", { names: data.names || "Ana & Luis" })}</p>
        <p className="inv-made">{t("view.footer.madeWith")}</p>
      </footer>
    </div>
  );
}
