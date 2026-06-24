// Toolbox documents (uploaded files attached to a market+date briefing).

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import type { Market } from "../mock-data";

export type ToolboxSection = "announcement" | "safety" | "lesson" | "toolbox";

export interface ToolboxDocRecord {
  id: string;
  market: Market;
  date: string;
  name: string;
  type: "pdf" | "doc";
  sizeKb: number;
  storagePath: string;
  url: string;
  uploadedAt: string;
  section?: ToolboxSection; // defaults to "toolbox" when missing
}

const COL = "toolboxDocs";

export async function uploadToolboxFile(
  market: Market,
  date: string,
  file: File,
  section: ToolboxSection = "toolbox",
): Promise<ToolboxDocRecord> {
  const id = `tb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  // Keep the legacy Storage path shape so existing bucket rules still allow uploads.
  // Section metadata stays in Firestore; it does not need to be encoded in the file path.
  const storagePath = `toolbox/${market}/${date}/${id}-${safeName}`;
  const sref = ref(storage, storagePath);
  await uploadBytes(sref, file);
  const url = await getDownloadURL(sref);
  const type: "pdf" | "doc" = /\.docx?$/i.test(file.name) ? "doc" : "pdf";
  const rec: ToolboxDocRecord = {
    id,
    market,
    date,
    name: file.name,
    type,
    sizeKb: Math.max(1, Math.round(file.size / 1024)),
    storagePath,
    url,
    uploadedAt: new Date().toISOString(),
    section,
  };
  await setDoc(doc(db, COL, id), rec);
  return rec;
}

export async function deleteToolboxDoc(rec: ToolboxDocRecord) {
  try {
    await deleteObject(ref(storage, rec.storagePath));
  } catch {
    /* file may already be gone */
  }
  await deleteDoc(doc(db, COL, rec.id));
}

export function subscribeToolboxDocs(cb: (rows: ToolboxDocRecord[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COL), (snap) => {
    cb(snap.docs.map((d) => d.data() as ToolboxDocRecord));
  });
}
