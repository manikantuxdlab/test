// Admin-editable directory overlay on top of the mock `users` list.
// Persisted in Firestore (collection: directoryEdits).

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { users as baseUsers, type MockUser, type Role, type Market } from "./mock-data";
import {
  saveDirectoryEdit,
  deleteDirectoryEdit,
  subscribeDirectoryEdits,
} from "./firestore/directory";

export interface DirectoryEdit {
  id: string;
  patch?: Partial<MockUser>;
  deactivated?: boolean;
  added?: MockUser;
}

interface DirectoryValue {
  people: MockUser[];
  allPeople: MockUser[];
  isDeactivated: (id: string) => boolean;
  upsert: (input: NewPersonInput, id?: string) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  reactivate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export interface NewPersonInput {
  name: string;
  role: Role;
  market: Market;
  marketLabel?: string;
  title?: string;
  phone?: string;
  email?: string;
  staffOrField?: "Staff" | "Field";
}

const Ctx = createContext<DirectoryValue | null>(null);

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}
function uid() {
  return `u-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function syncSingleUserWithCloudFunction(u: any) {
  try {
    const { httpsCallable } = await import("firebase/functions");
    const { functions } = await import("./firebase");
    const syncUsersCallable = httpsCallable(functions, "syncUsers");
    const res = await syncUsersCallable({ usersToSync: [u] });
    console.log("[directory] cloud sync result:", res.data);
  } catch (err) {
    console.error("[directory] cloud sync failed:", err);
  }
}

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const [edits, setEdits] = useState<DirectoryEdit[]>([]);

  useEffect(() => subscribeDirectoryEdits(setEdits), []);

  const editsById = useMemo(() => {
    const m = new Map<string, DirectoryEdit>();
    edits.forEach((e) => m.set(e.id, e));
    return m;
  }, [edits]);

  const allPeople = useMemo<MockUser[]>(() => {
    const added = edits.filter((e) => e.added).map((e) => e.added!);
    const addedNames = new Set(added.map((u) => u.name.trim().toLowerCase()));

    const merged = baseUsers
      .filter((u) => !u.hiddenFromDirectory && !addedNames.has(u.name.trim().toLowerCase()))
      .map((u) => {
        const e = editsById.get(u.id);
        const baseMerged = {
          ...u,
          staffOrField: u.staffOrField ?? (["admin", "staff"].includes(u.role) ? "Staff" : "Field"),
          ...(e?.patch ?? {}),
        };
        return baseMerged;
      })
      .filter((u) => !u.hiddenFromDirectory);

    const processedAdded = added.map((u) => ({
      ...u,
      staffOrField: u.staffOrField ?? (["admin", "staff"].includes(u.role) ? "Staff" : "Field"),
    }));

    return [...merged, ...processedAdded];
  }, [edits, editsById]);

  const people = useMemo(
    () => allPeople.filter((p) => !editsById.get(p.id)?.deactivated),
    [allPeople, editsById],
  );

  async function persist(edit: DirectoryEdit) {
    setEdits((prev) => [...prev.filter((e) => e.id !== edit.id), edit]);
    await saveDirectoryEdit(edit);
  }

  const value: DirectoryValue = {
    people,
    allPeople,
    isDeactivated: (id) => Boolean(editsById.get(id)?.deactivated),
    upsert: async (input, id) => {
      if (id) {
        const existing = edits.find((e) => e.id === id);
        const prevPerson = allPeople.find((p) => p.id === id);
        const oldEmail = prevPerson?.email;
        const patch: Partial<MockUser> = {
          name: input.name,
          role: input.role,
          market: input.market,
          marketLabel: input.marketLabel,
          title: input.title,
          phone: input.phone ?? "",
          email: input.email ?? `${slug(input.name)}@x3corp.net`,
          initials: initials(input.name),
          staffOrField: input.staffOrField,
        };
        const cleanedPatch: Partial<MockUser> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) cleanedPatch[k as keyof MockUser] = v as any;
        }

        if (existing?.added) {
          const updated = { ...existing.added, ...cleanedPatch };
          await persist({ ...existing, added: updated });
          await syncSingleUserWithCloudFunction({
            ...updated,
            oldEmail: oldEmail && oldEmail !== updated.email ? oldEmail : undefined,
          });
        } else {
          await persist({ id, patch: cleanedPatch, deactivated: existing?.deactivated });
          if (prevPerson) {
            const updated = { ...prevPerson, ...cleanedPatch };
            await syncSingleUserWithCloudFunction({
              ...updated,
              oldEmail: oldEmail && oldEmail !== updated.email ? oldEmail : undefined,
            });
          }
        }
      } else {
        const newId = uid();
        const person: MockUser = {
          id: newId,
          name: input.name,
          username: `${input.market}.${slug(input.name)}`,
          email: input.email ?? `${slug(input.name)}@x3corp.net`,
          phone: input.phone ?? "",
          role: input.role,
          title: input.title,
          market: input.market,
          marketLabel: input.marketLabel,
          initials: initials(input.name),
          scheduledDates: [],
          staffOrField:
            input.staffOrField ?? (["admin", "staff"].includes(input.role) ? "Staff" : "Field"),
        };
        const cleanedPerson: MockUser = {} as any;
        for (const [k, v] of Object.entries(person)) {
          if (v !== undefined) cleanedPerson[k as keyof MockUser] = v as any;
        }

        await persist({ id: newId, added: cleanedPerson });
        await syncSingleUserWithCloudFunction(cleanedPerson);
      }
    },
    deactivate: async (id) => {
      const existing = edits.find((e) => e.id === id);
      await persist({ ...(existing ?? { id }), deactivated: true });
    },
    reactivate: async (id) => {
      const existing = edits.find((e) => e.id === id);
      if (!existing) return;
      const next = { ...existing, deactivated: false };
      if (!next.patch && !next.added) {
        setEdits((prev) => prev.filter((e) => e.id !== id));
        await deleteDirectoryEdit(id);
      } else {
        await persist(next);
      }
    },
    remove: async (id) => {
      if (id.startsWith("u-custom-")) {
        // Custom users: delete their Firestore document entirely.
        setEdits((prev) => prev.filter((e) => e.id !== id));
        await deleteDirectoryEdit(id);
      } else {
        // Base mock users: persist a patch that hides them permanently.
        const existing = edits.find((e) => e.id === id);
        await persist({
          ...(existing ?? { id }),
          patch: { ...(existing?.patch ?? {}), hiddenFromDirectory: true },
        });
      }
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDirectory() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDirectory must be used inside DirectoryProvider");
  return ctx;
}
