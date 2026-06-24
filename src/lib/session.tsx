// Session: Firebase Auth + Firestore-backed acknowledgements & toolbox docs.
// Keeps the same hook API as before so route files don't need changes.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth } from "./firebase";
import {
  users,
  getDailyDocSet,
  getDatesToAcknowledge,
  getMaxPreviousDatesForMarket,
  type Market,
  type MockUser,
  CREWMAN_ROLES,
} from "./mock-data";
import { findUserByUsername, subscribeUsers, type UserProfile } from "./firestore/users";
import { subscribeDirectoryEdits } from "./firestore/directory";
import { subscribeAllAcks, writeAck, type AckRecord } from "./firestore/acks";
import { subscribeToolboxDocs, type ToolboxDocRecord } from "./firestore/toolboxDocs";
import { useSchedule, getDynamicDatesToAcknowledge } from "./schedule-store";
import { useBriefing } from "./briefing-store";

type ToolboxDocType = "pdf" | "doc";

export interface ToolboxDoc {
  id: string;
  market: Market;
  date: string;
  name: string;
  type: ToolboxDocType;
  sizeKb: number;
  url?: string;
}

interface SessionValue {
  user: MockUser | null;
  isHydrated: boolean;
  selectedMarket: Market | null;
  historySettings: Record<Market, number>;
  acks: Record<string, string>;
  acksByUser: Record<string, Record<string, string>>;
  toolboxDocs: ToolboxDoc[];
  /** Firebase auth-based login: returns the resolved MockUser or throws. */
  loginWithCredentials: (identifier: string, password: string) => Promise<MockUser>;
  logout: () => void;
  setSelectedMarket: (market: Market | null) => void;
  setHistorySetting: (market: Market, previousDates: number) => void;
  acknowledge: (itemId: string, userId?: string) => void;
  isAcked: (itemId: string, userId?: string) => boolean;
  getUserAcks: (userId: string) => Record<string, string>;
  getDocsForDate: (market: Market, date: string) => ToolboxDoc[];
  getToolboxAckId: (market: Market, date: string) => string | null;
  getAckItemIdsForDate: (market: Market, date: string) => string[];
  getProgressForDate: (
    userId: string,
    market: Market,
    date: string,
  ) => { done: number; total: number; complete: boolean };
}

const SessionCtx = createContext<SessionValue | null>(null);
const PREFS_KEY = "x3.session.prefs.v1";
const DEFAULT_HISTORY_SETTINGS: Record<Market, number> = {
  socal: getMaxPreviousDatesForMarket("socal"),
  vegas: getMaxPreviousDatesForMarket("vegas"),
};

