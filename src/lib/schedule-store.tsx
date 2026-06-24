// Job-centric schedule store backed by Firestore for custom jobs, patches to base
// jobs, and day marks. Base jobs still derive from mock-data.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  schedules,
  users,
  TODAY,
  getDailyDocSet,
  getMaxPreviousDatesForMarket,
  type MockUser,
} from "./mock-data";
import { subscribeJobs, upsertJob, upsertJobPatch, deleteJobDoc } from "./firestore/jobs";
import { setDayMarkDoc, subscribeDayMarks, type DayMarkRecord } from "./firestore/dayMarks";

export type DayStatus = "OFF" | "PTO" | "ELR" | "LOA" | "HOL";

/** Returns true when a towerOwner value should be treated as "not set". */
export function isBlankOwner(val: string | undefined | null): boolean {
  if (!val) return true;
  const t = val.trim();
  return t === "" || t === "—" || t === "---" || t === "----" || t.toLowerCase() === "n/a";
}

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  OFF: "Off",
  PTO: "PTO",
  ELR: "ELR",
  LOA: "LOA",
  HOL: "Holiday",
};

export interface Job {
  id: string;
  date: string;
  /** Primary market for filtering. Defaults to inferred-from-crew when missing. */
  market?: "socal" | "vegas";
  crewmanIds: string[];
  managerIds: string[];
  projectCode: string;
  adpNumber: string;
  address: string;
  sow: string;
  workingHours: string;
  towerOwner: string;
  hoursDaysRemaining: string;
  notes?: string;
  status: "upcoming" | "ongoing" | "completed";
  /** Tombstone for base/mock jobs that admin deleted. */
  hidden?: boolean;
  jobType?: string;
  gateCode?: string;
  projectCoordinatorId?: string;
  pcNotes?: string;
  assetScanNotice?: boolean;
  updatedByPC?: boolean;
}

export interface DayMark {
  id: string;
  userId: string;
  date: string;
  status: DayStatus;
}

