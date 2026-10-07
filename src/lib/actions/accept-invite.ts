"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

interface AcceptInviteResult {
  success: boolean;
  planId?: string;
  error?: string;
}

export async function acceptInvite(
  token: string,
  idToken: string
): Promise<AcceptInviteResult> {
  if (!isFirebaseAdminConfigured) {
    return {
      success: false,
      error:
        "El servidor no tiene configuradas las credenciales de Firebase Admin (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).",
    };
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return { success: false, error: "Sesión no válida. Vuelve a iniciar sesión e inténtalo de nuevo." };
  }

  const db = getAdminDb();
  const inviteRef = db.collection("invites").doc(token);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    return { success: false, error: "Esta invitación no existe o ha caducado." };
  }

  const invite = inviteSnap.data()!;

  if (invite.status !== "pending") {
    return { success: false, error: "Esta invitación ya no está disponible." };
  }

  const planRef = db.collection("weddingPlans").doc(invite.planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) {
    return { success: false, error: "El plan de boda asociado a esta invitación ya no existe." };
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
