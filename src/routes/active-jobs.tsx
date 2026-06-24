import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useStaffGuard } from "@/lib/guards";
import { AppShell } from "@/components/AppShell";
import {
  useSchedule,
  fmtDayShort,
  DAY_STATUS_LABELS,
  isBlankOwner,
  type DayStatus,
} from "@/lib/schedule-store";
import { TODAY, users, type Market } from "@/lib/mock-data";
import { useDirectory } from "@/lib/directory-store";
import { MapPin, Clock, Briefcase, UserX, Search, X } from "lucide-react";

export const Route = createFileRoute("/active-jobs")({
  head: () => ({ meta: [{ title: "Active Jobs — X3 Communications" }] }),
  component: ActiveJobsPage,
});

function jobMarket(crewmanIds: string[], people: any[]): Market | null {
  for (const id of crewmanIds) {
    const u = people.find((x) => x.id === id);
    if (u) return u.market;
  }
  return null;
}

const STATUS_ORDER: DayStatus[] = ["OFF", "PTO", "HOL", "ELR", "LOA"];

function ActiveJobsPage() {
  useStaffGuard();
  const { allPeople } = useDirectory();
  const { jobs, dayMarks } = useSchedule();
  const today = TODAY;
  const [market, setMarket] = useState<Market>("socal");
  const [search, setSearch] = useState("");
  const [matchedJobId, setMatchedJobId] = useState<string | null>(null);
  const jobRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const todayJobs = useMemo(
    () =>
      jobs.filter((j) => {
        return j.date === today && jobMarket(j.crewmanIds, allPeople) === market;
      }),
    [jobs, today, market, allPeople],
  );

  const todayOff = useMemo(
    () =>
      dayMarks
        .filter((m) => m.date === today)
        .map((m) => ({ mark: m, user: allPeople.find((u) => u.id === m.userId) }))
        .filter((row) => row.user && row.user.market === market && !row.user.hiddenFromDirectory),
    [dayMarks, today, market, allPeople],
  );

  const offByStatus = useMemo(() => {
    const groups: Record<DayStatus, typeof todayOff> = {
      OFF: [],
      PTO: [],
      HOL: [],
      ELR: [],
      LOA: [],
    };
    for (const row of todayOff) groups[row.mark.status].push(row);
    return groups;
  }, [todayOff]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    const job = todayJobs.find((j) =>
      j.crewmanIds.some((id) =>
        allPeople
          .find((u) => u.id === id)
          ?.name.toLowerCase()
          .includes(q),
      ),
    );
    if (job) {
      setMatchedJobId(job.id);
      jobRefs.current[job.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => setMatchedJobId(null), 2400);
    } else {
      setMatchedJobId("__none__");
      window.setTimeout(() => setMatchedJobId(null), 1800);
    }
  }

  return (
    <AppShell subtitle="Active Jobs">
      <h2 className="mb-1 text-2xl font-black tracking-tight">Active Jobs</h2>
      <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
        {fmtDayShort(today)} · X3 Management · {todayJobs.length} job
        {todayJobs.length === 1 ? "" : "s"}
      </p>

      <form onSubmit={handleSearch} className="mb-4 flex gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find your name — jump to your job"
            className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="rounded-full border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground"
        >
          Find
        </button>
      </form>
      {matchedJobId === "__none__" && (
        <p className="mb-3 text-xs text-destructive">
          No matching crew on today's jobs in this market.
        </p>
      )}

      {todayJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
          No active jobs today in this market.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left font-bold">Project</th>
                  <th className="px-3 py-2.5 text-left font-bold">ADP #</th>
                  <th className="px-3 py-2.5 text-left font-bold">Hours / Owner</th>
                  <th className="px-3 py-2.5 text-left font-bold">Address</th>
                  <th className="px-3 py-2.5 text-left font-bold">SOW</th>
                  <th className="px-3 py-2.5 text-left font-bold">Crew</th>
                  <th className="px-3 py-2.5 text-left font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayJobs.map((j) => {
                  const isMatch = matchedJobId === j.id;
                  return (
                    <tr
                      key={j.id}
                      ref={(el) => {
                        jobRefs.current[j.id] = el as unknown as HTMLLIElement;
                      }}
                      className={`border-b border-border/60 align-top last:border-0 transition ${
                        isMatch ? "bg-primary/15 ring-2 ring-primary/60" : "hover:bg-surface/60"
                      }`}
                    >
                      <td className="px-3 py-2.5 font-mono font-black">{j.projectCode || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                        {j.adpNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {j.workingHours || "—"}
                        </div>
                        <div className="text-[11px]">{j.towerOwner || "—"}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                          {j.address || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        <div className="flex items-start gap-1.5">
                          <Briefcase className="mt-0.5 h-3 w-3 shrink-0" />
                          {j.sow || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold leading-snug text-white">
                        {j.crewmanIds
                          .map((id) => allPeople.find((u) => u.id === id)?.name)
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                          {j.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <UserX className="h-3.5 w-3.5" /> Off today — X3 Management ({todayOff.length})
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Anyone listed below is excluded from today's required acknowledgements. They'll only be
          required again once they return to the schedule.
        </p>
        {todayOff.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/40 p-4 text-center text-xs text-muted-foreground">
            No one marked OFF / PTO / HOL / ELR / LOA today.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2.5 text-left font-bold w-24">Status</th>
                    <th className="px-3 py-2.5 text-left font-bold w-12"></th>
                    <th className="px-3 py-2.5 text-left font-bold">Name</th>
                    <th className="px-3 py-2.5 text-left font-bold">Title / Role</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_ORDER.flatMap((status) => {
                    const rows = offByStatus[status] ?? [];
                    return rows.map(({ mark, user: u }) => (
                      <tr
                        key={mark.id}
                        className="border-b border-border/60 last:border-0 transition hover:bg-surface/60"
                      >
                        <td className="px-3 py-2">
                          <span className="rounded-full border border-warning/50 bg-warning/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-warning">
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/20 text-[10px] font-black text-warning">
                            {u!.initials}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-bold text-white">{u!.name}</td>
                        <td className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                          {u!.title ?? u!.role} · {DAY_STATUS_LABELS[status]}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
