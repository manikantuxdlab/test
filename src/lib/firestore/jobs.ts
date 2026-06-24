// Custom jobs (admin-created via Schedule Builder). Mock/base jobs stay computed
// in mock-data and are merged client-side in schedule-store.

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Job } from "../schedule-store";

const COL = "customJobs";

export async function upsertJob(job: Job) {
  await setDoc(doc(db, COL, job.id), job);
}

export async function deleteJobDoc(id: string) {
  await deleteDoc(doc(db, COL, id));
}

/** Patches stored on top of mock base jobs (id starts with `mock-`). */
const PATCH_COL = "jobPatches";

export async function upsertJobPatch(job: Job) {
  await setDoc(doc(db, PATCH_COL, job.id), job);
}

export function subscribeJobs(cb: (custom: Job[], patches: Job[]) => void): Unsubscribe {
  let custom: Job[] = [];
  let patches: Job[] = [];
  const u1 = onSnapshot(collection(db, COL), (snap) => {
    custom = snap.docs.map((d) => d.data() as Job);
    cb(custom, patches);
  });
  const u2 = onSnapshot(collection(db, PATCH_COL), (snap) => {
    patches = snap.docs.map((d) => d.data() as Job);
    cb(custom, patches);
  });
  return () => {
    u1();
    u2();
  };
}
