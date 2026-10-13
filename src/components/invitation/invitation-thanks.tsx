import { MotifCorners, isMotif } from "@/components/invitation/invitation-backgrounds";
import type { InvitationGift, InvitationPublicData } from "@/components/invitation/invitation-model";
import { getServerT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

import "./invitation.css";

/** «Ana & Luis» → ["Ana", "Luis"]; si no son dos nombres claros, `null`. */
function splitNames(names: string): [string, string] | null {
  const parts = names.split(/\s*&\s*|\s+\+\s+|\s+(?:y|e|and)\s+/i).filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

/** Iniciales del monograma: «María José y Juan» → ["M", "J"]; con un solo nombre, una sola. */
export function initialsOf(names: string): string[] {
  const first = (text: string) => Array.from(text.trim())[0]?.toLocaleUpperCase() ?? "";
  const pair = splitNames(names);
  const list = pair ? [first(pair[0]), first(pair[1])] : [first(names)];
  return list.filter(Boolean);
}

/** `yyyy-MM-dd` → `dd.MM.yyyy` (o vacío). */
export function dottedDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
}

/**
 * Tarjeta pequeña de agradecimiento (la que va sobre la invitación en la vista
 * previa): fecha, frase, «Muchas gracias», el regalo (IBAN, lista o mensaje; nada
 * si no hay regalo) y el monograma con las iniciales. Con un fondo de motivos,
 * lleva ramitas de ese motivo por los bordes.
 */
export function ThanksCard({ data, gift }: { data: InvitationPublicData; gift?: InvitationGift | null }) {
  const lang = data.lang;
  const t = getServerT(lang, "invitation");
  const date = dottedDate(data.date);
  const initials = initialsOf(data.names || "Ana & Luis");
  const shownGift = gift === undefined ? data.gift : gift;

  let giftLine: { label: string; value: string } | null = null;
  if (shownGift) {
    if (shownGift.mode === "list") {
      giftLine = { label: "", value: shownGift.message || t("view.thanks.giftList") };
    } else if (shownGift.iban) {
      giftLine = { label: t("view.gift.ibanName"), value: shownGift.iban };
    } else if (shownGift.bizum) {
      giftLine = { label: t("view.gift.bizum"), value: shownGift.bizum };
    } else if (shownGift.message) {
      giftLine = { label: "", value: shownGift.message };
    }
  }

  return (
    <section className={cn("inv-grat")} aria-label={t("view.thanks.label")}>
      {isMotif(data.background) && <MotifCorners motif={data.background} variant="card" />}
      <div className="inv-gratBody">
        {date && <p className="inv-gratDate">{date}</p>}
        <p className="inv-gratPhrase">{t("view.thanks.phrase")}</p>
        <p className="inv-gratThanks">{t("view.thanks.thanks")}</p>
        {giftLine && (
          <p className="inv-gratGift">
            {giftLine.label && <span className="inv-gratGiftLabel">{giftLine.label} </span>}
            <span className="inv-gratGiftValue">{giftLine.value}</span>
          </p>
        )}
        {initials.length > 0 && (
          <p className="inv-gratMono">
            {initials.map((letter, i) => (
              <span key={i}>
                {i > 0 && <span className="inv-gratAmp">&amp;</span>}
                {letter}
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}