interface StoreValue {
  jobs: Job[];
  dayMarks: DayMark[];
  addJob: (j: Omit<Job, "id">) => Job;
  updateJob: (id: string, patch: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  copyFrom: (sourceJobId: string, toDate: string) => Job;
  setDayMark: (userId: string, date: string, status: DayStatus | null) => void;
  getDayMark: (userId: string, date: string) => DayMark | undefined;
  getJobsForUser: (userId: string, date?: string) => Job[];
  getNextJobForCrewman: (userId: string, fromDate: string) => Job | undefined;
  isAssigned: (userId: string, date: string) => boolean;
}

const Ctx = createContext<StoreValue | null>(null);
const DAY_MARKS_CACHE_KEY = "x3.dayMarks.cache.v1";

function uid(prefix = "j") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function scheduleToJobId(scheduleId: string) {
  return `mock-${scheduleId}`;
}

export function inferTowerOwner(
  projectCode?: string,
  specialInstructions?: string,
  siteAddress?: string,
): string {
  const code = (projectCode ?? "").toUpperCase();
  const inst = (specialInstructions ?? "").toLowerCase();
  const addr = (siteAddress ?? "").toLowerCase();

  // 1. Explicit Tower owner instruction parsing
  if (inst.includes("tower owner:")) {
    const match = inst.match(/tower owner:\s*([^:\n\r,;.]+)/i);
    if (match && match[1]) {
      const parsed = match[1].trim();
      return parsed
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }

  // 2. Keyword match in instructions or address
  if (inst.includes("crown castle") || inst.includes("crown noc")) return "Crown Castle";
  if (inst.includes("sba")) return "SBA";
  if (inst.includes("american tower") || inst.includes("amt")) return "American Tower";
  if (inst.includes("at&t")) return "AT&T";
  if (inst.includes("phoenix towers")) return "Phoenix Towers";
  if (inst.includes("octagon towers")) return "Octagon Towers";

  // 3. Project code prefix/infix clues
  if (code.includes("CLL")) return "Crown Castle";
  if (code.includes("SBA") || code.includes("SBV")) return "SBA";
  if (code.includes("AMT")) return "American Tower";

  return "";
}

function scheduleToJob(dateJob: (typeof schedules)[number]): Job {
  const memberIds = dateJob.members
    .map((name) => users.find((user) => user.name === name)?.id)
    .filter((id): id is string => Boolean(id));
  const allIds = [...new Set([dateJob.userId, ...memberIds])];

  const crewmanIds: string[] = [];
  const managerIds: string[] = [];

  allIds.forEach((id) => {
    const u = users.find((x) => x.id === id);
    if (
      u?.role === "foreman" ||
      u?.staffOrField === "Staff" ||
      ["admin", "staff"].includes(u?.role ?? "")
    ) {
      managerIds.push(id);
    } else {
      crewmanIds.push(id);
    }
  });

  // Dynamically resolve tower owner from the schedule, falling back to specialInstructions parsing or inference
  let towerOwner = dateJob.towerOwner ?? "";
  if (isBlankOwner(towerOwner)) {
    const inferred = inferTowerOwner(
      dateJob.projectCode,
      dateJob.specialInstructions,
      dateJob.siteAddress,
    );
    if (inferred) {
      towerOwner = inferred;
    }
  }

  return {
    id: scheduleToJobId(dateJob.id),
    date: dateJob.date,
    market: dateJob.market,
    crewmanIds,
    managerIds,
    projectCode: dateJob.projectCode,
    adpNumber: dateJob.adpNumber,
    address: dateJob.siteAddress,
    sow: dateJob.scopeOfWork,
    workingHours: `${dateJob.startTime}–${dateJob.endTime}`,
    towerOwner,
    hoursDaysRemaining: `${dateJob.hoursRemaining}h · ${dateJob.daysRemaining}d`,
    notes: dateJob.specialInstructions,
    status:
      dateJob.date < todayIso()
        ? "completed"
        : dateJob.date === todayIso()
          ? "ongoing"
          : "upcoming",
  };
}

function baseJobs(): Job[] {
  return schedules.map(scheduleToJob);
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [customJobs, setCustomJobs] = useState<Job[]>([]);
  const [patches, setPatches] = useState<Job[]>([]);
  const [dayMarks, setDayMarks] = useState<DayMark[]>([]);

  useEffect(
    () =>
      subscribeJobs((c, p) => {
        setCustomJobs(c);
        setPatches(p);
      }),
    [],
  );

  useEffect(
    () =>
      subscribeDayMarks((rows: DayMarkRecord[]) => {
        setDayMarks(rows);
        // Cache for usePendingAck (sync read).
        try {
          localStorage.setItem(
            DAY_MARKS_CACHE_KEY,
            JSON.stringify(rows.map((r) => ({ userId: r.userId, date: r.date }))),
          );
        } catch {
          /* ignore */
        }
      }),
    [],
  );

  const jobs = useMemo<Job[]>(() => {
    const patchMap = new Map(patches.map((p) => [p.id, p]));
    const merged = baseJobs().map((j) => {
      const p = patchMap.get(j.id);
      if (p) patchMap.delete(j.id);
      const res = p ? { ...j, ...p } : j;
      if (p && isBlankOwner(p.towerOwner) && j.towerOwner) {
        res.towerOwner = j.towerOwner;
      }
      return res;
    });
    // Preserve any unmatched patches (such as mock job patches from previous days)
    const unmatchedPatches = Array.from(patchMap.values());
    const all = [...merged, ...unmatchedPatches, ...customJobs].filter((j) => !j.hidden);

    return all.map((j) => {
      if (isBlankOwner(j.towerOwner)) {
        const inferred = inferTowerOwner(j.projectCode, j.notes, j.address);
        if (inferred) return { ...j, towerOwner: inferred };
      }
      return j;
    });
  }, [customJobs, patches]);

  const visibleDayMarks = useMemo(() => dayMarks, [dayMarks]);

  const value: StoreValue = {
    jobs,
    dayMarks: visibleDayMarks,
    addJob: (j) => {
      const job: Job = { ...j, id: uid() };
      setCustomJobs((prev) => [...prev, job]); // optimistic
      upsertJob(job).catch((e) => console.error("[jobs] add failed", e));
      return job;
    },
    updateJob: (id, patch) => {
      const isMock = id.startsWith("mock-");
      const current = jobs.find((j) => j.id === id) ?? patches.find((p) => p.id === id);
      if (!current) return;
      const next = { ...current, ...patch };
      if (isMock) {
        setPatches((prev) => [...prev.filter((p) => p.id !== id), next]);
        upsertJobPatch(next).catch((e) => console.error("[jobs] patch failed", e));
      } else {
        setCustomJobs((prev) => prev.map((x) => (x.id === id ? next : x)));
        upsertJob(next).catch((e) => console.error("[jobs] update failed", e));
      }
    },
    deleteJob: (id) => {
      if (id.startsWith("mock-")) {
        // Tombstone the base mock job via a patch so it disappears from the merged view.
        const current = jobs.find((j) => j.id === id);
        if (!current) return;
        const tombstone: Job = { ...current, hidden: true };
        setPatches((prev) => [...prev.filter((p) => p.id !== id), tombstone]);
        upsertJobPatch(tombstone).catch((e) => console.error("[jobs] tombstone failed", e));
        return;
      }
      setCustomJobs((prev) => prev.filter((x) => x.id !== id));
      deleteJobDoc(id).catch((e) => console.error("[jobs] delete failed", e));
    },

    copyFrom: (sourceId, toDate) => {
      const src = jobs.find((j) => j.id === sourceId);
      const copy: Job = src
        ? { ...src, id: uid(), date: toDate, status: "upcoming" }
        : {
            id: uid(),
            date: toDate,
            crewmanIds: [],
            managerIds: [],
            projectCode: "",
            adpNumber: "",
            address: "",
            sow: "",
            workingHours: "",
            towerOwner: "",
            hoursDaysRemaining: "",
            status: "upcoming",
          };
      setCustomJobs((prev) => [...prev, copy]);
      upsertJob(copy).catch((e) => console.error("[jobs] copy failed", e));
      return copy;
    },
    setDayMark: (userId, date, status) => {
      setDayMarks((prev) => {
        const others = prev.filter((d) => !(d.userId === userId && d.date === date));
        return status ? [...others, { id: `${userId}__${date}`, userId, date, status }] : others;
      });
      setDayMarkDoc(userId, date, status).catch((e) => console.error("[dayMarks] write failed", e));
    },
    getDayMark: (userId, date) => dayMarks.find((d) => d.userId === userId && d.date === date),
    getJobsForUser: (userId, date) =>
      jobs.filter(
        (j) =>
          (!date || j.date === date) &&
          (j.crewmanIds.includes(userId) || j.managerIds.includes(userId)),
      ),
    getNextJobForCrewman: (userId, fromDate) => {
      const mine = jobs
        .filter((j) => j.crewmanIds.includes(userId) && j.date >= fromDate)
        .sort((a, b) => a.date.localeCompare(b.date));
      return mine[0];
    },
    isAssigned: (userId, date) =>
      jobs.some(
        (j) => j.date === date && (j.crewmanIds.includes(userId) || j.managerIds.includes(userId)),
      ) || dayMarks.some((d) => d.userId === userId && d.date === date),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSchedule() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSchedule must be used inside ScheduleProvider");
  return ctx;
}

export function lastNameKey(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.toLowerCase();
  return `${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}`.toLowerCase();
}
const byLastName = (a: { name: string }, b: { name: string }) =>
  lastNameKey(a.name).localeCompare(lastNameKey(b.name));

export function getAllCrewmen(extra: typeof users = []) {
  const source = extra && extra.length > 0 ? extra : users;
  return source
    .filter((u) => u.staffOrField === "Field" && u.role !== "foreman" && !u.hiddenFromDirectory)
    .slice()
    .sort(byLastName);
}

export function getAllForemen(extra: typeof users = []) {
  const source = extra && extra.length > 0 ? extra : users;
  return source
    .filter((u) => u.staffOrField === "Field" && u.role === "foreman" && !u.hiddenFromDirectory)
    .slice()
    .sort(byLastName);
}

export function getAllManagers(extra: typeof users = []) {
  const source = extra && extra.length > 0 ? extra : users;
  return source
    .filter((u) => u.staffOrField === "Staff" && !u.hiddenFromDirectory)
    .slice()
    .sort(byLastName);
}

/** Group user ids that represent the same person across markets (same name+phone). */
export function aliasIdsFor(userId: string): string[] {
  const me = users.find((u) => u.id === userId);
  if (!me) return [userId];
  const key = `${me.name}|${me.phone ?? ""}`.toLowerCase();
  return users.filter((u) => `${u.name}|${u.phone ?? ""}`.toLowerCase() === key).map((u) => u.id);
}

export function getDynamicDatesToAcknowledge(
  user: MockUser,
  jobsList: Job[],
  previousDatesToShow = getMaxPreviousDatesForMarket(user.market),
): string[] {
  const aliasIds = aliasIdsFor(user.id);
  const scheduledDates = Array.from(
    new Set(
      jobsList
        .filter((j) => {
          return (
            j.crewmanIds.some((id) => aliasIds.includes(id)) ||
            j.managerIds.some((id) => aliasIds.includes(id))
          );
        })
        .map((j) => j.date),
    ),
  ).sort();
  const eligibleDates = scheduledDates
    .filter((date) => date <= TODAY && Boolean(getDailyDocSet(user.market, date)))
    .sort();
  const previousDates = eligibleDates
    .filter((date) => date < TODAY)
    .slice(-Math.max(0, previousDatesToShow));

  return eligibleDates.includes(TODAY) ? [...previousDates, TODAY] : previousDates;
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtDayShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

export function fmtDayLong(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function jobsToCsv(rows: Job[]): string {
  const header = [
    "Date",
    "Project Code",
    "ADP #",
    "Address",
    "SOW",
    "Working Hours",
    "Tower Owner",
    "Hours/Days Remaining",
    "Crew",
    "Managers",
    "Status",
    "Notes",
  ];
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const escape = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(",")];
  for (const j of rows) {
    lines.push(
      [
        j.date,
        j.projectCode,
        j.adpNumber,
        j.address,
        j.sow,
        j.workingHours,
        j.towerOwner,
        j.hoursDaysRemaining,
        j.crewmanIds.map(nameOf).join("; "),
        j.managerIds.map(nameOf).join("; "),
        j.status,
        j.notes ?? "",
      ]
        .map((v) => escape(String(v)))
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
