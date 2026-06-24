import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStaffGuard } from "@/lib/guards";
import { AppShell } from "@/components/AppShell";
import {
  useSchedule,
  addDays,
  fmtDayShort,
  fmtDayLong,
  jobsToCsv,
  downloadCsv,
  type Job,
} from "@/lib/schedule-store";
import { dailyDocs, users } from "@/lib/mock-data";
import { useDirectory } from "@/lib/directory-store";
import { useBriefing } from "@/lib/briefing-store";
import {
  Download,
  Printer,
  Calendar,
  Megaphone,
  ShieldAlert,
  BookOpen,
  Briefcase,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — X3 Communications" }] }),
  component: ReportsPage,
});

type Kind = "schedule" | "announcements" | "safety" | "lessons" | "roster";

function ReportsPage() {
  useStaffGuard();
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<Kind>("schedule");
  const [from, setFrom] = useState(addDays(today, -7));
  const [to, setTo] = useState(today);
  const { jobs, getDayMark } = useSchedule();
  const { allPeople } = useDirectory();
  const { getEffectiveDocSet } = useBriefing();

  const inRange = useMemo(
    () =>
      jobs
        .filter((j) => j.date >= from && j.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [jobs, from, to],
  );

  const docsInRange = useMemo(
    () =>
      dailyDocs
        .filter((d) => d.date >= from && d.date <= to)
        .map((d) => {
          const eff = getEffectiveDocSet(d.market, d.date);
          return eff ?? d;
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
    [from, to, getEffectiveDocSet],
  );

  function exportCsv() {
    if (kind === "schedule") {
      downloadCsv(`schedule_${from}_to_${to}.csv`, jobsToCsv(inRange));
      return;
    }
    if (kind === "roster") {
      const fieldCrew = allPeople
        .filter((u) => u.staffOrField === "Field" && !u.hiddenFromDirectory)
        .sort((a, b) => a.name.localeCompare(b.name));
      const dates = getDatesInRange(from, to);
      const header = ["Crew Member", ...dates];
      const escape = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
      const rows = fieldCrew.map((u) => {
        const rowData = [u.name];
        dates.forEach((date) => {
          const mark = getDayMark(u.id, date);
          const assignedJob = jobs.find(
            (j) => j.date === date && (j.crewmanIds.includes(u.id) || j.managerIds.includes(u.id)),
          );
          if (mark) {
            rowData.push(mark.status);
          } else if (assignedJob) {
            rowData.push(assignedJob.projectCode || "Job");
          } else {
            rowData.push("");
          }
        });
        return rowData.map((v) => escape(String(v))).join(",");
      });
      downloadCsv(
        `roster_${from}_to_${to}.csv`,
        [header.map(escape).join(","), ...rows].join("\n"),
      );
      return;
    }
    const header = ["Date", "Title", "Body"];
    const escape = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
    const rows = docsInRange
      .filter((d) => {
        const item =
          kind === "announcements" ? d.announcement : kind === "safety" ? d.safety : d.lesson;
        return !!(item.title?.trim() || item.body?.trim());
      })
      .map((d) => {
        const item =
          kind === "announcements" ? d.announcement : kind === "safety" ? d.safety : d.lesson;
        return [d.date, item.title, item.body].map((v) => escape(String(v))).join(",");
      });
    downloadCsv(`${kind}_${from}_to_${to}.csv`, [header.map(escape).join(","), ...rows].join("\n"));
  }

  function printView() {
    window.print();
  }

  return (
    <AppShell subtitle="Reports">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-2xl font-black tracking-tight">Reports</h2>
        <div className="flex gap-1.5 print:hidden">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:border-primary"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            onClick={printView}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:border-primary"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2 print:hidden sm:grid-cols-5">
        {(
          [
            { k: "schedule", label: "Schedule", icon: Briefcase },
            { k: "announcements", label: "Announcements", icon: Megaphone },
            { k: "safety", label: "Safety", icon: ShieldAlert },
            { k: "lessons", label: "Lessons", icon: BookOpen },
            { k: "roster", label: "Roster", icon: Users },
          ] as { k: Kind; label: string; icon: typeof Briefcase }[]
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setKind(t.k)}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
              kind === t.k
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 print:hidden">
        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-md border border-input bg-surface px-2 text-xs"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-md border border-input bg-surface px-2 text-xs"
          />
        </label>
      </div>

      {/* Print header */}
      <div className="mb-3 hidden print:block">
        <h1 className="text-xl font-black">X3 Communications · {kindTitle(kind)} Report</h1>
        <div className="text-xs text-muted-foreground">
          {fmtDayLong(from)} → {fmtDayLong(to)}
        </div>
      </div>

      {kind === "schedule" ? (
        <ScheduleReport rows={inRange} />
      ) : kind === "roster" ? (
        <RosterReport from={from} to={to} />
      ) : (
        <DocsReport kind={kind} rows={docsInRange} />
      )}
    </AppShell>
  );
}

function kindTitle(k: Kind) {
  return k === "schedule"
    ? "Schedule"
    : k === "announcements"
      ? "Announcements"
      : k === "safety"
        ? "Safety Topic"
        : k === "lessons"
          ? "Lessons Learned"
          : "Crew Roster";
}

function ScheduleReport({ rows }: { rows: Job[] }) {
  const { allPeople } = useDirectory();
  if (rows.length === 0) return <Empty>No jobs in this range.</Empty>;
  return (
    <ul className="space-y-2">
      {rows.map((j) => (
        <li
          key={j.id}
          className="rounded-xl border border-border bg-card p-3 print:break-inside-avoid"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {fmtDayShort(j.date)}
              </div>
              <div className="font-mono text-sm font-black">{j.projectCode}</div>
            </div>
            <div className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
              {j.workingHours} · {j.towerOwner}
            </div>
          </div>
          <div className="mt-1 text-sm">{j.address}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{j.sow}</div>
          <div className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Crew:{" "}
            {j.crewmanIds
              .map((id) => allPeople.find((u) => u.id === id)?.name)
              .filter(Boolean)
              .join(", ") || "—"}
            {" · "}Mgr:{" "}
            {j.managerIds
              .map((id) => allPeople.find((u) => u.id === id)?.name)
              .filter(Boolean)
              .join(", ") || "—"}
          </div>
        </li>
      ))}
    </ul>
  );
}

function DocsReport({ kind, rows }: { kind: Kind; rows: typeof dailyDocs }) {
  const activeRows = useMemo(() => {
    return rows.filter((d) => {
      const item =
        kind === "announcements" ? d.announcement : kind === "safety" ? d.safety : d.lesson;
      return !!(item.title?.trim() || item.body?.trim());
    });
  }, [kind, rows]);

  if (activeRows.length === 0)
    return <Empty>No active {kindTitle(kind).toLowerCase()} in this range.</Empty>;
  return (
    <ul className="space-y-2">
      {activeRows.map((d) => {
        const item =
          kind === "announcements" ? d.announcement : kind === "safety" ? d.safety : d.lesson;
        return (
          <li
            key={`${d.date}-${d.market}-${item.id}`}
            className="rounded-xl border border-border bg-card p-3 print:break-inside-avoid"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {fmtDayShort(d.date)} · {d.market === "socal" ? "X3 Management" : "Las Vegas"}
            </div>
            <div className="text-sm font-black">{item.title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{item.body}</div>
          </li>
        );
      })}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function getDatesInRange(fromStr: string, toStr: string): string[] {
  const dates: string[] = [];
  let current = new Date(`${fromStr}T00:00:00`);
  const end = new Date(`${toStr}T00:00:00`);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function RosterReport({ from, to }: { from: string; to: string }) {
  const { allPeople } = useDirectory();
  const { jobs, getDayMark } = useSchedule();

  const fieldCrew = useMemo(() => {
    return allPeople
      .filter((u) => u.staffOrField === "Field" && !u.hiddenFromDirectory)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPeople]);

  const dates = useMemo(() => getDatesInRange(from, to), [from, to]);

  if (fieldCrew.length === 0) {
    return <Empty>No field crew found in directory.</Empty>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <tr>
            <th className="sticky left-0 z-10 bg-surface px-4 py-3 font-bold border-r border-border min-w-[150px]">
              Crew Member
            </th>
            {dates.map((date) => {
              const d = new Date(`${date}T00:00:00`);
              const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
              const dateStr = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
              return (
                <th
                  key={date}
                  className="px-3 py-3 font-bold border-r border-border text-center min-w-[100px]"
                >
                  <div>{dayStr}</div>
                  <div className="text-[9px] text-muted-foreground">{dateStr}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {fieldCrew.map((u) => (
            <tr key={u.id} className="border-b border-border hover:bg-surface/50">
              <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-semibold border-r border-border text-foreground hover:bg-surface">
                {u.name}
              </td>
              {dates.map((date) => {
                const mark = getDayMark(u.id, date);
                const assignedJob = jobs.find(
                  (j) =>
                    j.date === date && (j.crewmanIds.includes(u.id) || j.managerIds.includes(u.id)),
                );

                let content = <span className="text-muted-foreground/40">—</span>;
                if (mark) {
                  const statusColors: Record<string, string> = {
                    OFF: "bg-muted/50 text-muted-foreground border border-border",
                    PTO: "bg-warning/20 text-warning border border-warning/30",
                    HOL: "bg-info/20 text-info border border-info/30",
                    ELR: "bg-destructive/20 text-destructive border border-destructive/30",
                    LOA: "bg-purple-500/20 text-purple-600 border border-purple-500/30",
                  };
                  content = (
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded font-black text-[9px] ${statusColors[mark.status] || "bg-muted text-muted-foreground"}`}
                    >
                      {mark.status}
                    </span>
                  );
                } else if (assignedJob) {
                  content = (
                    <div className="flex flex-col items-center">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20 font-mono font-bold text-[10px]">
                        {assignedJob.projectCode || "Job"}
                      </span>
                    </div>
                  );
                }

                return (
                  <td key={date} className="px-3 py-2.5 border-r border-border text-center">
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
