import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useStaffGuard } from "@/lib/guards";
import { useSession } from "@/lib/session";
import { useSchedule, DAY_STATUS_LABELS, isBlankOwner } from "@/lib/schedule-store";
import { AppShell } from "@/components/AppShell";
import { TODAY, CREWMAN_ROLES, type Market } from "@/lib/mock-data";
import { useDirectory } from "@/lib/directory-store";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/acknowledgements")({
  head: () => ({ meta: [{ title: "Operations — X3 Field Ops" }] }),
  component: AcknowledgementsPage,
});

function AcknowledgementsPage() {
  useStaffGuard();
  const navigate = useNavigate();
  const [market, setMarket] = useState<Market>("socal");

  return (
    <AppShell subtitle="Operations">
      <h2 className="mb-3 text-2xl font-black tracking-tight">Operations — Today</h2>

      <ComplianceList
        market={market}
        onOpenUser={(userId) => navigate({ to: "/acknowledge", search: { userId } as never })}
      />
    </AppShell>
  );
}

function formatDirectoryName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const lastName = parts[parts.length - 1];
  const firstNames = parts.slice(0, -1).join(" ");
  return `${lastName}, ${firstNames}`;
}

function ComplianceList({
  market,
  onOpenUser,
}: {
  market: Market;
  onOpenUser: (userId: string) => void;
}) {
  const { getProgressForDate } = useSession();
  const { getDayMark, jobs } = useSchedule();
  const { people } = useDirectory();

  const activeJobsToday = useMemo(() => {
    return jobs.filter((j) => j.date === TODAY);
  }, [jobs]);

  const scheduledCrewIds = useMemo(() => {
    return new Set(activeJobsToday.flatMap((j) => j.crewmanIds));
  }, [activeJobsToday]);

  // Only crew members scheduled today on active jobs need to acknowledge.
  const list = useMemo(() => {
    return people
      .filter(
        (u) => u.market === market && CREWMAN_ROLES.includes(u.role) && scheduledCrewIds.has(u.id),
      )
      .sort((a, b) => formatDirectoryName(a.name).localeCompare(formatDirectoryName(b.name)));
  }, [people, market, scheduledCrewIds]);

  const rows = list.map((u) => {
    const mark = getDayMark(u.id, TODAY);
    const progress = getProgressForDate(u.id, market, TODAY);
    return {
      user: u,
      done: progress.done,
      total: progress.total,
      complete: progress.complete,
      mark: mark?.status,
    };
  });

  // Anyone marked OFF/PTO/etc. is excluded from required acknowledgements
  const required = rows.filter((r) => !r.mark);
  const completeCount = required.filter((r) => r.complete).length;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Compliant" value={`${completeCount}/${required.length}`} accent="success" />
        <Stat
          label="Outstanding"
          value={String(required.length - completeCount)}
          accent="primary"
        />
        <Stat label="Excluded" value={String(rows.length - required.length)} accent="muted" />
        <Stat label="Total Crew" value={String(rows.length)} accent="muted" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-industrial">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left font-bold">Crew Member</th>
                <th className="px-3 py-2.5 text-left font-bold">Role</th>
                <th className="px-3 py-2.5 text-left font-bold">Status</th>
                <th className="px-3 py-2.5 text-right font-bold">Progress</th>
                <th className="px-3 py-2.5 text-right font-bold">%</th>
                <th className="px-3 py-2.5 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.total === 0 ? 0 : Math.round((r.done / r.total) * 100);
                const roleLabel =
                  r.user.role === "foreman"
                    ? "Foreman"
                    : r.user.role === "warehouse"
                      ? "Warehouse"
                      : "Crewman";
                if (r.mark) {
                  return (
                    <tr key={r.user.id} className="border-b border-border/60 bg-warning/5">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-warning/20 text-[10px] font-black text-warning">
                            {r.user.initials}
                          </div>
                          <span className="text-xs font-bold">
                            {formatDirectoryName(r.user.name)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{roleLabel}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded border border-warning/50 bg-warning/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-warning">
                          {r.mark} · {DAY_STATUS_LABELS[r.mark]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">—</td>
                      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">—</td>
                      <td className="px-3 py-2.5 text-right text-[11px] uppercase tracking-wider text-muted-foreground">
                        Excluded
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr
                    key={r.user.id}
                    className="cursor-pointer border-b border-border/60 transition hover:bg-surface/60"
                    onClick={() => onOpenUser(r.user.id)}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                          {r.user.initials}
                        </div>
                        <span className="text-xs font-bold">
                          {formatDirectoryName(r.user.name)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{roleLabel}</td>
                    <td className="px-3 py-2.5">
                      {r.complete ? (
                        <span className="inline-flex items-center gap-1.5 rounded border border-success/50 bg-success/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-success">
                          <CheckCircle2 className="h-3 w-3" /> Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-destructive">
                          <AlertCircle className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right text-xs font-black ${r.complete ? "text-success" : "text-destructive"}`}
                    >
                      {r.done}/{r.total}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">{pct}%</td>
                    <td className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-primary">
                      Open →
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No crew scheduled in this market today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground">
        Records retained 2 years for compliance. Crew marked OFF/PTO/HOL/ELR/LOA are excluded from
        required acknowledgements.
      </p>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "success" | "primary" | "muted";
}) {
  const color =
    accent === "success"
      ? "text-success"
      : accent === "primary"
        ? "text-primary"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}
