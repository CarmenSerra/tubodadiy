"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

/** Motivo del fallo: el cliente lo traduce con `errors:invite.accept.<code>`. */
export type AcceptInviteError =
  | "serverNotConfigured"
  | "invalidSession"
  | "notFound"
  | "unavailable"
  | "planGone";

interface AcceptInviteResult {
  success: boolean;
  planId?: string;
  error?: AcceptInviteError;
}

export async function acceptInvite(
  token: string,
  idToken: string
): Promise<AcceptInviteResult> {
  if (!isFirebaseAdminConfigured) {
    return { success: false, error: "serverNotConfigured" };
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return { success: false, error: "invalidSession" };
  }

  const db = getAdminDb();
  const inviteRef = db.collection("invites").doc(token);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    return { success: false, error: "notFound" };
  }

  const invite = inviteSnap.data()!;

  if (invite.status !== "pending") {
    return { success: false, error: "unavailable" };
  }

  const planRef = db.collection("weddingPlans").doc(invite.planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) {
    return { success: false, error: "planGone" };
  }

  const uid = decoded.uid;

  await db.runTransaction(async (tx) => {
    tx.update(planRef, { memberIds: FieldValue.arrayUnion(uid) });
    tx.set(planRef.collection("members").doc(uid), {
      role: invite.role,
      status: "accepted",
      invitedEmail: invite.email,
    });
    tx.update(inviteRef, { status: "accepted", acceptedByUid: uid });
    tx.set(
      db.collection("users").doc(uid),
      {
        email: decoded.email ?? invite.email,
        name: decoded.name ?? "",
      },
      { merge: true }
    );
  });

  return { success: true, planId: invite.planId };
}
