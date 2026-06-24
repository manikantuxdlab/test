// Directory edits (overlay on top of mock users).

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import type { DirectoryEdit } from "../directory-store";

const COL = "directoryEdits";

export async function saveDirectoryEdit(edit: DirectoryEdit) {
  await setDoc(doc(db, COL, edit.id), edit);
}

export async function deleteDirectoryEdit(id: string) {
  await deleteDoc(doc(db, COL, id));
}

export function subscribeDirectoryEdits(cb: (rows: DirectoryEdit[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COL), (snap) => {
    cb(snap.docs.map((d) => d.data() as DirectoryEdit));
  });
}
