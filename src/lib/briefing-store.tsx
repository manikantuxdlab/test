// Daily Briefing overrides (admin-authored). Persisted in Firestore + Storage uploads.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDailyDocSet, type DailyDocSet, type Market } from "./mock-data";
import { saveBriefingDoc, subscribeBriefings, deleteBriefingDoc } from "./firestore/briefings";
import {
  subscribeToolboxDocs,
  uploadToolboxFile,
  deleteToolboxDoc,
  type ToolboxDocRecord,
  type ToolboxSection,
} from "./firestore/toolboxDocs";

export interface BriefingDoc {
  id: string;
  name: string;
  type: "pdf" | "doc";
  sizeKb: number;
  url?: string;
}

export interface BriefingOverride {
  market: Market;
  date: string;
  announcement?: { title: string; body: string };
  safety?: { title: string; body: string };
  lesson?: { title: string; body: string };
  documents?: BriefingDoc[]; // legacy local additions
  updatedAt: string;
}

interface BriefingValue {
  overrides: BriefingOverride[];
  getEffectiveDocSet: (market: Market, date: string) => DailyDocSet | undefined;
  getOverride: (market: Market, date: string) => BriefingOverride | undefined;
  saveBriefing: (input: Omit<BriefingOverride, "updatedAt">) => Promise<void>;
  deleteBriefing: (market: Market, date: string) => Promise<void>;
  /** Upload a real file to Storage and attach it to the (market,date,section) briefing. */
  uploadDocument: (
    market: Market,
    date: string,
    file: File,
    section?: ToolboxSection,
  ) => Promise<void>;
  removeDocument: (rec: ToolboxDocRecord) => Promise<void>;
  /** All uploaded toolbox docs (used by daily-briefing list). */
  uploadedDocs: ToolboxDocRecord[];
  /** Attachments for a particular section of (market,date). */
  getSectionAttachments: (
    market: Market,
    date: string,
    section: ToolboxSection,
  ) => ToolboxDocRecord[];
}

const Ctx = createContext<BriefingValue | null>(null);

function key(market: Market, date: string) {
  return `${market}:${date}`;
}

export function BriefingProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<BriefingOverride[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<ToolboxDocRecord[]>([]);

  useEffect(() => subscribeBriefings(setOverrides), []);
  useEffect(() => subscribeToolboxDocs(setUploadedDocs), []);

  const byKey = useMemo(() => {
    const m = new Map<string, BriefingOverride>();
    overrides.forEach((o) => m.set(key(o.market, o.date), o));
    return m;
  }, [overrides]);

  const value: BriefingValue = {
    overrides,
    uploadedDocs,
    getOverride: (market, date) => byKey.get(key(market, date)),
    getEffectiveDocSet: (market, date) => {
      // Find the custom override for this exact date
      const ov = overrides.find((o) => o.market === market && o.date === date);
      const base = getDailyDocSet(market, date);

      // Resolve uploads for this exact date
      const uploads = uploadedDocs
        .filter(
          (d) => d.market === market && d.date === date && (d.section ?? "toolbox") === "toolbox",
        )
        .map(
          (d) =>
            ({ id: d.id, name: d.name, type: d.type, sizeKb: d.sizeKb, url: d.url }) as BriefingDoc,
        );

      if (!base && !ov && uploads.length === 0) return undefined;

      const effective: DailyDocSet = {
        date,
        market,
        announcement: { id: `a-${market}-${date}`, title: "", body: "" },
        safety: { id: `s-${market}-${date}`, title: "", body: "" },
        lesson: { id: `l-${market}-${date}`, title: "", body: "" },
        documents: [],
      };

      if (ov) {
        if (ov.announcement)
          effective.announcement = { ...effective.announcement, ...ov.announcement };
        if (ov.safety) effective.safety = { ...effective.safety, ...ov.safety };
        if (ov.lesson) effective.lesson = { ...effective.lesson, ...ov.lesson };

        // Only include real uploaded toolbox docs (from the toolboxDocs collection).
        // Legacy documents embedded in the override record are ignored.
        if (uploads.length) {
          effective.documents = uploads.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            sizeKb: d.sizeKb,
            url: d.url,
          }));
        }
      } else if (base) {
        // Fallback to base mock data
        effective.announcement = { ...base.announcement, id: `a-${market}-${date}` };
        effective.safety = { ...base.safety, id: `s-${market}-${date}` };
        effective.lesson = { ...base.lesson, id: `l-${market}-${date}` };
        effective.documents = base.documents.map((d) => ({
          ...d,
          id: `d-${market}-${date}-${d.id}`,
        }));
      }

      return effective;
    },
    saveBriefing: async (input) => {
      const rec: BriefingOverride = { ...input, updatedAt: new Date().toISOString() };
      const previous = overrides;
      setOverrides((prev) => [
        ...prev.filter((o) => !(o.market === input.market && o.date === input.date)),
        rec,
      ]);
      try {
        await saveBriefingDoc(rec);
      } catch (err) {
        setOverrides(previous);
        throw err;
      }
    },
    deleteBriefing: async (market, date) => {
      const previous = overrides;
      setOverrides((prev) => prev.filter((o) => !(o.market === market && o.date === date)));
      try {
        await deleteBriefingDoc(market, date);
      } catch (err) {
        setOverrides(previous);
        throw err;
      }
    },
    uploadDocument: async (market, date, file, section = "toolbox") => {
      await uploadToolboxFile(market, date, file, section);
    },
    removeDocument: async (rec) => {
      await deleteToolboxDoc(rec);
    },
    getSectionAttachments: (market, date, section) => {
      return uploadedDocs.filter(
        (d) => d.market === market && d.date === date && (d.section ?? "toolbox") === section,
      );
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBriefing() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBriefing must be used inside BriefingProvider");
  return ctx;
}
