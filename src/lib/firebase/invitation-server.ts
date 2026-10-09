import "server-only";

import {
  SLUG_RE,
  cleanContent,
  cleanInvitationGift,
  isDeadlinePassed,
  type InvitationPublicData,
} from "@/components/invitation/invitation-model";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

export interface PublicInvitation {
  slug: string;
  data: InvitationPublicData;
  /** El plazo para confirmar ya pasó. */
  closed: boolean;
}

/** Invitación publicada para la página del enlace, o `null` si no existe / no está publicada. */
export async function getPublishedInvitation(slug: string): Promise<PublicInvitation | null> {
  if (!isFirebaseAdminConfigured || !SLUG_RE.test(slug)) return null;
  try {
    const snap = await getAdminDb().collection("publicInvitations").doc(slug).get();
    const raw = snap.data();
    if (!raw || raw.published !== true) return null;

    const content = cleanContent(raw);
    // Solo se enseña si la pareja lo permite; el contenido se sanea al leerlo (dinero o lista).
    const gift = content.showGift ? cleanInvitationGift(raw.gift) : null;
    const { showGift, ...rest } = content;
    void showGift;
    return {
      slug,
      data: { ...rest, gift },
      closed: isDeadlinePassed(content.rsvpDeadline),
    };
  } catch (error) {
    console.error("No se pudo leer la invitación pública", error);
    return null;
  }
}
