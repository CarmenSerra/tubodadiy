import type { ReactNode } from "react";
import type { TFunction } from "i18next";

import type { InvitationLayout } from "@/components/invitation/invitation-layouts";
import { calendarOf, type DateParts } from "@/components/invitation/invitation-model";
import type { Lang } from "@/lib/i18n/config";

/**
 * Las composiciones de la tarjeta: cómo se colocan los nombres, la fecha, la hora
 * y el lugar dentro de la invitación (5:7). Cada una recibe las mismas piezas ya
 * resueltas y decide dónde van; todo se mide en cqw (ancho de la tarjeta), así
 * que escala con ella y cabe sin scroll. Sin hooks: vale para servidor y cliente.
 */

/** «Ana & Luis» → ["Ana", "Luis"]; si no son dos nombres claros, `null`. */
export function splitNames(names: string): [string, string] | null {
  const parts = names.split(/\s*&\s*|\s+\+\s+|\s+(?:y|e|and)\s+/i).filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

export function Names({ names }: { names: string }) {
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

export type NameSize = "l" | "m" | "s" | "xs";

export interface LayoutPieces {
  layout: InvitationLayout;
  t: TFunction;
  lang: Lang;
  names: string;
  nameSize: NameSize;
  /** `yyyy-MM-dd` o vacío. */
  date: string;
  parts: DateParts | null;
  /** «Sábado, 24 de octubre de 2026» (para lectores de pantalla y filas de texto). */
  longDate: string;
  /** Hora ya formateada («13:00 h») y en bruto («13:00»). */
  time: string;
  rawTime: string;
  venue: string;
  later: string;
  laterSame: boolean;
  /** Etiqueta «¡Nos casamos!». */
  eyebrow: string;
  message: string;
  /** Adorno central (ramita, rombo o línea de puntos). */
  ornament: ReactNode;
  /**
   * Las plantillas de dibujitos llevan su ilustración en TODAS las composiciones; en las
   * demás plantillas, calendario, medallón y vertical no llevan adorno central.
   */
  ornamentAlways?: boolean;
  /** «¿Nos acompañas?» (enlace o texto). */
  join: ReactNode;
}

// ---- Piezas sueltas ----

function NamesHeading({ p, className }: { p: LayoutPieces; className?: string }) {
  return (
    <h1 className={className ? `inv-names ${className}` : "inv-names"} data-size={p.nameSize}>
      <Names names={p.names} />
    </h1>
  );
}

function Intro({ p }: { p: LayoutPieces }) {
  return (
    <div className="inv-cardIntro">
      <p className="inv-eyebrow">{p.eyebrow}</p>
      {p.message && <p className="inv-cardMessage">{p.message}</p>}
    </div>
  );
}

function LaterLines({ p }: { p: LayoutPieces }) {
  return (
    <>
      {p.later && (
        <p className="inv-cardLater">
          {p.t("view.later")} <strong>{p.later}</strong>
        </p>
      )}
      {p.laterSame && <p className="inv-cardLater">{p.t("view.laterSame")}</p>}
    </>
  );
}

/** Lugar de la boda (con «después…» si lo hay). */
function Place({ p }: { p: LayoutPieces }) {
  if (!p.venue && !p.later && !p.laterSame) return null;
  return (
    <div className="inv-cardPlace">
      {p.venue && <p className="inv-cardVenue">{p.venue}</p>}
      <LaterLines p={p} />
    </div>
  );
}

/** «13:00 h · El Parque de la Marquesa» en una línea (con «después…» debajo). */
function WhereLine({ p }: { p: LayoutPieces }) {
  if (!p.time && !p.venue && !p.later && !p.laterSame) return null;
  return (
    <div className="inv-cardPlace">
      {(p.time || p.venue) && (
        <p className="inv-whereLine">
          {p.time && <span className="inv-whereTime">{p.time}</span>}
          {p.time && p.venue && (
            <span className="inv-whereDot" aria-hidden="true">
              ·
            </span>
          )}
          {p.venue && <span className="inv-whereVenue">{p.venue}</span>}
        </p>
      )}
      <LaterLines p={p} />
    </div>
  );
}

// ---- Clásico: [Día de la semana] | [MES / día / año] | [hora] ----

function Classic(p: LayoutPieces) {
  const { parts, time } = p;
  return (
    <>
      <NamesHeading p={p} />
      <Intro p={p} />
      {(parts || time) && (
        <div className="inv-strip">
          {parts && <p className="inv-stripCell inv-stripWeekday">{parts.weekday}</p>}
          {parts && (
            <p className="inv-stripCell inv-stripDate">
              <span className="inv-stripMonth">{parts.month}</span>
              <span className="inv-stripDay">{parts.day}</span>
              <span className="inv-stripYear">{parts.year}</span>
            </p>
          )}
          {time && <p className="inv-stripCell inv-stripTime">{time}</p>}
        </div>
      )}
      <Place p={p} />
      {p.ornament}
      {p.join}
    </>
  );
}

// ---- Fecha grande: «24 · 10 · 2026» enorme, hora y lugar debajo en una línea ----

function BigDate(p: LayoutPieces) {
  const { parts } = p;
  return (
    <>
      <NamesHeading p={p} />
      <Intro p={p} />
      {parts && (
        <div className="inv-bd">
          <p className="inv-bdWeekday" aria-hidden="true">
            {parts.weekday}
          </p>
          <p className="inv-bdNumbers" aria-hidden="true">
            <span>{parts.day}</span>
            <i>·</i>
            <span>{parts.monthNumber}</span>
            <i>·</i>
            <span>{parts.year}</span>
          </p>
          <span className="sr-only">{p.longDate}</span>
        </div>
      )}
      <WhereLine p={p} />
      {p.ornament}
      {p.join}
    </>
  );
}

// ---- Calendario: el mes con el día rodeado por un corazón ----

const HEART =
  "M12 20.6C5 15.2 2 11.6 2 8.1C2 4.9 4.4 3 6.9 3C9 3 10.8 4.1 12 6.1C13.2 4.1 15 3 17.1 3C19.6 3 22 4.9 22 8.1C22 11.6 19 15.2 12 20.6Z";

function Calendar(p: LayoutPieces) {
  const cal = calendarOf(p.date, p.lang);
  return (
    <>
      <NamesHeading p={p} />
      <Intro p={p} />
      {cal && (
        <div className="inv-cal">
          <p className="inv-calTitle" aria-hidden="true">
            {cal.title}
          </p>
          <div className="inv-calGrid" aria-hidden="true">
            {cal.weekdays.map((w, i) => (
              <span key={`h${i}`} className="inv-calHead">
                {w}
              </span>
            ))}
            {cal.cells.map((c, i) =>
              c === null ? (
                <span key={i} className="inv-calCell" />
              ) : c === cal.day ? (
                <span key={i} className="inv-calCell inv-calOn">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d={HEART} />
                  </svg>
                  <b>{c}</b>
                </span>
              ) : (
                <span key={i} className="inv-calCell">
                  {c}
                </span>
              )
            )}
          </div>
          <span className="sr-only">{p.longDate}</span>
        </div>
      )}
      <WhereLine p={p} />
      {p.ornamentAlways && p.ornament}
      {p.join}
    </>
  );
}

// ---- Columna lateral: nombres a la izquierda; fecha, hora y lugar a la derecha ----

function Sidebar(p: LayoutPieces) {
  const { parts } = p;
  const hasInfo = parts || p.time || p.venue || p.later || p.laterSame;
  return (
    <>
      <p className="inv-eyebrow">{p.eyebrow}</p>
      <div className="inv-sb">
        <NamesHeading p={p} />
        {hasInfo && (
          <div className="inv-sbInfo">
            {parts && (
              <>
                <p className="inv-sbWeekday" aria-hidden="true">
                  {parts.weekday}
                </p>
                <p className="inv-sbDay" aria-hidden="true">
                  {parts.day}
                </p>
                <p className="inv-sbMonth" aria-hidden="true">
                  {parts.month} {parts.year}
                </p>
                <span className="sr-only">{p.longDate}</span>
              </>
            )}
            {p.time && <p className="inv-sbTime">{p.time}</p>}
            {p.venue && <p className="inv-sbVenue">{p.venue}</p>}
            <LaterLines p={p} />
          </div>
        )}
      </div>
      {p.message && <p className="inv-cardMessage">{p.message}</p>}
      {p.ornament}
      {p.join}
    </>
  );
}

// ---- Editorial: nombres enormes y la fecha escrita como una frase ----

function Editorial(p: LayoutPieces) {
  const { t, parts } = p;
  const weekday = p.lang === "en" ? parts?.weekday : parts?.weekday.toLocaleLowerCase(p.lang);
  const pieces = [
    parts
      ? t("view.layout.sentence.date", { weekday, day: parts.day, month: parts.month, year: parts.year })
      : "",
    p.rawTime ? t("view.layout.sentence.time", { time: p.rawTime }) : "",
    p.venue ? t("view.layout.sentence.place", { place: p.venue }) : "",
  ].filter(Boolean);
  const sentence = pieces.join(t("view.layout.sentence.joiner"));
  return (
    <>
      <p className="inv-eyebrow">{p.eyebrow}</p>
      <NamesHeading p={p} />
      {sentence && (
        <p className="inv-edText">
          {sentence}
          <span aria-hidden="true">.</span>
        </p>
      )}
      <LaterLines p={p} />
      {p.message && <p className="inv-cardMessage">{p.message}</p>}
      {p.ornament}
      {p.join}
    </>
  );
}

// ---- Arco / medallón: la fecha en un arco entre los nombres ----

function Medallion(p: LayoutPieces) {
  const { parts } = p;
  const pair = splitNames(p.names);
  const [a, b] = pair ?? [p.names, ""];
  return (
    <>
      <p className="inv-eyebrow">{p.eyebrow}</p>
      <h1 className="sr-only">{p.names}</h1>
      <div className="inv-md">
        <p className="inv-names inv-mdName" data-size={p.nameSize} aria-hidden="true">
          {a}
        </p>
        {pair && (
          <p className="inv-mdAmp" aria-hidden="true">
            &amp;
          </p>
        )}
        {parts && (
          <div className="inv-mdArch" aria-hidden="true">
            <p className="inv-mdWeekday">{parts.weekday}</p>
            <p className="inv-mdDay">{parts.day}</p>
            <p className="inv-mdMonth">{parts.month}</p>
            <p className="inv-mdYear">{parts.year}</p>
          </div>
        )}
        {pair && (
          <p className="inv-names inv-mdName" data-size={p.nameSize} aria-hidden="true">
            {b}
          </p>
        )}
        {parts && <span className="sr-only">{p.longDate}</span>}
      </div>
      <WhereLine p={p} />
      {p.message && <p className="inv-cardMessage">{p.message}</p>}
      {p.ornamentAlways && p.ornament}
      {p.join}
    </>
  );
}

// ---- Minimal en bloque: todo a la izquierda con etiquetas pequeñas ----

function Block(p: LayoutPieces) {
  const { t } = p;
  const rows: { key: string; label: string; value: ReactNode }[] = [];
  if (p.longDate) rows.push({ key: "date", label: t("view.layout.labels.date"), value: p.longDate });
  if (p.time) rows.push({ key: "time", label: t("view.layout.labels.time"), value: p.time });
  if (p.venue || p.later || p.laterSame) {
    rows.push({
      key: "place",
      label: t("view.layout.labels.place"),
      value: (
        <>
          {p.venue}
          <LaterLines p={p} />
        </>
      ),
    });
  }
  return (
    <>
      <p className="inv-eyebrow">{p.eyebrow}</p>
      <NamesHeading p={p} />
      {rows.length > 0 && (
        <dl className="inv-blk">
          {rows.map((row) => (
            <div key={row.key} className="inv-blkRow">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {p.message && <p className="inv-cardMessage">{p.message}</p>}
      {p.ornament}
      {p.join}
    </>
  );
}

// ---- Vertical: día de la semana, número, mes y año apilados ----

function Vertical(p: LayoutPieces) {
  const { parts } = p;
  return (
    <>
      <NamesHeading p={p} />
      <Intro p={p} />
      {(parts || p.time) && (
        <div className="inv-vt">
          {parts && (
            <div className="inv-vtStack" aria-hidden="true">
              <p className="inv-vtWeekday">{parts.weekday}</p>
              <p className="inv-vtDay">{parts.day}</p>
              <p className="inv-vtMonth">{parts.month}</p>
              <p className="inv-vtYear">{parts.year}</p>
            </div>
          )}
          {parts && <span className="sr-only">{p.longDate}</span>}
          {p.time && <p className="inv-vtTime">{p.time}</p>}
        </div>
      )}
      <Place p={p} />
      {p.ornamentAlways && p.ornament}
      {p.join}
    </>
  );
}

const LAYOUTS: Record<InvitationLayout, (p: LayoutPieces) => ReactNode> = {
  classic: Classic,
  bigDate: BigDate,
  calendar: Calendar,
  sidebar: Sidebar,
  editorial: Editorial,
  medallion: Medallion,
  block: Block,
  vertical: Vertical,
};

/** Contenido de la tarjeta según su composición. */
export function CardLayoutBody(pieces: LayoutPieces) {
  return <>{LAYOUTS[pieces.layout](pieces)}</>;
}
