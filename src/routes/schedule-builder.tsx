import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { useScheduleAccessGuard } from "@/lib/guards";
import { AppShell } from "@/components/AppShell";
import {
  useSchedule,
  getAllCrewmen,
  getAllManagers,
  getAllForemen,
  addDays,
  fmtDayShort,
  fmtDayLong,
  jobsToCsv,
  downloadCsv,
  aliasIdsFor,
  isBlankOwner,
  type Job,
  type DayStatus,
} from "@/lib/schedule-store";
import { ROLE_LABELS, users as allUsers, TODAY } from "@/lib/mock-data";
import { useDirectory } from "@/lib/directory-store";
import { useSession } from "@/lib/session";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type MarketFilter = "all" | "socal" | "vegas";

function jobMarket(j: Job, people: any[]): "socal" | "vegas" | "mixed" | "unknown" {
  if (j.market) return j.market;
  const ids = [...j.crewmanIds, ...j.managerIds];
  const markets = new Set(
    ids.map((id) => people.find((u) => u.id === id)?.market).filter(Boolean) as string[],
  );
  if (markets.size === 0) return "unknown";
  if (markets.size === 1) return [...markets][0] as "socal" | "vegas";
  return "mixed";
}

function jobMatchesMarket(j: Job, m: MarketFilter, people: any[]) {
  if (m === "all") return true;
  const jm = jobMarket(j, people);
  // Strict: only the matching market (or explicit mixed). Unknown jobs are excluded
  // so untagged/cross-pasted jobs don't bleed across markets.
  return jm === m || jm === "mixed";
}
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Copy,
  Trash2,
  X,
  Check,
  Download,
  MoreVertical,
  Briefcase,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/schedule-builder")({
  head: () => ({ meta: [{ title: "Schedule Builder — X3 Communications" }] }),
  component: ScheduleBuilderPage,
});

