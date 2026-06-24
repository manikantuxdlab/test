import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  getAuth,
} from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db, app, functions } from "@/lib/firebase";
import { initializeApp, deleteApp, getApp } from "firebase/app";
import { upsertUserProfile } from "@/lib/firestore/users";
import { upsertJobPatch } from "@/lib/firestore/jobs";
import { saveBriefingDoc } from "@/lib/firestore/briefings";
import {
  users,
  schedules,
  dailyDocs,
  DEFAULT_DEMO_PASSWORD,
  passwordForRole,
} from "@/lib/mock-data";
import { AppShell } from "@/components/AppShell";
import { inferTowerOwner } from "@/lib/schedule-store";
import { Database, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin-seed")({
  head: () => ({ meta: [{ title: "Seed Firestore — X3" }] }),
  component: AdminSeedPage,
});

interface LogLine {
  msg: string;
  kind: "info" | "ok" | "err";
}

const BOOTSTRAP_ADMIN_EMAIL = "charlie.tran@x3corp.net";

async function ensureSeedAuth(append: (msg: string, kind?: LogLine["kind"]) => void) {
  if (auth.currentUser) return true;
  try {
    await signInWithEmailAndPassword(auth, BOOTSTRAP_ADMIN_EMAIL, DEFAULT_DEMO_PASSWORD);
    append(`Signed in as ${BOOTSTRAP_ADMIN_EMAIL} so Firestore writes are authenticated.`, "ok");
    return true;
  } catch (err) {
    append(`Auto sign-in skipped: ${(err as Error).message}`, "info");
    return false;
  }
}

