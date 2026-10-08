import type { Metadata } from "next";
import { connection } from "next/server";

import { InvitationView } from "@/components/invitation/invitation-view";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import { formatLongDate } from "@/components/invitation/invitation-model";
import { getPublishedInvitation } from "@/lib/firebase/invitation-server";


// La invitación es privada por enlace: no se indexa ni se sigue.
const NO_INDEX: Metadata["robots"] = { index: false, follow: false, nocache: true };

export async function generateMetadata({ params }: PageProps<"/i/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const invitation = await getPublishedInvitation(slug);
  if (!invitation) {
    return { title: "Invitación no disponible", robots: NO_INDEX };
  }
  const { names, date } = invitation.data;
  const when = formatLongDate(date);
  return {
    title: names ? `${names} — Invitación de boda` : "Invitación de boda",
    description: `Estás invitado/a a la boda${names ? ` de ${names}` : ""}${when ? ` (${when})` : ""}. Confirma tu asistencia.`,
    robots: NO_INDEX,
  };
}

export default async function InvitationPage({ params }: PageProps<"/i/[slug]">) {
  await connection();
  const { slug } = await params;
  const invitation = await getPublishedInvitation(slug);

  if (!invitation) {
    return (
      <div className="inv-root inv-botanico">
        <main className="inv-unavailable">
          <h1 className="inv-thanksTitle">Esta invitación no está disponible</h1>
          <p className="inv-thanksText">
            Puede que el enlace esté mal escrito o que la pareja aún no la haya publicado. Pregúntales por
            el enlace correcto.
          </p>
        </main>
      </div>
    );
  }

  return (
    <InvitationView
      data={invitation.data}
      closed={invitation.closed}
      rsvp={<RsvpForm slug={invitation.slug} />}
    />
  );
}
