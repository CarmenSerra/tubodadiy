"use client";

import { STATIONERY_CATEGORY } from "@/lib/auto-tasks";
import { syncStepQuietly } from "@/lib/firebase/mutations";

/**
 * «Enviar invitaciones» (paso Papelería) cuenta como hecha cuando la invitación
 * está publicada (el enlace ya se puede compartir); al despublicarla se
 * desmarca. `saveInvitation` (si `published`) y `setInvitationPublished` ya lo
 * llaman: quien guarde una invitación por otro camino debe llamarlo. Nunca lanza.
 */
export async function markInvitationsSent(planId: string, published: boolean): Promise<void> {
  await syncStepQuietly(planId, STATIONERY_CATEGORY, { invitationPublished: published });
}
