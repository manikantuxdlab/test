// User profile records (mirrors mock users, identifies which auth account belongs
// to which mock user). Used by the seed route + login (username -> email lookup).

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import type { MockUser } from "../mock-data";

const COL = "users";

export interface UserProfile extends MockUser {
  authUid?: string;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export async function upsertUserProfile(u: UserProfile) {
  await setDoc(doc(db, COL, u.id), stripUndefined(u as unknown as Record<string, unknown>), {
    merge: true,
  });
}

export async function findUserByUsername(identifier: string): Promise<UserProfile | null> {
  const id = identifier.trim().toLowerCase();
  // Try username, then email.
  const q1 = query(collection(db, COL), where("username", "==", id));
  let snap = await getDocs(q1);
  if (snap.empty) {
    const q2 = query(collection(db, COL), where("email", "==", id));
    snap = await getDocs(q2);
  }
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

export function subscribeUsers(cb: (rows: UserProfile[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COL), (snap) => {
    cb(snap.docs.map((d) => d.data() as UserProfile));
  });
}