export function findUserForgivingly(cleanId: string, list: MockUser[]): MockUser | null {
  const normalizedId = cleanId.trim().toLowerCase();
  if (!normalizedId) return null;

  // 1. Exact match on username
  const exactUser = list.find((u) => u.username.toLowerCase() === normalizedId);
  if (exactUser) return exactUser;

  // 2. Exact match on email
  const exactEmail = list.find((u) => u.email.toLowerCase() === normalizedId);
  if (exactEmail) return exactEmail;

  // 3. Forgiving match based on space/dot-separated tokens
  const inputTokens = normalizedId
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (inputTokens.length === 0) return null;

  // Strip search helper noise tokens (like ca, lv, socal, vegas) to focus on names
  const nameTokens = inputTokens.filter((t) => !["socal", "vegas", "ca", "lv"].includes(t));
  const searchTokens = nameTokens.length > 0 ? nameTokens : inputTokens;

  const consonantSkeleton = (s: string) => s.toLowerCase().replace(/[aeiouy]/g, "");

  const matchToken = (it: string, tt: string) => {
    if (it === tt) return true;
    if (it.length >= 3 && tt.startsWith(it)) return true;
    if (tt.length >= 3 && it.startsWith(tt)) return true;
    if (it[0] === tt[0]) {
      const sk1 = consonantSkeleton(it);
      const sk2 = consonantSkeleton(tt);
      if (sk1 && sk1 === sk2) return true;
    }
    return false;
  };

  let bestCandidate: MockUser | null = null;
  let bestScore = 0;

  for (const u of list) {
    const candidateTokens = [
      ...u.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .split(/\s+/)
        .filter(Boolean),
      ...u.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .split(/\s+/)
        .filter(Boolean),
    ];

    let matchedTokensCount = 0;
    for (const it of searchTokens) {
      if (candidateTokens.some((tt) => matchToken(it, tt))) {
        matchedTokensCount++;
      }
    }

    if (matchedTokensCount === searchTokens.length) {
      const nameParts = u.name.toLowerCase().split(/\s+/);
      const hasFirstName = searchTokens.some((it) => nameParts[0] === it);
      const hasLastName = searchTokens.some((it) => nameParts[nameParts.length - 1] === it);
      const score = matchedTokensCount + (hasFirstName ? 1 : 0) + (hasLastName ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = u;
      }
    }
  }

  return bestCandidate;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedMarket, setSelectedMarketState] = useState<Market | null>(null);
  const [historySettings, setHistorySettings] =
    useState<Record<Market, number>>(DEFAULT_HISTORY_SETTINGS);
  const [acksByUser, setAcksByUser] = useState<Record<string, Record<string, string>>>({});
  const [toolboxDocs, setToolboxDocs] = useState<ToolboxDoc[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [directoryEdits, setDirectoryEdits] = useState<any[]>([]);

  const { getEffectiveDocSet, getSectionAttachments } = useBriefing();

  // Configure Session Persistence (logout on browser close)
  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch((err) => {
      console.error("Failed to set Firebase Auth persistence to Session:", err);
    });
  }, []);

  // Restore lightweight UI prefs from localStorage (selectedMarket, historySettings).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.selectedMarket === "socal" || p.selectedMarket === "vegas")
          setSelectedMarketState(p.selectedMarket);
        if (p.historySettings)
          setHistorySettings({ ...DEFAULT_HISTORY_SETTINGS, ...p.historySettings });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ selectedMarket, historySettings }));
    } catch {
      /* ignore */
    }
  }, [selectedMarket, historySettings]);

  // Subscribe to user profiles so we can resolve auth uid → MockUser.
  useEffect(() => subscribeUsers(setProfiles), []);

  // Subscribe to directory edits to resolve custom or edited emails dynamically.
  useEffect(() => subscribeDirectoryEdits(setDirectoryEdits), []);

  // Auth listener.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setHydrated(true);
        return;
      }
      // Resolve MockUser by email match in profiles, directoryEdits, or mock list.
      const email = (fbUser.email ?? "").toLowerCase();

      const editsMap = new Map(directoryEdits.map((e) => [e.id, e]));
      const merged = users.map((u) => {
        const e = editsMap.get(u.id);
        if (!e) return u;
        return { ...u, ...(e.patch ?? {}) };
      });
      const added = directoryEdits.filter((e) => e.added).map((e) => e.added!);
      const allMerged = [...merged, ...added];

      // Robust resolution: match by current email, original mock email, or standard name-based email
      const matched = allMerged.find((u) => {
        if (u.email.toLowerCase() === email) return true;
        const originalUser = users.find((org) => org.id === u.id);
        if (originalUser && originalUser.email.toLowerCase() === email) return true;
        const standard = `${u.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ".")
          .replace(/^\.+|\.+$/g, "")}@x3corp.net`;
        if (standard.toLowerCase() === email) return true;
        return false;
      });

      const resolved =
        matched ??
        profiles.find((p) => {
          if (p.email.toLowerCase() === email) return true;
          const standard = `${p.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ".")
            .replace(/^\.+|\.+$/g, "")}@x3corp.net`;
          if (standard.toLowerCase() === email) return true;
          return false;
        }) ??
        null;

      setUser(resolved);
      setHydrated(true);
    });
    return unsub;
  }, [profiles, directoryEdits]);

  // Subscribe to ALL acks (small dataset; staff dashboards need cross-user view).
  useEffect(() => {
    return subscribeAllAcks((rows: AckRecord[]) => {
      const next: Record<string, Record<string, string>> = {};
      for (const r of rows) {
        if (!next[r.userId]) next[r.userId] = {};
        next[r.userId][r.itemId] = r.ackedAt;
      }
      setAcksByUser(next);
    });
  }, []);

  // Subscribe to uploaded toolbox docs.
  useEffect(() => {
    return subscribeToolboxDocs((rows: ToolboxDocRecord[]) => {
      setToolboxDocs(
        rows.map((r) => ({
          id: r.id,
          market: r.market,
          date: r.date,
          name: r.name,
          type: r.type,
          sizeKb: r.sizeKb,
          url: r.url,
        })),
      );
    });
  }, []);

  const acks = user ? (acksByUser[user.id] ?? {}) : {};

  const getDocsForDate = useCallback(
    (market: Market, date: string) => {
      const set = getEffectiveDocSet(market, date);
      if (!set) return [];
      return (set.documents ?? []).map(
        (doc) =>
          ({
            ...doc,
            market,
            date,
          }) as ToolboxDoc,
      );
    },
    [getEffectiveDocSet],
  );

  const getToolboxAckId = useCallback(
    (market: Market, date: string) => {
      const set = getEffectiveDocSet(market, date);
      if (!set || !set.announcement.id) return null;
      const parts = set.announcement.id.split("-");
      const targetDate = parts.slice(2).join("-");
      return getDocsForDate(market, date).length > 0 ? `toolbox-${market}-${targetDate}` : null;
    },
    [getDocsForDate, getEffectiveDocSet],
  );

  const getAckItemIdsForDate = useCallback(
    (market: Market, date: string) => {
      const set = getEffectiveDocSet(market, date);
      if (!set) return [];
      const toolboxAckId = getToolboxAckId(market, date);
      const list: string[] = [];

      const announcementAtts = getSectionAttachments(market, date, "announcement");
      const safetyAtts = getSectionAttachments(market, date, "safety");
      const lessonAtts = getSectionAttachments(market, date, "lesson");

      if (
        set.announcement.title?.trim() ||
        set.announcement.body?.trim() ||
        announcementAtts.length > 0
      ) {
        list.push(set.announcement.id);
      }
      if (set.safety.title?.trim() || set.safety.body?.trim() || safetyAtts.length > 0) {
        list.push(set.safety.id);
      }
      if (set.lesson.title?.trim() || set.lesson.body?.trim() || lessonAtts.length > 0) {
        list.push(set.lesson.id);
      }
      if (toolboxAckId) {
        list.push(toolboxAckId);
      }
      return list;
    },
    [getEffectiveDocSet, getToolboxAckId, getSectionAttachments],
  );

  const value: SessionValue = {
    user,
    isHydrated: hydrated,
    selectedMarket,
    historySettings,
    acks,
    acksByUser,
    toolboxDocs,
    loginWithCredentials: async (identifier, password) => {
      const id = identifier.trim().toLowerCase();
      let email = id;
      if (!id.includes("@")) {
        // Username path — look up via directory edits, then profiles, then mock list.
        const editsMap = new Map(directoryEdits.map((e) => [e.id, e]));
        const merged = users.map((u) => {
          const e = editsMap.get(u.id);
          if (!e) return u;
          return { ...u, ...(e.patch ?? {}) };
        });
        const added = directoryEdits.filter((e) => e.added).map((e) => e.added!);
        const allMerged = [...merged, ...added];

        const mu = findUserForgivingly(id, allMerged);
        if (mu) email = mu.email;
        else {
          const prof = await findUserByUsername(id);
          if (prof) email = prof.email;
          else throw new Error("Account not found.");
        }
      }
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        let baseUser = null;
        if (!id.includes("@")) {
          baseUser = findUserForgivingly(id, users);
        } else {
          const editsMap = new Map(directoryEdits.map((e) => [e.id, e]));
          const merged = users.map((u) => {
            const e = editsMap.get(u.id);
            if (!e) return u;
            return { ...u, ...(e.patch ?? {}) };
          });
          const added = directoryEdits.filter((e) => e.added).map((e) => e.added!);
          const allMerged = [...merged, ...added];
          const matched = allMerged.find((u) => u.email.toLowerCase() === id);
          if (matched) {
            baseUser = users.find((u) => u.id === matched.id);
          }
        }

        if (baseUser) {
          const originalEmail = baseUser.email.toLowerCase();
          const standardEmail = `${baseUser.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ".")
            .replace(/^\.+|\.+$/g, "")}@x3corp.net`.toLowerCase();

          if (originalEmail !== email.toLowerCase()) {
            try {
              cred = await signInWithEmailAndPassword(auth, originalEmail, password);
            } catch (fallbackErr1) {
              if (standardEmail !== email.toLowerCase() && standardEmail !== originalEmail) {
                try {
                  cred = await signInWithEmailAndPassword(auth, standardEmail, password);
                } catch (fallbackErr2) {
                  throw err;
                }
              } else {
                throw err;
              }
            }
          } else if (standardEmail !== email.toLowerCase()) {
            try {
              cred = await signInWithEmailAndPassword(auth, standardEmail, password);
            } catch (fallbackErr) {
              throw err;
            }
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      const fbEmail = (cred.user.email ?? "").toLowerCase();

      const editsMap = new Map(directoryEdits.map((e) => [e.id, e]));
      const merged = users.map((u) => {
        const e = editsMap.get(u.id);
        if (!e) return u;
        return { ...u, ...(e.patch ?? {}) };
      });
      const added = directoryEdits.filter((e) => e.added).map((e) => e.added!);
      const allMerged = [...merged, ...added];

      const matched = allMerged.find((u) => {
        if (u.email.toLowerCase() === fbEmail) return true;
        const originalUser = users.find((org) => org.id === u.id);
        if (originalUser && originalUser.email.toLowerCase() === fbEmail) return true;
        const standard = `${u.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ".")
          .replace(/^\.+|\.+$/g, "")}@x3corp.net`;
        if (standard.toLowerCase() === fbEmail) return true;
        return false;
      });

      const resolved =
        matched ??
        profiles.find((p) => {
          if (p.email.toLowerCase() === fbEmail) return true;
          const standard = `${p.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ".")
            .replace(/^\.+|\.+$/g, "")}@x3corp.net`;
          if (standard.toLowerCase() === fbEmail) return true;
          return false;
        }) ??
        null;

      if (!resolved) throw new Error("Signed in but no profile found. Run /admin-seed first.");
      return resolved;
    },
    logout: () => {
      signOut(auth).catch(() => undefined);
      setSelectedMarketState(null);
    },
    setSelectedMarket: setSelectedMarketState,
    setHistorySetting: (market, previousDates) => {
      const max = getMaxPreviousDatesForMarket(market);
      setHistorySettings((prev) => ({
        ...prev,
        [market]: Math.max(0, Math.min(max, previousDates)),
      }));
    },
    acknowledge: (itemId, targetUserId) => {
      const ackUserId = targetUserId ?? user?.id;
      if (!ackUserId) return;
      // Optimistic local update + persisted write.
      setAcksByUser((prev) => ({
        ...prev,
        [ackUserId]: { ...(prev[ackUserId] ?? {}), [itemId]: new Date().toISOString() },
      }));
      writeAck(ackUserId, itemId).catch((err) => console.error("[ack] write failed", err));
    },
    isAcked: (itemId, targetUserId) =>
      Boolean((targetUserId ? acksByUser[targetUserId] : acks)?.[itemId]),
    getUserAcks: (targetUserId) => acksByUser[targetUserId] ?? {},
    getDocsForDate,
    getToolboxAckId,
    getAckItemIdsForDate,
    getProgressForDate: (targetUserId, market, date) => {
      const ids = getAckItemIdsForDate(market, date);
      const userAcks = acksByUser[targetUserId] ?? {};
      const done = ids.filter((id) => userAcks[id]).length;
      return { done, total: ids.length, complete: ids.length > 0 && done === ids.length };
    },
  };

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

export function usePendingAck() {
  const { user, getProgressForDate, historySettings } = useSession();
  const { jobs } = useSchedule();
  return useMemo(() => {
    if (!user) return { dates: [], pending: 0, total: 0, isCrewman: false };
    const isCrewman = CREWMAN_ROLES.includes(user.role);
    if (!isCrewman) return { dates: [], pending: 0, total: 0, isCrewman: false };
    let marks: { userId: string; date: string }[] = [];
    try {
      const raw =
        typeof localStorage !== "undefined" ? localStorage.getItem("x3.dayMarks.cache.v1") : null;
      if (raw) marks = JSON.parse(raw) as { userId: string; date: string }[];
    } catch {
      /* ignore */
    }
    const markedDates = new Set(marks.filter((m) => m.userId === user.id).map((m) => m.date));
    const dates = getDynamicDatesToAcknowledge(user, jobs, historySettings[user.market]).filter(
      (d) => !markedDates.has(d),
    );
    let total = 0,
      done = 0;
    for (const d of dates) {
      const progress = getProgressForDate(user.id, user.market, d);
      total += progress.total;
      done += progress.done;
    }
    return { dates, pending: total - done, total, isCrewman };
  }, [user, getProgressForDate, historySettings, jobs]);
}

export function progressForDate(
  market: Market,
  date: string,
  acks: Record<string, string>,
  documentIds: string[] = [],
) {
  const set = getDailyDocSet(market, date);
  if (!set) return { done: 0, total: 0, complete: false };
  const ids = [set.announcement.id, set.safety.id, set.lesson.id, ...documentIds];
  const done = ids.filter((id) => acks[id]).length;
  return { done, total: ids.length, complete: ids.length > 0 && done === ids.length };
}
