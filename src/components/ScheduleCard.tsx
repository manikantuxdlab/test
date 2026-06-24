import type { DailySchedule } from "@/lib/mock-data";
import { MapPin, Clock, Hash, Briefcase, AlertCircle, Calendar } from "lucide-react";

export function ScheduleCard({ s }: { s: DailySchedule }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-industrial">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Today's assignment
          </div>
          <div className="text-base font-black tracking-tight">{s.crewName}</div>
        </div>
        <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Project
          </div>
          <div className="font-mono text-xs font-bold">{s.projectCode}</div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px bg-border">
        <Stat icon={<Clock className="h-4 w-4" />} label="On-site" value={s.approvedOnsite} />
        <Stat
          icon={<Clock className="h-4 w-4" />}
          label="Window"
          value={`${s.startTime}–${s.endTime}`}
        />
        <Stat icon={<Hash className="h-4 w-4" />} label="ADP #" value={s.adpNumber} mono />
        <Stat
          icon={<Calendar className="h-4 w-4" />}
          label="Remaining"
          value={`${s.hoursRemaining}h · ${s.daysRemaining}d`}
        />
      </div>

      <div className="space-y-4 p-4">
        <Section icon={<MapPin className="h-4 w-4" />} label="Site address">
          <a
            href={s.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/20"
          >
            {s.siteAddress}
            <span className="ml-1 text-xs uppercase tracking-wider text-primary">· Open map</span>
          </a>
        </Section>

        <Section icon={<Briefcase className="h-4 w-4" />} label="Scope of work">
          <p className="text-sm leading-relaxed">{s.scopeOfWork}</p>
        </Section>

        <Section
          icon={<AlertCircle className="h-4 w-4 text-primary" />}
          label="Special instructions"
        >
          <p className="rounded-md border-l-4 border-primary bg-primary/10 px-3 py-2 text-sm leading-relaxed">
            {s.specialInstructions}
          </p>
        </Section>

        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Crew names &amp; phone numbers are on the Contacts page.
        </p>
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
