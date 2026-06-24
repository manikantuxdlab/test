import { useState, useEffect, createContext, useContext } from "react";
import { Link, useRouter, useLocation } from "@tanstack/react-router";
import {
  Calendar,
  Users,
  FileText,
  LayoutDashboard,
  ClipboardCheck,
  LogOut,
  CalendarDays,
  HelpCircle,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Menu,
  MoreHorizontal,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { CREWMAN_ROLES } from "@/lib/mock-data";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

import logoImg from "@/assets/logo.jpg";

/** X3C logo — uses the exact uploaded image. */
export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-20 w-20" }[size];
  return <img src={logoImg} alt="X3C" className={`${sizeClass} rounded-md object-contain`} />;
}

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

function navItemsFor(role: string | undefined): NavItem[] {
  if (!role) return [];
  const isCrewman = CREWMAN_ROLES.includes(role as (typeof CREWMAN_ROLES)[number]);

  if (isCrewman) {
    return [
      { to: "/", label: "Home", icon: Calendar },
      { to: "/schedule", label: "My Schedule", icon: CalendarDays },
      { to: "/documents", label: "Toolbox", icon: FileText },
      { to: "/contacts", label: "Directory", icon: Users },
      { to: "/help", label: "Help", icon: HelpCircle },
    ];
  }
  return [
    { to: "/", label: "Home", icon: LayoutDashboard },
    { to: "/schedule", label: "My Schedule", icon: Calendar },
    { to: "/acknowledgements", label: "Operations", icon: ClipboardCheck },
    { to: "/schedule-builder", label: "Full Schedule", icon: CalendarDays },
    { to: "/contacts", label: "Directory", icon: Users },
    { to: "/admin-directory", label: "Manage Staff", icon: Settings },
    { to: "/reports", label: "Reports", icon: FileText },
    { to: "/documents", label: "Documents", icon: FileText },
    { to: "/help", label: "Help", icon: HelpCircle },
  ];
}

const NavCollapseContext = createContext<{ collapsed: boolean; toggle: () => void }>({
  collapsed: false,
  toggle: () => {},
});

function useIsActive() {
  const location = useLocation();
  return (to: string) =>
    to === "/"
      ? location.pathname === "/"
      : location.pathname === to || location.pathname.startsWith(to + "/");
}

