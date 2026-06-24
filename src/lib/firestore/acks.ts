// Acknowledgements persisted in Firestore.
// Doc id = `${userId}__${itemId}` so writes are idempotent.

import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";

export interface AckRecord {
  userId: string;
  itemId: string;
  ackedAt: string; // ISO
}

const COL = "acknowledgements";

function ackId(userId: string, itemId: string) {
  return `${userId}__${itemId}`;
}

export async function writeAck(userId: string, itemId: string) {
  const rec: AckRecord = { userId, itemId, ackedAt: new Date().toISOString() };
  await setDoc(doc(db, COL, ackId(userId, itemId)), rec, { merge: true });
}

/** Subscribes to ALL acks for the entire app (used by staff dashboards). Volume is small in this prototype. */
export function subscribeAllAcks(cb: (rows: AckRecord[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, COL)), (snap) => {
    cb(snap.docs.map((d) => d.data() as AckRecord));
  });
}

/** Subscribes to acks for one user. */
export function subscribeUserAcks(userId: string, cb: (rows: AckRecord[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, COL), where("userId", "==", userId)), (snap) => {
    cb(snap.docs.map((d) => d.data() as AckRecord));
  });
}
