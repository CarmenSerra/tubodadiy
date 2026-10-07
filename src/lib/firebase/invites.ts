"use client";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import type { PlanInvite, PlanRole } from "@/lib/types";

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createInvite(input: {
  planId: string;
  planTitle: string;
  email: string;
  role: PlanRole;
  invitedByUid: string;
}): Promise<string> {
  const token = randomToken();
  const db = getFirebaseDb();
  await setDoc(doc(db, "invites", token), {
    planId: input.planId,
    planTitle: input.planTitle,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    status: "pending",
    invitedByUid: input.invitedByUid,
    createdAt: serverTimestamp(),
  });
  return token;
}

export function pendingInvitesQuery(planId: string) {
  const db = getFirebaseDb();
  return query(
    collection(db, "invites"),
    where("planId", "==", planId),
    where("status", "==", "pending")
  );
}

export function mapInvite(id: string, data: DocumentData): PlanInvite {
  return {
    token: id,
    planId: data.planId,
    planTitle: data.planTitle ?? "",
    email: data.email,
    role: data.role,
    status: data.status,
    invitedByUid: data.invitedByUid,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : null,
  };
}

export async function getInviteByToken(token: string): Promise<PlanInvite | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "invites", token));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    token: snap.id,
    planId: data.planId,
    planTitle: data.planTitle ?? "",
    email: data.email,
    role: data.role,
    status: data.status,
    invitedByUid: data.invitedByUid,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : null,
  };
}