const DAY_STATUS_OPTIONS: DayStatus[] = ["OFF", "PTO", "ELR", "LOA", "HOL"];

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(dateStr: string) {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function ScheduleBuilderPage() {
  useScheduleAccessGuard();
  const { selectedMarket, user } = useSession();
  const [date, setDate] = useState(TODAY);
  const { jobs, addJob, updateJob, deleteJob, copyFrom, setDayMark, getDayMark, isAssigned } =
    useSchedule();
  const { isDeactivated, allPeople } = useDirectory();

  const crewmen = useMemo(
    () => getAllCrewmen(allPeople).filter((u) => !isDeactivated(u.id)),
    [isDeactivated, allPeople],
  );
  const foremen = useMemo(
    () => getAllForemen(allPeople).filter((u) => !isDeactivated(u.id)),
    [isDeactivated, allPeople],
  );
  const managers = useMemo(
    () => getAllManagers(allPeople).filter((u) => !isDeactivated(u.id)),
    [isDeactivated, allPeople],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [pcFilter, setPcFilter] = useState("all");

  const [marketFilter, setMarketFilter] = useState<MarketFilter>("socal");
  const scopedCrewmen = useMemo(() => crewmen, [crewmen]);
  const scopedForemen = useMemo(() => foremen, [foremen]);
  const scopedManagers = useMemo(() => managers, [managers]);

  const dayJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.date === date && jobMatchesMarket(j, marketFilter, allPeople))
        .sort((a, b) => a.projectCode.localeCompare(b.projectCode)),
    [jobs, date, marketFilter, allPeople],
  );

  const filteredDayJobs = useMemo(() => {
    return dayJobs.filter((j) => {
      // 1. Job Type Filter
      if (jobTypeFilter !== "all") {
        if (jobTypeFilter === "none") {
          if (j.jobType) return false;
        } else {
          if (j.jobType !== jobTypeFilter) return false;
        }
      }

      // 2. Project Coordinator Filter
      if (pcFilter !== "all") {
        if (pcFilter === "none") {
          if (j.projectCoordinatorId) return false;
        } else if (pcFilter === "my-jobs") {
          if (j.projectCoordinatorId !== user?.id) return false;
        } else {
          if (j.projectCoordinatorId !== pcFilter) return false;
        }
      }

      // 3. Search Query Filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const matchProject = j.projectCode.toLowerCase().includes(q);
      const matchAdp = j.adpNumber.toLowerCase().includes(q);
      const matchAddress = j.address.toLowerCase().includes(q);
      const matchOwner = j.towerOwner.toLowerCase().includes(q);
      const matchType = (j.jobType ?? "").toLowerCase().includes(q);
      const matchCrew = j.crewmanIds.some((id) => {
        const u = allPeople.find((x) => x.id === id);
        return u?.name.toLowerCase().includes(q);
      });
      const matchPC = (() => {
        if (!j.projectCoordinatorId) return false;
        const u = allPeople.find((x) => x.id === j.projectCoordinatorId);
        return u?.name.toLowerCase().includes(q);
      })();
      return (
        matchProject || matchAdp || matchAddress || matchOwner || matchType || matchCrew || matchPC
      );
    });
  }, [dayJobs, searchQuery, jobTypeFilter, pcFilter, user?.id, allPeople]);

  // Look back up to 14 calendar days for the most recent weekday schedule
  // (skips Sat/Sun since no crews work weekends). Only the single most
  // recent weekday date is used as the copy source.
  const previousScheduleDate = useMemo(() => {
    const minDate = addDays(date, -14);
    const isWeekend = (iso: string) => {
      const d = new Date(iso + "T00:00:00");
      const day = d.getDay();
      return day === 0 || day === 6; // Sunday=0, Saturday=6
    };
    const priorDates = Array.from(
      new Set(
        jobs
          .filter(
            (j) =>
              j.date < date &&
              j.date >= minDate &&
              !isWeekend(j.date) &&
              jobMatchesMarket(j, marketFilter, allPeople),
          )
          .map((j) => j.date),
      ),
    ).sort((a, b) => b.localeCompare(a));
    return priorDates[0];
  }, [jobs, date, marketFilter, allPeople]);

  const previousScheduleJobs = useMemo(
    () =>
      previousScheduleDate
        ? jobs.filter(
            (j) => j.date === previousScheduleDate && jobMatchesMarket(j, marketFilter, allPeople),
          )
        : [],
    [jobs, previousScheduleDate, marketFilter, allPeople],
  );

  const [editing, setEditing] = useState<{ job?: Job } | null>(null);
  const [tab, setTab] = useState<"jobs" | "roster">("jobs");

  function openNew() {
    setEditing({});
  }
  function openEdit(j: Job) {
    setEditing({ job: j });
  }

  function handleSave(input: Omit<Job, "id" | "date" | "status">) {
    if (!editing) return;
    // Stamp market explicitly when a single market is selected, so future
    // filters (Vegas vs SoCal) don't have to infer from crew membership.
    const stampedMarket: "socal" | "vegas" | undefined =
      input.market ??
      (marketFilter === "socal" || marketFilter === "vegas" ? marketFilter : undefined);
    const isUpdate = editing.job && editing.job.id !== "draft";
    const pcChanged = isUpdate && (user?.role === "admin" || user?.role === "staff");
    const payload = {
      ...input,
      market: stampedMarket,
      updatedByPC: pcChanged ? true : (editing.job?.updatedByPC ?? false),
    };

    // Auto-move: any selected crewman (incl. aliases) gets removed
    // from OTHER jobs on the same date so they only appear on the new one.
    // Managers & Staff are excluded from auto-movement so they can remain on multiple jobs.
    const editingId = editing.job?.id;
    const newIds = new Set<string>();
    input.crewmanIds.forEach((id) => {
      const u = allPeople.find((x) => x.id === id) || allUsers.find((x) => x.id === id);
      if (u && (u.staffOrField === "Staff" || ["warehouse", "staff", "admin"].includes(u.role))) {
        return; // Exclude managers/warehouse staff from auto-move
      }
      aliasIdsFor(id).forEach((a) => newIds.add(a));
    });
    const moved: { project: string; names: string[] }[] = [];
    for (const other of jobs) {
      if (other.date !== date) continue;
      if (editingId && other.id === editingId) continue;
      const removedCrew = other.crewmanIds.filter((id) => {
        if (!newIds.has(id)) return false;
        const u = allPeople.find((x) => x.id === id) || allUsers.find((x) => x.id === id);
        if (u && (u.staffOrField === "Staff" || ["warehouse", "staff", "admin"].includes(u.role))) {
          return false; // Exclude managers/warehouse staff from being removed/reassigned
        }
        return true;
      });
      if (removedCrew.length === 0) continue;
      const nextCrew = other.crewmanIds.filter((id) => !removedCrew.includes(id));
      updateJob(other.id, { crewmanIds: nextCrew });
      const removedNames = removedCrew
        .map((id) => {
          const u = allPeople.find((x) => x.id === id) || allUsers.find((x) => x.id === id);
          return u?.name;
        })
        .filter((n): n is string => Boolean(n));
      moved.push({
        project: other.projectCode || other.address || "(job)",
        names: [...new Set(removedNames)],
      });
    }

    if (editing.job && editing.job.id !== "draft") {
      updateJob(editing.job.id, payload);
      toast.success("Job updated successfully.");
    } else {
      addJob({ ...payload, date, status: "upcoming" });
      toast.success("Job created successfully.");
    }
    setEditing(null);

    if (moved.length > 0) {
      const summary = moved.map((m) => `${m.names.join(", ")} off ${m.project}`).join("\n");
      // Lightweight notice — keeps the action transparent without blocking flow.
      setTimeout(() => alert(`Reassigned:\n${summary}`), 0);
    }
  }

  function clearDayJobs() {
    if (dayJobs.length === 0) return;
    const scope = " X3 Management";
    const ok = window.confirm(
      `Delete all ${dayJobs.length}${scope} job(s) for ${fmtDayShort(date)}?\n\nThis cannot be undone.`,
    );
    if (!ok) return;
    dayJobs.forEach((j) => deleteJob(j.id));
  }

  function copyPrevDay() {
    const sources = previousScheduleJobs;
    if (sources.length === 0) {
      alert("No recent schedule found in the last 14 days.");
      return;
    }
    const ok = window.confirm(
      `Copy/merge ${sources.length} job(s) from ${fmtDayShort(previousScheduleDate!)} to ${fmtDayShort(date)}?`,
    );
    if (!ok) return;

    sources.forEach((j) => {
      const matchingJob =
        dayJobs.find(
          (dj) =>
            dj.projectCode.toLowerCase() === j.projectCode.toLowerCase() &&
            dj.adpNumber.toLowerCase() === j.adpNumber.toLowerCase() &&
            dj.address.toLowerCase() === j.address.toLowerCase(),
        ) ||
        dayJobs.find(
          (dj) =>
            dj.projectCode.toLowerCase() === j.projectCode.toLowerCase() &&
            dj.adpNumber.toLowerCase() === j.adpNumber.toLowerCase(),
        );

      if (matchingJob) {
        updateJob(matchingJob.id, {
          crewmanIds: j.crewmanIds,
          managerIds: j.managerIds,
          sow: j.sow,
          workingHours: j.workingHours,
          towerOwner: j.towerOwner,
          hoursDaysRemaining: j.hoursDaysRemaining,
          notes: j.notes,
          jobType: j.jobType,
          gateCode: j.gateCode,
          projectCoordinatorId: j.projectCoordinatorId,
          pcNotes: j.pcNotes,
          assetScanNotice: j.assetScanNotice,
        });
      } else {
        copyFrom(j.id, date);
      }
    });
  }

  function exportCsv() {
    const csv = jobsToCsv(dayJobs);
    downloadCsv(`schedule_${date}.csv`, csv);
  }

  return (
    <AppShell subtitle="Schedule Builder">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-2xl font-black tracking-tight">Schedule Builder</h2>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:border-primary"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      {/* Date toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
        <button
          onClick={() => setDate(addDays(date, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Calendar className="h-4 w-4 text-primary" />
          {fmtDayLong(date)}
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="ml-auto h-9 justify-start gap-1.5 text-xs font-bold"
            >
              <Calendar className="h-3.5 w-3.5" /> {date}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <DatePickerCalendar
              mode="single"
              selected={parseIsoDate(date)}
              onSelect={(d) => {
                if (d) setDate(toIsoDate(d));
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <button
          onClick={copyPrevDay}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider hover:border-primary"
        >
          <Copy className="h-3.5 w-3.5" /> Use last schedule
        </button>
      </div>

      {/* Market filter */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Market:
        </span>
        <span className="rounded-md border border-primary bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          X3 Management
        </span>
        {dayJobs.length > 0 && (
          <button
            onClick={clearDayJobs}
            className="ml-auto flex items-center gap-1.5 rounded-md border border-destructive/50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear {dayJobs.length} job
            {dayJobs.length === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-3 flex gap-1 border-b border-border">
        {(
          [
            { id: "jobs", label: `Jobs (${dayJobs.length})` },
            { id: "roster", label: `Crew Roster (${scopedCrewmen.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
              tab === t.id
                ? "border-b-2 border-primary text-foreground"
                : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Jobs list for selected day */}
      {tab === "jobs" && (
        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Jobs · {filteredDayJobs.length}
            </h3>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[11px] font-black uppercase tracking-wider text-primary-foreground shadow-glow"
            >
              <Plus className="h-3.5 w-3.5" /> New job
            </button>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </span>
              <input
                type="text"
                placeholder="Search project code, crew name, address, owner, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-10"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                className="h-10 rounded-lg border border-border bg-card px-3 text-xs font-semibold outline-none ring-primary focus:ring-1 focus:border-primary min-w-[130px] cursor-pointer"
              >
                <option value="all">All Job Types</option>
                <option value="none">No Job Type</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Tower Owner">Tower Owner</option>
                <option value="Civil">Civil</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Carrier">Carrier</option>
                <option value="Special Project">Special Project</option>
                <option value="MCA">MCA</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={pcFilter}
                onChange={(e) => setPcFilter(e.target.value)}
                className="h-10 rounded-lg border border-border bg-card px-3 text-xs font-semibold outline-none ring-primary focus:ring-1 focus:border-primary min-w-[150px] cursor-pointer"
              >
                <option value="all">All Coordinators</option>
                {user?.role === "admin" || user?.role === "staff" ? (
                  <option value="my-jobs">My Jobs</option>
                ) : null}
                <option value="none">Unassigned</option>
                {scopedManagers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {dayJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
              No jobs scheduled for this day yet.
            </div>
          ) : filteredDayJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
              No jobs match your search filter.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2.5 text-left font-bold">Project</th>
                      <th className="px-3 py-2.5 text-left font-bold">ADP #</th>
                      <th className="px-3 py-2.5 text-left font-bold">Address</th>
                      <th className="px-3 py-2.5 text-left font-bold">SOW</th>
                      <th className="px-3 py-2.5 text-left font-bold">Hours</th>
                      <th className="px-3 py-2.5 text-left font-bold">Owner</th>
                      <th className="px-3 py-2.5 text-center font-bold">Crew</th>
                      <th className="px-3 py-2.5 text-center font-bold">Mgr</th>
                      <th className="px-3 py-2.5 text-left font-bold">Remaining</th>
                      <th className="px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDayJobs.map((j) => (
                      <tr
                        key={j.id}
                        onClick={() => openEdit(j)}
                        className="cursor-pointer border-b border-border/60 transition hover:bg-surface/60"
                      >
                        <td className="px-3 py-2.5 font-mono text-xs font-bold text-foreground">
                          {j.projectCode || "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                          {j.adpNumber || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-foreground">{j.address || "—"}</td>
                        <td className="px-3 py-2.5 max-w-xs truncate text-xs text-muted-foreground">
                          {j.sow || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {j.workingHours || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {j.towerOwner || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs font-bold">
                          {j.crewmanIds.length}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs font-bold">
                          {j.managerIds.length}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {j.hoursDaysRemaining || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <MoreVertical className="inline h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Roster — green when assigned, status pill when marked */}
      {tab === "roster" && (
        <section className="mb-5">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Crew roster · green = covered for {fmtDayShort(date)}
          </h3>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2.5 text-left font-bold">Crewman</th>
                    <th className="px-3 py-2.5 text-left font-bold">Title</th>
                    <th className="px-3 py-2.5 text-left font-bold">Market</th>
                    <th className="px-3 py-2.5 text-center font-bold">Status</th>
                    <th className="px-3 py-2.5 text-right font-bold">Mark</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const seenAlias = new Set<string>();
                    return scopedCrewmen.filter((c) => {
                      const key = aliasIdsFor(c.id).slice().sort().join("|");
                      if (seenAlias.has(key)) return false;
                      seenAlias.add(key);
                      return true;
                    });
                  })().map((c) => {
                    const ids = aliasIdsFor(c.id);
                    const mark = ids.map((i) => getDayMark(i, date)).find(Boolean);
                    const assigned = ids.some((i) => isAssigned(i, date));
                    const markets = Array.from(
                      new Set(
                        ids
                          .map((i) => {
                            const u = crewmen.find((x) => x.id === i);
                            return u?.market === "vegas" || u?.market === "socal"
                              ? "X3 Management"
                              : "";
                          })
                          .filter(Boolean),
                      ),
                    ).join(" / ");
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-border/60 transition ${
                          assigned ? "bg-success/10" : "hover:bg-surface/60"
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                                assigned
                                  ? "bg-success text-success-foreground"
                                  : "bg-primary text-primary-foreground"
                              }`}
                            >
                              {c.initials}
                            </div>
                            <span className="text-xs font-bold text-foreground">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {c.title ?? ROLE_LABELS[c.role]}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {markets || "X3 Management"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {assigned ? (
                            <span className="rounded-full border border-success/50 bg-success/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-success">
                              Assigned
                            </span>
                          ) : mark?.status ? (
                            <span className="rounded-full border border-warning/50 bg-warning/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-warning">
                              {mark.status}
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <select
                            value={mark?.status ?? ""}
                            onChange={(e) =>
                              setDayMark(c.id, date, (e.target.value || null) as DayStatus | null)
                            }
                            className="h-7 rounded-md border border-input bg-surface px-1.5 text-[10px]"
                            title="Mark as off / pto / elr / loa"
                          >
                            <option value="">—</option>
                            {DAY_STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {editing && (
        <JobDialog
          existing={editing.job}
          date={date}
          crewmen={scopedCrewmen}
          foremen={scopedForemen}
          managers={scopedManagers}
          jobsToday={dayJobs}
          previousScheduleDate={previousScheduleDate}
          jobsPrevDay={previousScheduleJobs}
          assignedElsewhere={(() => {
            const set = new Set<string>();
            for (const j of dayJobs) {
              if (editing.job && j.id === editing.job.id) continue;
              j.crewmanIds.forEach((id) => set.add(id));
              j.managerIds.forEach((id) => set.add(id));
            }
            return set;
          })()}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={
            editing.job
              ? () => {
                  const j = editing.job!;
                  const label = j.projectCode || j.address || "this job";
                  if (
                    window.confirm(
                      `Delete "${label}" for ${fmtDayShort(date)}?\n\nThis cannot be undone.`,
                    )
                  ) {
                    deleteJob(j.id);
                    setEditing(null);
                  }
                }
              : undefined
          }
          onUsePrevious={(prevJob) => {
            setEditing({
              job: { ...prevJob, id: editing.job?.id ?? "draft", date, status: "upcoming" },
            });
          }}
        />
      )}
    </AppShell>
  );
}

function JobRow({ job, onEdit }: { job: Job; onEdit: () => void }) {
  const crew = job.crewmanIds.length;
  const mgrs = job.managerIds.length;
  return (
    <li>
      <button
        onClick={onEdit}
        className="block w-full rounded-xl border border-border bg-card p-3 text-left hover:border-primary/50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate font-mono text-xs font-bold">{job.projectCode || "—"}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {job.adpNumber || "no adp"}
              </span>
            </div>
            <div className="mt-1 truncate text-sm font-bold">{job.address || "(no address)"}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {job.sow || "(no scope)"}
            </div>
          </div>
          <MoreVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider">
          <Tag>{job.workingHours || "no hours"}</Tag>
          <Tag>{crew} crew</Tag>
          <Tag>{mgrs} mgr</Tag>
          {job.towerOwner && <Tag>{job.towerOwner}</Tag>}
          {job.hoursDaysRemaining && <Tag>{job.hoursDaysRemaining}</Tag>}
        </div>
      </button>
    </li>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-border bg-surface px-2 py-0.5 font-bold text-muted-foreground">
      {children}
    </span>
  );
}

function RosterRow({
  name,
  initials,
  meta,
  assigned,
  mark,
  onMark,
}: {
  name: string;
  initials: string;
  meta: string;
  assigned: boolean;
  mark?: DayStatus;
  onMark: (s: DayStatus | null) => void;
}) {
  const isCovered = assigned;
  return (
    <li
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition ${
        isCovered ? "border-success/60 bg-success/10" : "border-border bg-card"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
          isCovered ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold">{name}</div>
        <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
          {meta}
        </div>
      </div>
      {mark && (
        <span className="rounded-full border border-warning/50 bg-warning/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-warning">
          {mark}
        </span>
      )}
      <select
        value={mark ?? ""}
        onChange={(e) => onMark((e.target.value || null) as DayStatus | null)}
        className="h-7 rounded-md border border-input bg-surface px-1 text-[10px]"
        title="Mark as off / pto / elr / loa"
      >
        <option value="">—</option>
        {DAY_STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </li>
  );
}

/* -------------------- Job dialog -------------------- */

export function JobDialog({
  existing,
  date,
  crewmen,
  foremen,
  managers,
  previousScheduleDate,
  jobsPrevDay,
  assignedElsewhere,
  onClose,
  onSave,
  onDelete,
  onUsePrevious,
}: {
  existing?: Job;
  date: string;
  crewmen: ReturnType<typeof getAllCrewmen>;
  foremen: ReturnType<typeof getAllForemen>;
  managers: ReturnType<typeof getAllManagers>;
  jobsToday?: Job[];
  previousScheduleDate?: string;
  jobsPrevDay: Job[];
  assignedElsewhere: Set<string>;
  onClose: () => void;
  onSave: (input: Omit<Job, "id" | "date" | "status">) => void;
  onDelete?: () => void;
  onUsePrevious: (job: Job) => void;
}) {
  const { user } = useSession();
  const isStaffOrAdmin = user?.role === "admin" || user?.role === "staff";

  const [crewIds, setCrewIds] = useState<string[]>(existing?.crewmanIds ?? []);
  const [mgrIds, setMgrIds] = useState<string[]>(existing?.managerIds ?? []);
  const [projectCode, setProjectCode] = useState(existing?.projectCode ?? "");
  const [adpNumber, setAdp] = useState(existing?.adpNumber ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [sow, setSow] = useState(existing?.sow ?? "");
  const [workingHours, setWorkingHours] = useState(existing?.workingHours ?? "06:00–14:30");
  const [towerOwner, setTowerOwner] = useState(existing?.towerOwner ?? "");
  const [hoursDaysRemaining, setHDR] = useState(existing?.hoursDaysRemaining ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [jobType, setJobType] = useState(existing?.jobType ?? "");
  const [gateCode, setGateCode] = useState(existing?.gateCode ?? "");
  const [projectCoordinatorId, setProjectCoordinatorId] = useState(
    existing?.projectCoordinatorId ?? "",
  );
  const [pcNotes, setPcNotes] = useState(existing?.pcNotes ?? "");
  const [assetScanNotice, setAssetScanNotice] = useState(existing?.assetScanNotice ?? false);
  const [showPrev, setShowPrev] = useState(false);

  useEffect(() => {
    setCrewIds(existing?.crewmanIds ?? []);
    setMgrIds(existing?.managerIds ?? []);
    setProjectCode(existing?.projectCode ?? "");
    setAdp(existing?.adpNumber ?? "");
    setAddress(existing?.address ?? "");
    setSow(existing?.sow ?? "");
    setWorkingHours(existing?.workingHours ?? "06:00–14:30");
    setTowerOwner(existing?.towerOwner ?? "");
    setHDR(existing?.hoursDaysRemaining ?? "");
    setNotes(existing?.notes ?? "");
    setJobType(existing?.jobType ?? "");
    setGateCode(existing?.gateCode ?? "");
    setProjectCoordinatorId(existing?.projectCoordinatorId ?? "");
    setPcNotes(existing?.pcNotes ?? "");
    setAssetScanNotice(existing?.assetScanNotice ?? false);
  }, [existing]);

  const valid = projectCode.trim().length > 0 && crewIds.length > 0;

  const downOnOverlayRef = useRef(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        downOnOverlayRef.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (downOnOverlayRef.current && e.target === e.currentTarget) onClose();
        downOnOverlayRef.current = false;
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-2xl border border-border bg-card shadow-industrial sm:rounded-2xl"
      >
        <div className="flex items-start justify-between border-b border-border p-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {existing && existing.id !== "draft" ? "Edit job" : "New job"}
            </div>
            <div className="text-base font-black">{fmtDayLong(date)}</div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Use previous day */}
          {jobsPrevDay.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPrev((s) => !s)}
                className="flex w-full items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary"
              >
                <span className="flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Use info from last schedule
                  {previousScheduleDate ? ` (${fmtDayShort(previousScheduleDate)})` : ""}
                </span>
                <span>{showPrev ? "Hide" : "Show"}</span>
              </button>
              {showPrev && (
                <ul className="mt-1.5 space-y-1">
                  {jobsPrevDay.map((j) => (
                    <li key={j.id}>
                      <button
                        type="button"
                        onClick={() => onUsePrevious(j)}
                        className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-left text-xs hover:border-primary"
                      >
                        <div className="font-mono font-bold">{j.projectCode}</div>
                        <div className="truncate text-muted-foreground">{j.address}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Build alias-grouped, deduped picker entries.
              Each unique person (by name+phone) appears once under their
              primary market. Selecting them stores ALL alias ids so
              SoCal/Vegas market lookups both find them. */}
          {(() => {
            const seen = new Set<string>();
            function dedupe(list: typeof crewmen) {
              const out: typeof crewmen = [];
              for (const u of list) {
                const ids = aliasIdsFor(u.id);
                const key = ids.slice().sort().join("|");
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(u);
              }
              return out;
            }
            const combinedCrew = dedupe(
              crewmen.filter((u) => u.market === "socal" || u.market === "vegas"),
            );
            const combinedForemen = dedupe(
              foremen.filter((u) => u.market === "socal" || u.market === "vegas"),
            );
            const toEntry = (u: (typeof crewmen)[number]) => ({
              id: u.id,
              name: u.name,
              initials: u.initials,
              meta: u.title ?? ROLE_LABELS[u.role],
              aliasIds: aliasIdsFor(u.id),
            });
            return (
              <>
                <PickerGroup
                  label="Foreman assigned"
                  hint="Pick foreman from the list to assign."
                  assignedElsewhere={assignedElsewhere}
                  groups={[{ title: "Foremen", people: combinedForemen.map(toEntry) }]}
                  selected={mgrIds}
                  setSelected={setMgrIds}
                />
                <PickerGroup
                  label="Crewman assigned"
                  hint="Pick crew member from the list to assign."
                  assignedElsewhere={assignedElsewhere}
                  groups={[{ title: "Crew members", people: combinedCrew.map(toEntry) }]}
                  selected={crewIds}
                  setSelected={setCrewIds}
                />
              </>
            );
          })()}

          <div className="grid grid-cols-2 gap-2">
            <Field label="Project Code">
              <input
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="SD-4421-A"
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm font-mono uppercase outline-none ring-primary focus:ring-2"
              />
            </Field>
            <Field label="ADP #">
              <input
                value={adpNumber}
                onChange={(e) => setAdp(e.target.value)}
                placeholder="ADP-019283"
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm font-mono uppercase outline-none ring-primary focus:ring-2"
              />
            </Field>
          </div>
          <Field label="Address">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="1245 Otay Mesa Rd…"
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none ring-primary focus:ring-2"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Job Type">
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none ring-primary focus:ring-2"
              >
                <option value="">Select Type</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Tower Owner">Tower Owner</option>
                <option value="Civil">Civil</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Carrier">Carrier</option>
                <option value="Special Project">Special Project</option>
                <option value="MCA">MCA</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Gate Code">
              <input
                value={gateCode}
                onChange={(e) => setGateCode(e.target.value)}
                placeholder="#1234 or Keypad"
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none ring-primary focus:ring-2"
              />
            </Field>
          </div>

          {isStaffOrAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Field label="Project Coordinator">
                <select
                  value={projectCoordinatorId}
                  onChange={(e) => setProjectCoordinatorId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none ring-primary focus:ring-2"
                >
                  <option value="">Select PC</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.title ?? "Staff"})
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={assetScanNotice}
                    onChange={(e) => setAssetScanNotice(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Require Asset Scan
                  </span>
                </label>
              </div>
            </div>
          )}

          <Field label="SOW">
            <textarea
              value={sow}
              onChange={(e) => setSow(e.target.value.slice(0, 2000))}
              maxLength={2000}
              rows={6}
              placeholder="Scope of work"
              className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
            />
            <div className="mt-1 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
              {sow.length}/2000
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Working Hours">
              <input
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                placeholder="06:00–14:30"
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none ring-primary focus:ring-2"
              />
            </Field>
            <Field label="Tower Owner">
              <input
                value={towerOwner}
                onChange={(e) => setTowerOwner(e.target.value)}
                placeholder="Crown Castle"
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none ring-primary focus:ring-2"
              />
            </Field>
          </div>
          <Field label="Hours / Days Remaining">
            <input
              value={hoursDaysRemaining}
              onChange={(e) => setHDR(e.target.value)}
              placeholder="38h · 4d"
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none ring-primary focus:ring-2"
            />
          </Field>
          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
              maxLength={2000}
              rows={6}
              placeholder="Gate access, RF coordination, etc."
              className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
            />
            <div className="mt-1 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
              {notes.length}/2000
            </div>
          </Field>

          {isStaffOrAdmin && (
            <Field label="Note Taker Notes (Staff/Admin Only)">
              <textarea
                value={pcNotes}
                onChange={(e) => setPcNotes(e.target.value.slice(0, 2000))}
                maxLength={2000}
                rows={4}
                placeholder="Private notes for PC and admin..."
                className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
              />
              <div className="mt-1 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                {pcNotes.length}/2000
              </div>
            </Field>
          )}
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          {onDelete && existing && existing.id !== "draft" && (
            <button
              onClick={onDelete}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-destructive/50 text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            disabled={!valid}
            onClick={() =>
              onSave({
                crewmanIds: crewIds,
                managerIds: mgrIds,
                projectCode,
                adpNumber,
                address,
                sow,
                workingHours,
                towerOwner,
                hoursDaysRemaining,
                notes,
                jobType: jobType || undefined,
                gateCode: gateCode || undefined,
                projectCoordinatorId: projectCoordinatorId || undefined,
                pcNotes: pcNotes || undefined,
                assetScanNotice,
              })
            }
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            <Check className="h-4 w-4" /> Save job
          </button>
        </div>
      </div>
    </div>
  );
}

function PickerGroup({
  label,
  people,
  groups,
  selected,
  setSelected,
  assignedElsewhere,
  hint,
}: {
  label: string;
  hint?: string;
  people?: { id: string; name: string; initials: string; meta: string; aliasIds?: string[] }[];
  groups?: {
    title: string;
    people: { id: string; name: string; initials: string; meta: string; aliasIds?: string[] }[];
  }[];
  selected: string[];
  setSelected: (s: string[]) => void;
  assignedElsewhere?: Set<string>;
}) {
  function toggle(p: { id: string; aliasIds?: string[] }) {
    const ids = p.aliasIds && p.aliasIds.length ? p.aliasIds : [p.id];
    const isOn = ids.some((i) => selected.includes(i));
    if (isOn) {
      setSelected(selected.filter((x) => !ids.includes(x)));
    } else {
      setSelected([...selected, ...ids.filter((i) => !selected.includes(i))]);
    }
  }
  const lastKey = (n: string) => {
    const parts = n.trim().split(/\s+/);
    return (
      parts.length < 2 ? n : `${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}`
    ).toLowerCase();
  };
  const sortPeople = <T extends { name: string }>(arr: T[]) =>
    [...arr].sort((a, b) => lastKey(a.name).localeCompare(lastKey(b.name)));
  const sections = (groups ?? (people ? [{ title: "", people }] : [])).map((s) => ({
    ...s,
    people: sortPeople(s.people),
  }));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-warning" /> on another job
          </span>
          <span>{selected.length} selected</span>
        </div>
      </div>
      {hint && <div className="mb-1.5 text-[10px] italic text-muted-foreground">{hint}</div>}
      <div className="space-y-3">
        {sections.map((sec) => (
          <div key={sec.title || "all"}>
            {sec.title && (
              <div className="mb-1.5 border-b border-border pb-1 text-[11px] font-black uppercase tracking-wider text-primary">
                {sec.title}
              </div>
            )}
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {sec.people.map((p) => {
                const ids = p.aliasIds && p.aliasIds.length ? p.aliasIds : [p.id];
                const on = ids.some((i) => selected.includes(i));
                const taken =
                  !on && !!assignedElsewhere && ids.some((i) => assignedElsewhere.has(i));
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      title={taken ? "Already assigned to another job today" : undefined}
                      className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition ${
                        on
                          ? "border-success/60 bg-success/10"
                          : taken
                            ? "border-warning/50 bg-warning/10 hover:border-warning"
                            : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                          on
                            ? "bg-success text-success-foreground"
                            : taken
                              ? "bg-warning text-warning-foreground"
                              : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {p.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold">{p.name}</div>
                        <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                          {taken ? "Booked on another job" : p.meta}
                        </div>
                      </div>
                      {on && <Check className="h-3.5 w-3.5 text-success" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}
