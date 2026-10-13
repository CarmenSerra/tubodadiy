import type { Metadata } from "next";
import { connection } from "next/server";

import { InvitationView } from "@/components/invitation/invitation-view";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import { formatLongDate } from "@/components/invitation/invitation-model";
import { getPublishedInvitation } from "@/lib/firebase/invitation-server";
import { getRequestLang } from "@/lib/i18n/request";
import { getServerT } from "@/lib/i18n/server";

// La invitación es privada por enlace: no se indexa ni se sigue.
const NO_INDEX: Metadata["robots"] = { index: false, follow: false, nocache: true };

export async function generateMetadata({ params }: PageProps<"/i/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const invitation = await getPublishedInvitation(slug);
  if (!invitation) {
    // Sin invitación no hay idioma elegido por la pareja: se usa el de quien abre el enlace.
    const t = getServerT(await getRequestLang(), "invitation");
    return { title: t("page.unavailable.metaTitle"), robots: NO_INDEX };
  }
  const { names, date, lang } = invitation.data;
  // La metadata sigue el idioma de la invitación, igual que la página.
  const t = getServerT(lang, "invitation");
  const when = formatLongDate(date, lang);
  return {
    title: names ? t("page.meta.titleNames", { names }) : t("page.meta.title"),
    description: names
      ? t("page.meta.descriptionNames", { names, when: when ? ` (${when})` : "" })
      : t("page.meta.description", { when: when ? ` (${when})` : "" }),
    robots: NO_INDEX,
  };
}

export default async function InvitationPage({ params }: PageProps<"/i/[slug]">) {
  await connection();
  const { slug } = await params;
  const invitation = await getPublishedInvitation(slug);

  if (!invitation) {
    const t = getServerT(await getRequestLang(), "invitation");
    return (
      <div className="inv-root inv-botanico">
        <main className="inv-unavailable">
          <h1 className="inv-thanksTitle">{t("page.unavailable.title")}</h1>
          <p className="inv-thanksText">{t("page.unavailable.text")}</p>
        </main>
      </div>
    );
  }

  return (
    <InvitationView
      data={invitation.data}
      closed={invitation.closed}
      rsvp={<RsvpForm slug={invitation.slug} lang={invitation.data.lang} />}
    />
  );
}
