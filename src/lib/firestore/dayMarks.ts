// Day marks (OFF / PTO / ELR / LOA / HOL) per user per day.
// Doc id = `${userId}__${date}`.

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import type { DayStatus } from "../schedule-store";

export interface DayMarkRecord {
  id: string;
  userId: string;
  date: string;
  status: DayStatus;
}

const COL = "dayMarks";

function markId(userId: string, date: string) {
  return `${userId}__${date}`;
}

export async function setDayMarkDoc(userId: string, date: string, status: DayStatus | null) {
  const id = markId(userId, date);
  if (status === null) {
    await deleteDoc(doc(db, COL, id));
    return;
  }
  await setDoc(doc(db, COL, id), { id, userId, date, status });
}

export function subscribeDayMarks(cb: (rows: DayMarkRecord[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COL), (snap) => {
    cb(snap.docs.map((d) => d.data() as DayMarkRecord));
  });
}