export function SideNav() {
  const { user, logout } = useSession();
  const router = useRouter();
  const isActive = useIsActive();
  const { collapsed, toggle } = useContext(NavCollapseContext);
  if (!user) return null;

  const items = navItemsFor(user.role);

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-all duration-200 md:flex ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Brand */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <Wordmark size="md" />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-black tracking-tight">X3 Communications</div>
              <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                Field Operations
              </div>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggle}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Collapse navigation"
            title="Collapse"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="border-b border-border px-2 py-2">
          <button
            onClick={toggle}
            className="flex h-8 w-full items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Expand navigation"
            title="Expand"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {items.map((it) => {
            const active = isActive(it.to);
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  title={collapsed ? it.label : undefined}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${
                    collapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <it.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div
          className={`flex items-center gap-2.5 rounded-md bg-card p-2 ${collapsed ? "flex-col" : ""}`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {user.initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-bold">{user.name}</div>
              <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                {user.role}
              </div>
            </div>
          )}
          <button
            onClick={() => {
              logout();
              router.navigate({ to: "/login" });
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Mobile drawer with full nav (hamburger trigger). */
function MobileDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user, logout } = useSession();
  const router = useRouter();
  const isActive = useIsActive();
  if (!user) return null;
  const items = navItemsFor(user.role);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="dark bg-[#0a0a0a] border-t border-zinc-900 text-white rounded-t-[28px] h-fit max-h-[85vh] p-0 flex flex-col outline-none focus:outline-none"
      >
        {/* Sleek bottom-sheet drag handle indicator */}
        <div className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-zinc-800/80" />

        <SheetHeader className="border-b border-zinc-900 p-3.5 pt-1 pb-3">
          <SheetTitle className="flex items-center gap-2.5 text-white">
            <Wordmark size="md" />
            <div className="min-w-0 leading-tight text-left">
              <div className="truncate text-sm font-black tracking-tight text-white">
                X3 Communications
              </div>
              <div className="truncate text-[10px] uppercase tracking-wider text-zinc-500">
                Field Operations
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav className="overflow-y-auto px-3 py-2">
          <ul className="space-y-0.5">
            {items.map((it) => {
              const active = isActive(it.to);
              return (
                <li key={it.to}>
                  <Link
                    to={it.to}
                    onClick={() => onOpenChange(false)}
                    className={`flex items-center gap-3.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(198,26,41,0.25)]"
                        : "text-zinc-400 hover:bg-zinc-900/50 hover:text-white"
                    }`}
                  >
                    <it.icon
                      className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-zinc-400"}`}
                    />
                    <span className="truncate">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-zinc-900 p-3 bg-[#0c0c0c]">
          <div className="flex items-center gap-3 rounded-xl bg-[#121212] border border-zinc-900 p-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white shadow-glow">
              {user.initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-bold text-white">{user.name}</div>
              <div className="truncate text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                {user.role}
              </div>
            </div>
            <button
              onClick={() => {
                onOpenChange(false);
                logout();
                router.navigate({ to: "/login" });
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Bottom tab bar for mobile (5 slots; overflow opens drawer). */
function MobileTabBar({ onMore }: { onMore: () => void }) {
  const { user } = useSession();
  const isActive = useIsActive();
  if (!user) return null;
  const items = navItemsFor(user.role);
  const tabs = items.slice(0, 4);
  const hasOverflow = items.length > 4;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:hidden">
      {tabs.map((it) => {
        const active = isActive(it.to);
        return (
          <Link
            key={it.to}
            to={it.to}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wider transition ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <it.icon className="h-5 w-5" />
            <span className="truncate">{it.label}</span>
          </Link>
        );
      })}
      {hasOverflow && (
        <button
          onClick={onMore}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      )}
    </nav>
  );
}

export function TopBar({
  title,
  subtitle,
  onMenuClick,
}: {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
}) {
  const { user } = useSession();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:gap-4 md:px-8 md:py-4">
      <div className="flex min-w-0 items-center gap-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <div className="truncate text-base font-black tracking-tight md:text-lg">
            {title ?? "X3 Communications"}
          </div>
          {subtitle && (
            <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground md:text-[11px]">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/help"
          className="hidden h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground sm:flex"
          aria-label="Help & Documentation"
          title="Help"
        >
          <HelpCircle className="h-4 w-4" />
        </Link>
        {user && (
          <Link
            to="/profile"
            className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2 transition hover:bg-accent md:px-2.5"
            aria-label="Profile"
            title="Profile"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {user.initials}
            </div>
            <span className="hidden text-xs font-semibold sm:inline">{user.name}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export function AppHeader(props: { title?: string; subtitle?: string; showBack?: boolean }) {
  return <TopBar title={props.title} subtitle={props.subtitle} />;
}

export function AppShell({
  children,
  title,
  subtitle,
  showNav = true,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showNav?: boolean;
  showBack?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem("x3.nav.collapsed");
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("x3.nav.collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  };
  return (
    <NavCollapseContext.Provider value={{ collapsed, toggle }}>
      <div className="dark min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen">
          {showNav && <SideNav />}
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar
              title={title}
              subtitle={subtitle}
              onMenuClick={showNav ? () => setDrawerOpen(true) : undefined}
            />
            <main className="flex-1 px-4 py-4 pb-24 md:px-8 md:py-6 md:pb-6">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
        {showNav && (
          <>
            <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
            <MobileTabBar onMore={() => setDrawerOpen(true)} />
          </>
        )}
      </div>
    </NavCollapseContext.Provider>
  );
}