function AdminSeedPage() {
  // Bootstrap route — intentionally unguarded so the first seed can run before any users exist.
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);

  function append(msg: string, kind: LogLine["kind"] = "info") {
    setLog((p) => [...p, { msg, kind }]);
  }

  async function seed() {
    setRunning(true);
    setLog([]);
    let createdAuth = 0,
      existingAuth = 0,
      skippedAuth = 0,
      profilesWritten = 0,
      jobsWritten = 0,
      briefingsWritten = 0,
      errors = 0;
    let seedUsers = users;
    try {
      const snap = await getDocs(collection(db, "directoryEdits"));
      const edits = snap.docs.map((d) => d.data() as any);
      const editsMap = new Map(edits.map((e) => [e.id, e]));
      const merged = users.map((u) => {
        const e = editsMap.get(u.id);
        if (!e) return u;
        return { ...u, ...(e.patch ?? {}) };
      });
      const added = edits.filter((e) => e.added).map((e) => e.added!);
      seedUsers = [...merged, ...added];
      append(`Successfully merged ${edits.length} directory edits/custom users for seeding.`, "ok");
    } catch (e) {
      append(
        `Failed to load directory edits for seeding: ${(e as Error).message}. Seeding base users.`,
        "err",
      );
    }

    const hadSeedAuth = await ensureSeedAuth(append);
    if (!hadSeedAuth) {
      errors++;
      append(
        "Requires admin authentication to invoke syncUsers Cloud Function. Seed cancelled.",
        "err",
      );
      setRunning(false);
      return;
    }

    append(`Invoking syncUsers Cloud Function for ${seedUsers.length} user(s) on the backend...`);

    try {
      const { httpsCallable } = await import("firebase/functions");
      const syncUsersCallable = httpsCallable(functions, "syncUsers");
      const res = (await syncUsersCallable({ usersToSync: seedUsers })) as any;

      if (res.data && res.data.success) {
        append(`Cloud Sync Succeeded: ${res.data.summary}`, "ok");
        profilesWritten = seedUsers.length;
      } else {
        errors++;
        append(
          `Cloud Sync completed with some errors: ${res.data?.summary || "Unknown error"}`,
          "err",
        );
        if (res.data?.errors) {
          res.data.errors.forEach((errObj: any) => {
            errors++;
            append(`Error for ${errObj.email} (${errObj.id}): ${errObj.error}`, "err");
          });
        }
      }
    } catch (cloudErr) {
      errors++;
      append(`Cloud Sync failed: ${(cloudErr as Error).message}`, "err");
    }

    append(
      `Seeding ${schedules.length} base jobs as patches (so Schedule Builder edits go to Firestore)…`,
    );
    for (const s of schedules) {
      const jobId = `mock-${s.id}`;
      const memberIds = s.members
        .map((name) => seedUsers.find((user) => user.name === name)?.id)
        .filter((id): id is string => Boolean(id));
      const allIds = [...new Set([s.userId, ...memberIds])];

      const crewmanIds: string[] = [];
      const managerIds: string[] = [];

      allIds.forEach((id) => {
        const u = seedUsers.find((x) => x.id === id);
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

      try {
        await upsertJobPatch({
          id: jobId,
          date: s.date,
          crewmanIds,
          managerIds,
          projectCode: s.projectCode,
          adpNumber: s.adpNumber,
          address: s.siteAddress,
          sow: s.scopeOfWork,
          workingHours: `${s.startTime}–${s.endTime}`,
          towerOwner:
            s.towerOwner || inferTowerOwner(s.projectCode, s.specialInstructions, s.siteAddress),
          hoursDaysRemaining: `${s.hoursRemaining}h · ${s.daysRemaining}d`,
          notes: s.specialInstructions,
          status: "ongoing",
        });
        jobsWritten++;
      } catch (err) {
        errors++;
        append(`Job seed error ${jobId}: ${(err as Error).message}`, "err");
      }
    }
    append(`Jobs written: ${jobsWritten}.`, "ok");

    append(`Seeding ${dailyDocs.length} daily briefings…`);
    for (const d of dailyDocs) {
      try {
        await saveBriefingDoc({
          market: d.market,
          date: d.date,
          announcement: d.announcement,
          safety: d.safety,
          lesson: d.lesson,
          documents: d.documents.map((x) => ({
            id: x.id,
            name: x.name,
            type: x.type,
            sizeKb: x.sizeKb,
          })),
          updatedAt: new Date().toISOString(),
        });
        briefingsWritten++;
      } catch (err) {
        errors++;
        append(`Briefing seed error: ${(err as Error).message}`, "err");
      }
    }
    append(`Briefings written: ${briefingsWritten}.`, "ok");

    append(`Done. ${errors} error(s).`, errors === 0 ? "ok" : "err");
    setRunning(false);
  }

  async function quickSignIn(email: string) {
    try {
      await signInWithEmailAndPassword(auth, email, DEFAULT_DEMO_PASSWORD);
      append(`Signed in as ${email}.`, "ok");
    } catch (err) {
      append(`Sign-in failed: ${(err as Error).message}`, "err");
    }
  }

  async function bulkResetCrewPasswords() {
    // Send a Firebase password-reset email to every crew account that has a
    // real (non-@x3corp.net) email on file. Staff defaults remain untouched.
    const targets = users.filter(
      (u) => !["admin", "staff"].includes(u.role) && u.email && !/@x3corp\.net$/i.test(u.email),
    );
    if (targets.length === 0) {
      append("No crew emails found to reset.", "info");
      return;
    }
    if (!window.confirm(`Send password-reset email to ${targets.length} crew account(s)?`)) return;
    setRunning(true);
    let ok = 0,
      fail = 0;
    for (const u of targets) {
      try {
        await sendPasswordResetEmail(auth, u.email);
        ok++;
      } catch (err) {
        fail++;
        append(`Reset failed for ${u.email}: ${(err as Error).message}`, "err");
      }
    }
    append(`Reset emails sent: ${ok}. Failed: ${fail}.`, fail === 0 ? "ok" : "err");
    setRunning(false);
  }

  return (
    <AppShell subtitle="Admin · Seed Firestore">
      <h2 className="mb-2 text-2xl font-black tracking-tight flex items-center gap-2">
        <Database className="h-6 w-6" /> Seed Firestore
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        One-time data migration from mock data into Firebase. Safe to re-run. Make sure
        Email/Password sign-in is enabled in the Firebase console first.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={seed}
          disabled={running}
          className="flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {running ? "Seeding…" : "Seed Firestore"}
        </button>
        <button
          onClick={() => quickSignIn("charlie.tran@x3corp.net")}
          disabled={running}
          className="h-12 rounded-md border border-border px-4 text-xs font-bold uppercase tracking-wider"
        >
          Quick sign-in (Charlie)
        </button>
        <button
          onClick={bulkResetCrewPasswords}
          disabled={running}
          className="h-12 rounded-md border border-primary/60 px-4 text-xs font-bold uppercase tracking-wider text-primary"
        >
          Reset crew passwords (email link)
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 text-xs">
        {log.length === 0 ? (
          <p className="text-muted-foreground">Logs will appear here.</p>
        ) : (
          <ul className="space-y-1 font-mono">
            {log.map((l, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 ${l.kind === "ok" ? "text-success" : l.kind === "err" ? "text-destructive" : "text-foreground"}`}
              >
                {l.kind === "ok" ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : l.kind === "err" ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <span className="w-3.5" />
                )}
                <span className="break-all">{l.msg}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
