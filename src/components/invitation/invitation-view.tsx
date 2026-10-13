import type { CSSProperties, ReactNode } from "react";
import type { TFunction } from "i18next";
import {
  ChevronDownIcon,
  ClockIcon,
  ExternalLinkIcon,
  GiftIcon,
  MapPinIcon,
  NavigationIcon,
} from "lucide-react";

import { CopyButton } from "@/components/invitation/copy-button";
import { WatercolorArt, type ArtSource } from "@/components/invitation/invitation-art";
import { InvitationBackdrop } from "@/components/invitation/invitation-backgrounds";
import {
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
  samePlace,
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

interface PlaceTime {
  /** Etiqueta («Ceremonia») cuando hay dos horas distintas en el mismo sitio; vacía si no hace falta. */
  label: string;
  value: string;
}

function PlaceCard({
  kind,
  place,
  times,
  t,
}: {
  kind: string;
  place: InvitationPlace;
  times: PlaceTime[];
  t: TFunction;
}) {
  const map = mapLink(place);
  return (
    <li className="inv-place">
      <p className="inv-placeKind">{kind}</p>
      {place.name && <p className="inv-placeName">{place.name}</p>}
      {times.map((time) => (
        <p key={time.label || time.value} className="inv-placeLine">
          <ClockIcon aria-hidden="true" />
          <span>
            {time.label && <>{time.label}: </>}
            {time.value}
          </span>
        </p>
      ))}
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

/** Tamaño de los nombres según su longitud, para que quepan en la tarjeta. */
function nameSize(names: string): "l" | "m" | "s" {
  const length = names.length;
  return length <= 12 ? "l" : length <= 20 ? "m" : "s";
}

export function InvitationView({ data, mode = "page", rsvp, closed = false }: InvitationViewProps) {
  // El texto de la invitación sigue el idioma que eligió la pareja, no el de quien la abre.
  const lang = data.lang;
  const t = getServerT(lang, "invitation");
  const longDate = formatLongDate(data.date, lang);
  const parts = dateParts(data.date, lang);
  const preview = mode === "preview";
  const names = data.names || "Ana & Luis";

  // ---- Lugares: un único bloque si es el mismo sitio (o falta uno); dos si son distintos ----
  const { ceremony, banquet } = data;
  const hasCeremony = !placeIsEmpty(ceremony);
  const hasBanquet = !placeIsEmpty(banquet);
  const same = samePlace(ceremony, banquet);
  const venue: InvitationPlace = {
    name: ceremony.name || banquet.name,
    address: ceremony.address || banquet.address,
    mapUrl: ceremony.mapUrl || banquet.mapUrl,
    time: "",
  };
  const timeOf = (place: InvitationPlace) => formatTime(place.time, lang);
  const placeBlocks: { kind: string; place: InvitationPlace; times: PlaceTime[] }[] = [];
  if (same && (hasCeremony || hasBanquet)) {
    const [tc, tb] = [timeOf(ceremony), timeOf(banquet)];
    const times: PlaceTime[] =
      tc && tb && tc !== tb
        ? [
            { label: t("view.places.ceremony"), value: tc },
            { label: t("view.places.banquet"), value: tb },
          ]
        : tc || tb
          ? [{ label: "", value: tc || tb }]
          : [];
    placeBlocks.push({
      kind: hasCeremony && hasBanquet ? t("view.places.both") : t(`view.places.${hasCeremony ? "ceremony" : "banquet"}`),
      place: venue,
      times,
    });
  } else if (!same) {
    for (const [kind, place] of [["ceremony", ceremony], ["banquet", banquet]] as const) {
      const time = timeOf(place);
      placeBlocks.push({ kind: t(`view.places.${kind}`), place, times: time ? [{ label: "", value: time }] : [] });
    }
  }
  const hasWhen = placeBlocks.length > 0;

  // ---- Lo que lleva la tarjeta ----
  const cardTime = timeOf(ceremony) || timeOf(banquet);
  const cardPlace = venue.name || venue.address;
  const later = !same ? banquet.name || banquet.address : "";
  const deadline = formatShortDate(data.rsvpDeadline, lang);
  const longMessage = data.message.length > 130;
  const Body = preview ? "div" : "main";

  // Con paleta, las variables de color salen de ella; sin paleta (invitaciones anteriores)
  // mandan los colores de la plantilla. El fondo y la imagen se dibujan con los colores que toque.
  const palette = data.palette;
  const theme = buildTheme(palette?.colors ?? LEGACY_COLORS[data.template], data.template);

  const imageMode = data.imageMode ?? "illustration";
  const art: ArtSource | null =
    imageMode === "none"
      ? null
      : imageMode === "photo" && data.photo
        ? { kind: "photo", src: data.photo }
        : { kind: "illustration" };

  const orn = cn("inv-ornament");
  const Ornament =
    data.template === "elegante" ? (
      <DiamondDivider className={orn} />
    ) : data.template === "minimal" ? (
      <DotRule className={orn} />
    ) : (
      <Sprig className={orn} />
    );

  return (
    <div
      className={cn("inv-root", `inv-${data.template}`, preview && "inv-preview")}
      data-template={data.template}
      data-themed={palette ? "" : undefined}
      data-bg={data.background && data.background !== "plain" ? data.background : undefined}
      style={palette ? (theme.vars as CSSProperties) : undefined}
      lang={lang}
    >
      {(palette || data.background) && <InvitationBackdrop kind={data.background} theme={theme} />}

      <Body className="inv-main">
        <section className="inv-stage" aria-label={t("view.cardLabel")}>
          <div className={cn("inv-card", art ? "inv-hasArt" : "inv-noArt", !preview && "inv-rise")}>
            {art && (
              <div className="inv-art">
                <WatercolorArt
                  source={art}
                  theme={theme}
                  alt={art.kind === "photo" ? t("view.photoAlt") : undefined}
                  className="inv-artSvg"
                />
              </div>
            )}

            <div className="inv-cardBody">
              <h1 className="inv-names" data-size={nameSize(names)}>
                <Names names={names} />
              </h1>

              <div className="inv-cardIntro">
                <p className="inv-eyebrow">
                  {data.template === "minimal" ? t("view.eyebrowMinimal") : t("view.eyebrow")}
                </p>
                {data.message && <p className="inv-cardMessage">{data.message}</p>}
              </div>

              {(parts || cardTime) && (
                <div className="inv-strip">
                  {parts && <p className="inv-stripCell inv-stripWeekday">{parts.weekday}</p>}
                  {parts && (
                    <p className="inv-stripCell inv-stripDate">
                      <span className="inv-stripMonth">{parts.month}</span>
                      <span className="inv-stripDay">{parts.day}</span>
                      <span className="inv-stripYear">{parts.year}</span>
                    </p>
                  )}
                  {cardTime && <p className="inv-stripCell inv-stripTime">{cardTime}</p>}
                </div>
              )}

              {(cardPlace || later) && (
                <div className="inv-cardPlace">
                  {cardPlace && <p className="inv-cardVenue">{cardPlace}</p>}
                  {later && (
                    <p className="inv-cardLater">
                      {t("view.later")} <strong>{later}</strong>
                    </p>
                  )}
                </div>
              )}

              {Ornament}

              {preview ? (
                <p className="inv-cardJoin">{t("view.rsvpTitle")}</p>
              ) : (
                <a href="#confirmar" className="inv-cardJoin">
                  {t("view.rsvpTitle")}
                  <ChevronDownIcon aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </section>

        <div className="inv-body">
          {longMessage && (
            <section className="inv-section" aria-label={t("view.messageLabel")}>
              <p className="inv-message">{data.message}</p>
            </section>
          )}

          {hasWhen && (
            <section className="inv-section" aria-labelledby="inv-when">
              <h2 id="inv-when" className="inv-sectionTitle">
                {t("view.when")}
              </h2>
              {longDate && <p className="inv-whenDate">{longDate}</p>}
              <ul className="inv-places" data-count={placeBlocks.length}>
                {placeBlocks.map((block) => (
                  <PlaceCard key={block.kind} kind={block.kind} place={block.place} times={block.times} t={t} />
                ))}
              </ul>
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
        </div>
      </Body>

      <footer className="inv-footer">
        <p>{t("view.footer.withLove", { names })}</p>
        <p className="inv-made">{t("view.footer.madeWith")}</p>
      </footer>
    </div>
  );
}
