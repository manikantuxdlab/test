import { createFileRoute, Link } from "@tanstack/react-router";
import { useStaffGuard } from "@/lib/guards";
import { AppShell } from "@/components/AppShell";
import {
  headcountByRole,
  headcountGrandTotal,
  getMaxPreviousDatesForMarket,
  type Market,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session";
import { useSchedule, isBlankOwner } from "@/lib/schedule-store";
import { useBriefing } from "@/lib/briefing-store";
import { Slider } from "@/components/ui/slider";
import {
  HardHat,
  Wrench,
  Package,
  Users,
  Megaphone,
  ShieldAlert,
  BookOpen,
  FileText,
  CalendarDays,
  Briefcase,
  ClipboardCheck,
  ChevronRight,
  UserCog,
  BookMarked,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — X3 Communications" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  useStaffGuard();
  const { user, historySettings, setHistorySetting } = useSession();
  const { getEffectiveDocSet, getSectionAttachments } = useBriefing();
  const socal = headcountByRole("socal");
  const { jobs } = useSchedule();
  const today = new Date().toISOString().slice(0, 10);
  const activeJobs = jobs.filter((j) => j.date === today).length;
  const market = user?.market ?? "socal";
  const docSet = getEffectiveDocSet(market, today);
  const toolboxCount = docSet?.documents.length ?? 0;
  const operationTiles = [
    {
      label: "Announcements",
      icon: Megaphone,
      summary: docSet?.announcement.title || "No announcement saved",
      to: "/acknowledgements" as const,
    },
    {
      label: "Safety Topic",
      icon: ShieldAlert,
      summary: docSet?.safety.title || "No safety topic saved",
      to: "/acknowledgements" as const,
    },
    {
      label: "Lessons Learned",
      icon: BookOpen,
      summary: docSet?.lesson.title || "No lesson saved",
      to: "/acknowledgements" as const,
    },
    {
      label: "Toolbox",
      icon: FileText,
      summary: `${toolboxCount} file(s) posted`,
      to: "/documents" as const,
    },
  ];

  return (
    <AppShell subtitle="Dashboard">
      <h2 className="mb-1 text-2xl font-black tracking-tight">Dashboard</h2>
      <p className="mb-5 text-sm text-muted-foreground">All modules · combined roster</p>

      {/* Admin */}
      <Section title="Admin">
        <div className="grid grid-cols-2 gap-2">
          <Tile to="/acknowledgements" label="Compliance" icon={ClipboardCheck} />
          <Tile to="/active-jobs" label="Active Jobs" icon={Briefcase} badge={String(activeJobs)} />
          <Tile to="/contacts" label="Directory" icon={Users} />
          <Tile to="/admin-directory" label="Manage Directory" icon={UserCog} />
          <Tile to="/daily-briefing" label="Daily Briefing" icon={BookMarked} />
          <Tile to="/schedule-builder" label="Schedule Builder" icon={CalendarDays} />
          <Tile to="/reports" label="Reports & Export" icon={ClipboardCheck} />
        </div>
      </Section>

      {user?.role === "admin" && (
        <Section title="Schedule History Settings">
          <div className="space-y-3">
            {(["socal"] as const).map((market) => (
              <HistorySettingCard
                key={market}
                market={market}
                value={historySettings[market]}
                onChange={(value) => setHistorySetting(market, value)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Operations — always surface tiles so staff can find Toolbox & briefing edits */}
      <Section title="Operations">
        <div className="grid grid-cols-2 gap-2">
          {operationTiles.map((tile) => (
            <Tile
              key={tile.label}
              to={tile.to}
              label={tile.label}
              icon={tile.icon}
              summary={tile.summary}
            />
          ))}
        </div>
      </Section>

      {/* Headcount summary */}
      <Section title="Headcount">
        <MarketBlock title="X3 Management" data={socal} />
      </Section>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  );
}

function Tile({
  to,
  icon: Icon,
  label,
  badge,
  summary,
}: {
  to:
    | "/acknowledgements"
    | "/active-jobs"
    | "/contacts"
    | "/schedule-builder"
    | "/documents"
    | "/reports"
    | "/admin-directory"
    | "/daily-briefing";
  icon: typeof Users;
  label: string;
  badge?: string;
  summary?: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 active:scale-[0.97]"
    >
      <div className="flex w-full items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        {badge && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-bold uppercase leading-tight tracking-wider">{label}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
      </div>
      {summary && <p className="line-clamp-2 text-xs text-muted-foreground">{summary}</p>}
    </Link>
  );
}

function MarketBlock({ title, data }: { title: string; data: ReturnType<typeof headcountByRole> }) {
  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="text-sm font-black uppercase tracking-tight">{title}</div>
      </header>
      <div className="grid grid-cols-3 gap-px bg-border">
        <Stat icon={<HardHat className="h-4 w-4" />} label="Foreman" value={data.foreman} />
        <Stat
          icon={<Wrench className="h-4 w-4" />}
          label="Crewman"
          value={data.topHand + data.apprentice}
        />
        <Stat icon={<Package className="h-4 w-4" />} label="Warehouse" value={data.warehouse} />
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-card px-3 py-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-0.5 text-2xl font-black">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-2.5 py-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function HistorySettingCard({
  market,
  value,
  onChange,
}: {
  market: Market;
  value: number;
  onChange: (value: number) => void;
}) {
  const max = getMaxPreviousDatesForMarket(market);
  const label = market === "socal" ? "X3 Management" : "Las Vegas";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-tight">{label}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Previous acknowledgement days shown for testing
          </div>
        </div>
        <div className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
          {value}
        </div>
      </div>

      <div className="mt-4 px-1">
        <Slider
          min={0}
          max={max}
          step={1}
          value={[value]}
          onValueChange={(values) => onChange(values[0] ?? 0)}
          aria-label={`${label} previous history dates`}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>Today only</span>
        <span>{max} previous max</span>
      </div>
    </div>
  );
}
