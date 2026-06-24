import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { useDirectory } from "@/lib/directory-store";
import { CREWMAN_ROLES, STAFF_ROLES, users, TODAY } from "@/lib/mock-data";
import { useSchedule, isBlankOwner } from "@/lib/schedule-store";
import { AppShell, Wordmark } from "@/components/AppShell";
import {
  Shield,
  Users,
  MapPinned,
  ClipboardCheck,
  CalendarDays,
  FileText,
  ArrowRight,
  Activity,
  HardHat,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { user, selectedMarket, setSelectedMarket, isHydrated } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) navigate({ to: "/login" });
  }, [user, navigate, isHydrated]);

  const { jobs } = useSchedule();
  const { allPeople, people } = useDirectory();
  const market = selectedMarket ?? "socal";

  // Live counts scoped to the selected market.
  const activeJobsToday = useMemo(
    () =>
      jobs.filter((j) => {
        return (
          j.date === TODAY &&
          [...j.crewmanIds, ...j.managerIds].some(
            (id) => allPeople.find((u) => u.id === id)?.market === market,
          )
        );
      }),
    [jobs, market, allPeople],
  );

  const activeJobsCount = activeJobsToday.length;

  const scheduledCrewIds = useMemo(() => {
    return new Set(activeJobsToday.flatMap((j) => j.crewmanIds));
  }, [activeJobsToday]);

  const crewOnTodayCount = useMemo(
    () =>
      people.filter(
        (u) =>
          u.market === market &&
          CREWMAN_ROLES.includes(u.role) &&
          scheduledCrewIds.has(u.id) &&
          !u.hiddenFromDirectory,
      ).length,
    [market, people, scheduledCrewIds],
  );

  if (!user)
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <Wordmark size="lg" />
      </div>
    );

  const isStaff = STAFF_ROLES.includes(user.role);
  const isCrewman = CREWMAN_ROLES.includes(user.role);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function pickMarket(market: "socal" | "vegas") {
    setSelectedMarket(market);
  }
  // Pending acks: crewmen scheduled today in this market who haven't acked yet.
  // Without ack state in this scope, surface the same number as crew-on-today minus
  // a zero baseline; the linked /acknowledgements page shows the live breakdown.
  const pendingAcksCount = crewOnTodayCount;

  const staffKpis = [
    {
      label: "Active Jobs",
      value: String(activeJobsCount),
      icon: HardHat,
      accent: "text-primary",
      to: "/active-jobs" as const,
    },
    {
      label: "Crew On Today",
      value: String(crewOnTodayCount),
      icon: Users,
      accent: "text-foreground",
      to: "/contacts" as const,
    },
    {
      label: "Pending Acks",
      value: String(pendingAcksCount),
      icon: ClipboardCheck,
      accent: "text-warning",
      to: "/acknowledgements" as const,
    },
    {
      label: "Open Issues",
      value: "0",
      icon: AlertTriangle,
      accent: "text-muted-foreground",
      to: null,
    },
  ];

  const staffQuickLinks = [
    {
      to: "/acknowledgements",
      label: "Operations",
      desc: "Daily acknowledgements & briefings",
      icon: ClipboardCheck,
    },
    {
      to: "/schedule-builder",
      label: "Schedule Builder",
      desc: "Plan crews and assignments",
      icon: CalendarDays,
    },
    { to: "/dashboard", label: "Admin Dashboard", desc: "Org-wide KPIs & oversight", icon: Shield },
    { to: "/contacts", label: "Directory", desc: "Crew and staff contacts", icon: Users },
    { to: "/reports", label: "Reports", desc: "Compliance & audit history", icon: FileText },
    { to: "/documents", label: "Documents", desc: "Toolbox library & uploads", icon: FileText },
  ];

  const crewQuickLinks = [
    {
      to: "/acknowledge",
      label: "Daily Acknowledgements",
      desc: "Announcement, Safety, Lessons, Docs",
      icon: ClipboardCheck,
    },
    { to: "/schedule", label: "My Schedule", desc: "Today and upcoming days", icon: CalendarDays },
    { to: "/documents", label: "Toolbox", desc: "Reference documents", icon: FileText },
    { to: "/contacts", label: "Directory", desc: "Find a teammate", icon: Users },
  ];

  const quickLinks = isStaff ? staffQuickLinks : crewQuickLinks;

  return (
    <AppShell title="Home" subtitle={isCrewman ? "Field crew home" : "Operations home"}>
      {/* Hero / greeting bar */}
      <section className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 rounded-xl border border-border bg-card px-5 py-4 md:px-6 md:py-5 shadow-industrial">
        <div className="min-w-0">
          <div className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {today}
          </div>
          <h1 className="mt-1 text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-tight break-words">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <div className="mt-1 text-xs text-muted-foreground">
            {isStaff
              ? "Operations overview for your selected market."
              : "Your daily field operations hub."}
          </div>
        </div>
        <div className="flex shrink-0 items-center w-full md:w-auto">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 w-full md:w-auto justify-start">
            <MapPinned className="h-4 w-4 text-primary shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white">
              X3 Management
            </span>
          </div>
        </div>
      </section>

      {/* KPI row (staff) */}
      {isStaff && (
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {staffKpis.map((k) => {
            const cardInner = (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </div>
                  <k.icon className={`h-4 w-4 ${k.accent}`} />
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight">{k.value}</div>
              </>
            );
            const baseCls =
              "block rounded-xl border border-border bg-card px-5 py-4 shadow-industrial";
            return k.to ? (
              <Link
                key={k.label}
                to={k.to}
                className={`${baseCls} transition hover:border-primary/60 hover:bg-surface`}
              >
                {cardInner}
              </Link>
            ) : (
              <div key={k.label} className={baseCls}>
                {cardInner}
              </div>
            );
          })}
        </section>
      )}

      {/* Main grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick links span 2 cols on desktop */}
        <div className="col-span-1 lg:col-span-2 rounded-xl border border-border bg-card p-4 md:p-5 shadow-industrial">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Quick Access</h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {isStaff ? "Staff workspace" : "Field workspace"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickLinks.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="group flex items-start gap-3 rounded-lg border border-border bg-background px-3.5 py-3 transition hover:border-primary/60 hover:bg-surface"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <q.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-bold text-white group-hover:text-primary transition-colors">
                      {q.label}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary shrink-0" />
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{q.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity / status sidebar - stacks on mobile, takes 1 col on desktop */}
        <div className="col-span-1 rounded-xl border border-border bg-card p-4 md:p-5 shadow-industrial">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Today</h2>
            <Activity className="h-4 w-4 text-primary shrink-0" />
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-muted-foreground text-xs">Market</span>
              <span className="font-bold uppercase tracking-wider text-xs text-white">
                X3 Management
              </span>
            </li>
            <li className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-muted-foreground text-xs">Role</span>
              <span
                className="font-bold uppercase tracking-wider text-xs text-white max-w-[200px] truncate"
                title={user.role}
              >
                {user.role}
              </span>
            </li>
            <li className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-muted-foreground text-xs">Status</span>
              <span className="rounded bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                On Shift
              </span>
            </li>
            <li className="flex items-center justify-between pt-0.5">
              <span className="text-muted-foreground text-xs">Next action</span>
              <Link
                to={isStaff ? "/acknowledgements" : "/acknowledge"}
                className="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
              >
                Open →
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
