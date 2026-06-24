// Daily Briefing overrides per (market, date).

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import type { BriefingOverride } from "../briefing-store";

const COL = "briefings";

function bId(market: string, date: string) {
  return `${market}__${date}`;
}

export async function saveBriefingDoc(o: BriefingOverride) {
  await setDoc(doc(db, COL, bId(o.market, o.date)), o);
}

export async function deleteBriefingDoc(market: string, date: string) {
  await deleteDoc(doc(db, COL, bId(market, date)));
}

export function subscribeBriefings(cb: (rows: BriefingOverride[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COL), (snap) => {
    cb(snap.docs.map((d) => d.data() as BriefingOverride));
  });
}
