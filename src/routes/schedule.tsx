import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useFieldGuard } from "@/lib/guards";
import { useSession } from "@/lib/session";
import {
  useSchedule,
  DAY_STATUS_LABELS,
  isBlankOwner,
  getAllCrewmen,
  getAllManagers,
  getAllForemen,
  fmtDayShort,
  type DayStatus,
} from "@/lib/schedule-store";
import { AppShell } from "@/components/AppShell";
import {
  Briefcase,
  MapPin,
  Clock,
  Hash,
  StickyNote,
  Calendar,
  Timer,
  Users,
  Phone,
  Mail,
  X,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TODAY, users } from "@/lib/mock-data";
import { useDirectory } from "@/lib/directory-store";
import { useBriefing } from "@/lib/briefing-store";
import { JobDialog } from "./schedule-builder";
import type { Job } from "@/lib/schedule-store";

function getWeekRange(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  // Set start to Sunday
  start.setDate(start.getDate() - day);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return { start, end };
}

export const Route = createFileRoute("/schedule")({
  head: () => ({ meta: [{ title: "My Schedule — X3 Communications" }] }),
  component: MyScheduleViewer,
});

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function MyScheduleViewer() {
  useFieldGuard();
  const { user, selectedMarket } = useSession();
  const { jobs, updateJob, deleteJob } = useSchedule();
  const [selectedDate, setSelectedDate] = useState(() => new Date(`${TODAY}T00:00:00`));
  const [editing, setEditing] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

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

  const market = selectedMarket ?? user?.market ?? "socal";
  const selectedDateIso = useMemo(() => toIsoDate(selectedDate), [selectedDate]);
  const selectedDateLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [selectedDate],
  );

  const weekRange = useMemo(() => getWeekRange(selectedDate), [selectedDate]);
  const weekStartIso = useMemo(() => toIsoDate(weekRange.start), [weekRange]);
  const weekEndIso = useMemo(() => toIsoDate(weekRange.end), [weekRange]);

  // Crew can navigate to any date their manager has posted a schedule for
  // (including future days). The date picker is unrestricted; if nothing is
  // posted for the chosen day they see the "nothing scheduled" state.

  if (!user) return null;

  // Staff/admin see ALL jobs in their market for the chosen day.
  // Foremen, top-hands, apprentices and warehouse see only the job they're personally assigned to.
  const isFullDayViewer = user.role === "staff" || user.role === "admin";

  const dayJobs = jobs.filter((entry) => {
    if (entry.date !== selectedDateIso) return false;

    if (isFullDayViewer) {
      if (entry.market) return entry.market === market;
      const memberIds = [...entry.crewmanIds, ...entry.managerIds];
      const memberMarkets = new Set(
        memberIds.map((id) => users.find((u) => u.id === id)?.market).filter(Boolean) as string[],
      );
      if (memberMarkets.size === 0) return true;
      return memberMarkets.has(market);
    }
    return entry.crewmanIds.includes(user.id) || entry.managerIds.includes(user.id);
  });

  const weekJobs = jobs
    .filter((j) => {
      const isAssigned = j.crewmanIds.includes(user.id) || j.managerIds.includes(user.id);
      const inWeek = j.date >= weekStartIso && j.date <= weekEndIso;
      return isAssigned && inWeek;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const myJob = dayJobs.find(
    (j) => j.crewmanIds.includes(user.id) || j.managerIds.includes(user.id),
  );
  const otherJobs = dayJobs.filter((j) => j !== myJob);

  function handleDialogSave(input: Omit<Job, "id" | "date" | "status">) {
    if (!editing) return;
    const isUpdate = editing.id !== "draft";
    const pcChanged = isUpdate && (user?.role === "admin" || user?.role === "staff");
    const payload = {
      ...input,
      updatedByPC: pcChanged ? true : (editing.updatedByPC ?? false),
    };
    updateJob(editing.id, payload);
    setEditing(null);
  }

  return (
    <AppShell subtitle="Operations Schedule">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-2xl font-black tracking-tight">
            {isFullDayViewer ? "Daily Schedule" : "My Schedule"}
          </h2>
          <p className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
            X3 Management · {selectedDateLabel} ·{" "}
            {isFullDayViewer
              ? `${dayJobs.length} job${dayJobs.length === 1 ? "" : "s"}`
              : "personal assignment"}
          </p>
        </div>

        {!isFullDayViewer && (
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition ${
                viewMode === "day"
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition ${
                viewMode === "week"
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weekly
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <Calendar className="h-4 w-4" />
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <DatePickerCalendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {!isFullDayViewer && viewMode === "day" && (
        <SelfMark userId={user.id} date={selectedDateIso} hasJob={Boolean(myJob)} />
      )}

      {viewMode === "week" && !isFullDayViewer ? (
        weekJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            No jobs scheduled for you this week ({fmtDayShort(weekStartIso)} →{" "}
            {fmtDayShort(weekEndIso)}).
          </div>
        ) : (
          <div className="space-y-4">
            {weekJobs.map((j) => (
              <JobDetail key={j.id} job={j} onEdit={setEditing} />
            ))}
          </div>
        )
      ) : dayJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
          {isFullDayViewer
            ? "No jobs scheduled for this day."
            : "Nothing scheduled yet. Check back when your manager posts the next job."}
        </div>
      ) : (
        <div className="space-y-4">
          {myJob && (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                Your assignment
              </div>
              <JobDetail job={myJob} onEdit={setEditing} />
            </div>
          )}
          {otherJobs.length > 0 && (
            <div>
              {myJob && (
                <div className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Other X3 Management jobs · {otherJobs.length}
                </div>
              )}
              <div className="space-y-3">
                {otherJobs.map((j) => (
                  <JobDetail key={j.id} job={j} onEdit={setEditing} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {editing && (
        <JobDialog
          existing={editing}
          date={editing.date}
          crewmen={crewmen}
          foremen={foremen}
          managers={managers}
          jobsToday={jobs.filter((j) => j.date === editing.date)}
          jobsPrevDay={[]}
          assignedElsewhere={new Set()}
          onClose={() => setEditing(null)}
          onSave={handleDialogSave}
          onDelete={() => {
            const label = editing.projectCode || editing.address || "this job";
            if (
              window.confirm(
                `Delete "${label}" for ${fmtDayShort(editing.date)}?\n\nThis cannot be undone.`,
              )
            ) {
              deleteJob(editing.id);
              setEditing(null);
            }
          }}
          onUsePrevious={() => {}}
        />
      )}
    </AppShell>
  );
}

function SelfMark({ userId, date, hasJob }: { userId: string; date: string; hasJob: boolean }) {
  const { getDayMark, setDayMark } = useSchedule();
  const mark = getDayMark(userId, date);
  const [picking, setPicking] = useState(false);
  const options: DayStatus[] = ["OFF", "PTO", "HOL", "ELR", "LOA"];

  if (hasJob) return null;

  if (mark) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
        <div>
          <div className="font-bold text-warning">
            Marked {mark.status} — {DAY_STATUS_LABELS[mark.status]}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            No acknowledgements required this day.
          </div>
        </div>
        <button
          onClick={() => setDayMark(userId, date, null)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border"
          aria-label="Clear"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Not working this day?
      </div>
      {!picking ? (
        <button
          onClick={() => setPicking(true)}
          className="h-10 w-full rounded-md border border-border bg-surface text-xs font-bold uppercase tracking-wider text-foreground hover:border-primary"
        >
          Mark as OFF / PTO / HOL / ELR / LOA
        </button>
      ) : (
        <div className="grid grid-cols-5 gap-1.5">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => {
                setDayMark(userId, date, o);
                setPicking(false);
              }}
              className="h-10 rounded-md border border-border bg-surface text-[10px] font-black uppercase tracking-wider hover:border-primary"
              title={DAY_STATUS_LABELS[o]}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function JobDetail({ job, onEdit }: { job: Job; onEdit?: (job: Job) => void }) {
  const { people } = useDirectory();
  const { user } = useSession();
  const { updateJob } = useSchedule();
  const { getEffectiveDocSet } = useBriefing();

  const isStaffOrAdmin = user?.role === "admin" || user?.role === "staff";
  const isAssignedToJob =
    user && (job.crewmanIds.includes(user.id) || job.managerIds.includes(user.id));
  const showPCAckAlert = job.updatedByPC && isAssignedToJob && !isStaffOrAdmin;

  const showAssetScanNotice = job.assetScanNotice;
  const canClearAssetScan =
    user?.role === "warehouse" || user?.role === "admin" || user?.role === "staff";

  const market = job.market ?? user?.market ?? "socal";
  const briefing = getEffectiveDocSet(market, job.date);
  const safetyTopic = briefing?.safety;

  const dayLabel = new Date(`${job.date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const crewContacts = people.filter(
    (u) => job.crewmanIds.includes(u.id) || job.managerIds.includes(u.id),
  );
  const mapsUrl = job.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`
    : "";
  const pc = people.find((u) => u.id === job.projectCoordinatorId);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-industrial">
      {/* PC Change Alert Banner */}
      {showPCAckAlert && (
        <div className="bg-warning/20 border-b border-warning/30 px-4 py-3 flex items-center justify-between text-warning text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-warning" />
            <span>Project Coordinator has updated this job's details.</span>
          </div>
          <button
            onClick={() => updateJob(job.id, { updatedByPC: false })}
            className="px-2.5 py-1 rounded bg-warning/30 hover:bg-warning/45 text-warning font-black border border-warning/40 transition active:scale-[0.98]"
          >
            Acknowledge Changes
          </button>
        </div>
      )}

      {/* Asset Scan Notice Banner */}
      {showAssetScanNotice && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-3 flex items-center justify-between text-red-500 text-xs font-bold uppercase tracking-wider animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span>ASSET SCAN REQUIRED</span>
          </div>
          {canClearAssetScan && (
            <button
              onClick={() => updateJob(job.id, { assetScanNotice: false })}
              className="px-2.5 py-1 rounded bg-red-500/30 hover:bg-red-500/45 text-red-500 font-black border border-red-500/40 transition active:scale-[0.98]"
            >
              Clear Notice
            </button>
          )}
        </div>
      )}

      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Calendar className="h-3.5 w-3.5" /> {dayLabel}
          </div>
          <div className="truncate text-base font-black">{job.projectCode || "Job"}</div>
        </div>
        <div className="flex items-center gap-2">
          {isStaffOrAdmin && onEdit && (
            <button
              onClick={() => onEdit(job)}
              className="rounded-md border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground hover:border-primary transition"
            >
              Edit
            </button>
          )}
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
            Crew assignment
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px bg-border">
        <Stat icon={<Clock className="h-4 w-4" />} label="Window" value={job.workingHours || "—"} />
        <Stat icon={<Hash className="h-4 w-4" />} label="ADP #" value={job.adpNumber} mono />
        <Stat
          icon={<Timer className="h-4 w-4" />}
          label="Remaining"
          value={job.hoursDaysRemaining || "—"}
        />
        <Stat
          icon={<Briefcase className="h-4 w-4" />}
          label="Tower"
          value={job.towerOwner || "—"}
        />
      </div>

      <div className="space-y-4 p-4">
        {job.gateCode && (
          <Section icon={<Hash className="h-4 w-4 text-primary" />} label="Gate Code">
            <p className="text-sm font-mono font-bold text-foreground bg-surface px-2.5 py-1.5 rounded-md border border-border inline-block">
              {job.gateCode}
            </p>
          </Section>
        )}

        {isStaffOrAdmin && pc && (
          <Section icon={<Users className="h-4 w-4" />} label="Project Coordinator">
            <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <div className="font-semibold">{pc.name}</div>
              <div className="text-xs text-muted-foreground">
                {pc.title ?? "Project Coordinator"}
              </div>
              {pc.phone || pc.email ? (
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {pc.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {pc.phone}
                    </span>
                  )}
                  {pc.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> {pc.email}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </Section>
        )}

        {safetyTopic && (safetyTopic.title || safetyTopic.body) && (
          <Section icon={<ShieldAlert className="h-4 w-4 text-warning" />} label="Safety Briefing">
            <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
              <div className="font-bold text-warning">
                {safetyTopic.title || "Untitled Safety Topic"}
              </div>
              {safetyTopic.body && (
                <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {safetyTopic.body}
                </p>
              )}
            </div>
          </Section>
        )}

        <Section icon={<Briefcase className="h-4 w-4" />} label="Project code">
          <p className="text-sm leading-relaxed">{job.projectCode}</p>
        </Section>

        <Section icon={<Users className="h-4 w-4" />} label="Working with">
          <div className="space-y-1.5">
            {crewContacts.map((person) => {
              return (
                <div
                  key={person.id}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <div className="font-semibold">{person.name}</div>
                  <div className="text-xs text-muted-foreground">{person.title ?? "Crewman"}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {person.phone}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> {person.email}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section icon={<MapPin className="h-4 w-4" />} label="Address">
          {job.address ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/20"
            >
              {job.address}
              <span className="ml-1 text-xs uppercase tracking-wider text-primary">· Open map</span>
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">No address provided.</p>
          )}
        </Section>

        <Section icon={<Briefcase className="h-4 w-4" />} label="SOW">
          <p className="text-sm leading-relaxed">{job.sow || "—"}</p>
        </Section>

        {job.notes && (
          <Section icon={<StickyNote className="h-4 w-4 text-primary" />} label="Notes">
            <p className="rounded-md border-l-4 border-primary bg-primary/10 px-3 py-2 text-sm leading-relaxed">
              {job.notes}
            </p>
          </Section>
        )}

        {isStaffOrAdmin && job.pcNotes && (
          <Section
            icon={<StickyNote className="h-4 w-4 text-warning" />}
            label="Note Taker Notes (Private)"
          >
            <p className="rounded-md border-l-4 border-warning bg-warning/10 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
              {job.pcNotes}
            </p>
          </Section>
        )}
      </div>
    </article>
  );
}

function Stat({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`mt-0.5 text-sm font-bold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}
