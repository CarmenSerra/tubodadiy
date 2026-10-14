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
import { InvitationBackdrop, MotifSprig, isMotif } from "@/components/invitation/invitation-backgrounds";
import { CardLayoutBody, type NameSize } from "@/components/invitation/invitation-card-layouts";
import { DEFAULT_LAYOUT } from "@/components/invitation/invitation-layouts";
import { TemplateDecor, TemplateOrnament, isDoodleTemplate } from "@/components/invitation/invitation-template-decor";
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
import { buildTheme, LEGACY_COLORS, type InvitationTheme } from "@/components/invitation/invitation-theme";
import type { Lang } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/i18n/format";
import { getServerT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

import "./invitation.css";

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
function nameSize(names: string): NameSize {
  const length = names.length;
  return length <= 12 ? "l" : length <= 20 ? "m" : length <= 36 ? "s" : "xs";
}

/** Los lugares de la invitación y lo que lleva la tarjeta (hora, sitio y «después…»). */
function resolvePlaces(data: InvitationPublicData, t: TFunction, lang: Lang) {
  // Un único bloque si es el mismo sitio (o falta uno); dos si son distintos.
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
  return {
    placeBlocks,
    // «…en el mismo lugar»: hay datos de los dos y son el mismo sitio.
    laterSame: hasCeremony && hasBanquet && same,
    cardTime: timeOf(ceremony) || timeOf(banquet),
    rawTime: ceremony.time || banquet.time,
    cardPlace: venue.name || venue.address,
    later: !same ? banquet.name || banquet.address : "",
  };
}

/** Tema de color de una invitación: con su paleta o, si es antigua, con los colores de su plantilla. */
export function themeOfInvitation(data: Pick<InvitationPublicData, "palette" | "template">): InvitationTheme {
  return buildTheme(data.palette?.colors ?? LEGACY_COLORS[data.template], data.template);
}

/**
 * La tarjeta de la invitación (proporción 5:7), sin la tarjeta de la página ni el
 * resto de bloques: la usan la página pública y la composición de la vista previa.
 * Ya no lleva imagen arriba; con un fondo de motivos, el adorno central es una
 * ramita de ese motivo.
 */
export function InvitationCard({
  data,
  preview = false,
  rise = false,
}: {
  data: InvitationPublicData;
  preview?: boolean;
  rise?: boolean;
}) {
  const lang = data.lang;
  const t = getServerT(lang, "invitation");
  const parts = dateParts(data.date, lang);
  const names = data.names || "Ana & Luis";
  const { cardTime, rawTime, cardPlace, later, laterSame } = resolvePlaces(data, t, lang);
  const layout = data.layout ?? DEFAULT_LAYOUT;
  const theme = themeOfInvitation(data);

  const doodleStyle = isDoodleTemplate(data.template);
  // Las plantillas de dibujitos llevan su propio adorno central (corazones con iniciales, hilo, pareja…).
  const ornament = doodleStyle ? (
    <TemplateOrnament template={data.template} names={names} />
  ) : isMotif(data.background) ? (
    <MotifSprig motif={data.background} />
  ) : data.template === "elegante" ? (
    <DiamondDivider className="inv-ornament" />
  ) : data.template === "minimal" ? (
    <DotRule className="inv-ornament" />
  ) : (
    <Sprig className="inv-ornament" />
  );

  const join = preview ? (
    <p className="inv-cardJoin">{t("view.rsvpTitle")}</p>
  ) : (
    <a href="#confirmar" className="inv-cardJoin">
      {t("view.rsvpTitle")}
      <ChevronDownIcon aria-hidden="true" />
    </a>
  );

  return (
    <div
      className={cn("inv-card", "inv-noArt", rise && "inv-rise")}
      data-layout={layout}
      data-motif={isMotif(data.background) ? data.background : undefined}
    >
      {(data.palette || data.background) && <InvitationBackdrop kind={data.background} theme={theme} />}
      {doodleStyle && <TemplateDecor template={data.template} palette={data.palette} names={names} />}
      <div className="inv-cardBody">
        <CardLayoutBody
          layout={layout}
          t={t}
          lang={lang}
          names={names}
          nameSize={nameSize(names)}
          date={data.date}
          parts={parts}
          longDate={formatLongDate(data.date, lang)}
          time={cardTime}
          rawTime={rawTime}
          venue={cardPlace}
          later={later}
          laterSame={laterSame}
          eyebrow={data.template === "minimal" ? t("view.eyebrowMinimal") : t("view.eyebrow")}
          message={data.message}
          ornament={ornament}
          ornamentAlways={doodleStyle}
          join={join}
        />
      </div>
    </div>
  );
}

export function InvitationView({ data, mode = "page", rsvp, closed = false }: InvitationViewProps) {
  // El texto de la invitación sigue el idioma que eligió la pareja, no el de quien la abre.
  const lang = data.lang;
  const t = getServerT(lang, "invitation");
  const longDate = formatLongDate(data.date, lang);
  const preview = mode === "preview";
  const names = data.names || "Ana & Luis";

  const { placeBlocks } = resolvePlaces(data, t, lang);
  const hasWhen = placeBlocks.length > 0;
  const deadline = formatShortDate(data.rsvpDeadline, lang);
  // «Hilo» (y «Azulejo» en las composiciones más cargadas) deja la tarjeta sin mensaje: va debajo.
  const hidesCardMessage =
    data.template === "hilo" ||
    (data.template === "azulejo" && ["calendar", "vertical", "medallion"].includes(data.layout ?? DEFAULT_LAYOUT));
  const longMessage = data.message.length > 130 || (hidesCardMessage && data.message.trim().length > 0);
  const Body = preview ? "div" : "main";

  // Con paleta, las variables de color salen de ella; sin paleta (invitaciones anteriores)
  // mandan los colores de la plantilla. La mesa de detrás de la tarjeta es siempre lisa:
  // el fondo elegido (rayas, motivos…) va dentro de la tarjeta.
  const palette = data.palette;
  const theme = themeOfInvitation(data);

  return (
    <div
      className={cn("inv-root", `inv-${data.template}`, preview && "inv-preview")}
      data-template={data.template}
      data-themed={palette ? "" : undefined}
      style={palette ? (theme.vars as CSSProperties) : undefined}
      lang={lang}
    >
      <Body className="inv-main">
        <section className="inv-stage" aria-label={t("view.cardLabel")}>
          <InvitationCard data={data} preview={preview} rise={!preview} />
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
