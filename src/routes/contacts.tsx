import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { ROLE_LABELS, CREWMAN_ROLES, STAFF_ROLES, type MockUser } from "@/lib/mock-data";
import { useDirectory } from "@/lib/directory-store";
import { PersonDialog } from "@/components/PersonDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Search, Phone, Mail, Plus, Pencil, UserMinus, UserCheck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/contacts")({
  head: () => ({ meta: [{ title: "Directory — X3 Field Ops" }] }),
  component: ContactsPage,
});

type Filter = "crewman" | "staff";

function formatDirectoryName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const lastName = parts[parts.length - 1];
  const firstNames = parts.slice(0, -1).join(" ");
  return `${lastName}, ${firstNames}`;
}

function ContactsPage() {
  const { user, selectedMarket, isHydrated } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isHydrated) return;
    if (!user) navigate({ to: "/login" });
  }, [user, navigate, isHydrated]);

  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  // Foremen, staff, and admins see the full blended roster (SoCal + LV + corp)
  // because crews regularly cross markets. Everyone else stays scoped to their market.
  const seesBothMarkets = !!user && (STAFF_ROLES.includes(user.role) || user.role === "foreman");
  const { people, allPeople, isDeactivated, upsert, deactivate, reactivate, remove } =
    useDirectory();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("crewman");
  const [editing, setEditing] = useState<MockUser | "new" | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState<MockUser | null>(null);

  const list = useMemo(() => {
    if (!user) return [];
    const baseSource = isStaff && showInactive ? allPeople : people;
    // Auto-filter by selected market unless this user sees both markets blended.
    // Cross-market staff (marketLabel "All"/"Corp") always appear in both views.
    const source =
      seesBothMarkets || !selectedMarket
        ? baseSource
        : baseSource.filter((u) => {
            if (u.market === selectedMarket) return true;
            const lbl = (u.marketLabel ?? "").toLowerCase();
            return lbl === "all" || lbl === "corp";
          });

    const seen = new Set<string>();
    const normalized = source.filter((u) => {
      const dedupeKey = `${u.name.toLowerCase()}|${u.email.toLowerCase()}|${u.phone}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    });

    return normalized
      .filter((u) => {
        const directoryName = formatDirectoryName(u.name).toLowerCase();
        const query = q.toLowerCase();
        const matchQ = !q || u.name.toLowerCase().includes(query) || directoryName.includes(query);
        const matchF =
          (filter === "staff" && STAFF_ROLES.includes(u.role)) ||
          (filter === "crewman" && CREWMAN_ROLES.includes(u.role));
        return matchQ && matchF;
      })
      .sort((a, b) => {
        const aParts = a.name.trim().split(/\s+/);
        const bParts = b.name.trim().split(/\s+/);
        const aKey = `${aParts[aParts.length - 1]} ${aParts.slice(0, -1).join(" ")}`.toLowerCase();
        const bKey = `${bParts[bParts.length - 1]} ${bParts.slice(0, -1).join(" ")}`.toLowerCase();
        return aKey.localeCompare(bKey);
      });
  }, [q, filter, user, isStaff, showInactive, people, allPeople, selectedMarket, seesBothMarkets]);

  if (!isHydrated || !user) return null;

  return (
    <AppShell subtitle="Directory">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-2xl font-black tracking-tight">
          Directory
          {seesBothMarkets
            ? ""
            : selectedMarket
              ? ` — ${selectedMarket === "socal" ? "X3 Management" : "Las Vegas"}`
              : ""}
        </h2>
        {isStaff && (
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[11px] font-black uppercase tracking-wider text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add person
          </button>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          className="h-12 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm outline-none ring-primary focus:ring-2"
        />
      </div>

      <div className="mb-4 flex gap-1.5">
        {(["crewman", "staff"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "crewman" ? "Crewman" : "Staff"}
          </button>
        ))}
      </div>

      {isStaff && (
        <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show deactivated
        </label>
      )}

      {/* Desktop Table Layout (visible on md and up) */}
      <div className="overflow-hidden rounded-xl border border-border bg-card hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left font-bold w-12"></th>
                <th className="px-3 py-2.5 text-left font-bold">Name</th>
                <th className="px-3 py-2.5 text-left font-bold">Title / Role</th>
                <th className="px-3 py-2.5 text-left font-bold">Market</th>
                {!isStaff && <th className="px-3 py-2.5 text-left font-bold">Phone</th>}
                {!isStaff && <th className="px-3 py-2.5 text-left font-bold">Email</th>}
                <th className="px-3 py-2.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => {
                const inactive = isStaff && isDeactivated(u.id);
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-border/60 last:border-0 transition hover:bg-surface/60 ${
                      inactive ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                        {u.initials}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-bold">{formatDirectoryName(u.name)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {u.title ?? ROLE_LABELS[u.role]}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {u.marketLabel ?? (u.market === "socal" ? "X3 Management" : "Las Vegas")}
                    </td>
                    {!isStaff && (
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {u.phone || "—"}
                      </td>
                    )}
                    {!isStaff && (
                      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                        {u.email || "—"}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        {isStaff ? (
                          <>
                            <button
                              onClick={() => setEditing(u)}
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-primary"
                              aria-label={`Edit ${u.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {inactive ? (
                              <button
                                onClick={() => reactivate(u.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-md border border-success/40 text-success"
                                aria-label="Reactivate"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => deactivate(u.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-md border border-destructive/40 text-destructive"
                                aria-label="Deactivate"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeletingPerson(u)}
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <a
                              href={`tel:${u.phone}`}
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-primary"
                              aria-label={`Call ${u.name}`}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={`mailto:${u.email}`}
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-primary"
                              aria-label={`Email ${u.name}`}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td
                    colSpan={isStaff ? 5 : 7}
                    className="p-8 text-center text-sm text-muted-foreground"
                  >
                    No matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout (visible only on small screens) */}
      <div className="block md:hidden space-y-3">
        {list.map((u) => {
          const inactive = isStaff && isDeactivated(u.id);
          return (
            <div
              key={u.id}
              className={`rounded-xl border border-border bg-card p-4 shadow-industrial flex flex-col justify-between gap-4 transition hover:border-primary/40 ${
                inactive ? "opacity-60" : ""
              }`}
            >
              {/* Top Row: Avatar, Name, Role */}
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground shadow-glow">
                  {u.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white leading-tight">
                    {formatDirectoryName(u.name)}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">
                      {u.title ?? ROLE_LABELS[u.role]}
                    </span>
                    <span className="text-zinc-700">•</span>
                    <span>
                      {u.marketLabel ?? (u.market === "socal" ? "X3 Management" : "Las Vegas")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Row: Contact Info (phone & email always useful on mobile) */}
              <div className="space-y-2 text-xs border-t border-border/40 pt-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <a
                    href={`tel:${u.phone}`}
                    className="font-mono hover:text-primary hover:underline transition-colors text-white"
                  >
                    {u.phone || "—"}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <a
                    href={`mailto:${u.email}`}
                    className="hover:text-primary hover:underline transition-colors text-white truncate max-w-[280px]"
                  >
                    {u.email || "—"}
                  </a>
                </div>
              </div>

              {/* Bottom Row: Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                {isStaff ? (
                  <>
                    <button
                      onClick={() => setEditing(u)}
                      className="flex h-9 px-3 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-muted-foreground hover:text-primary hover:border-primary/60 transition text-xs font-bold uppercase tracking-wider"
                      aria-label={`Edit ${u.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    {inactive ? (
                      <button
                        onClick={() => reactivate(u.id)}
                        className="flex h-9 px-3 items-center justify-center gap-1.5 rounded-lg border border-success/30 bg-success/5 text-success hover:bg-success/15 transition text-xs font-bold uppercase tracking-wider"
                        aria-label="Reactivate"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => deactivate(u.id)}
                        className="flex h-9 px-3 items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/15 transition text-xs font-bold uppercase tracking-wider"
                        aria-label="Deactivate"
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingPerson(u)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-zinc-500 hover:text-red-500 hover:border-red-500/40 transition"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href={`tel:${u.phone}`}
                      className="flex-1 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition text-xs font-bold uppercase tracking-wider"
                      aria-label={`Call ${u.name}`}
                    >
                      <Phone className="h-3.5 w-3.5 text-primary" /> Call
                    </a>
                    <a
                      href={`mailto:${u.email}`}
                      className="flex-1 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-white hover:bg-accent transition text-xs font-bold uppercase tracking-wider"
                      aria-label={`Email ${u.name}`}
                    >
                      <Mail className="h-3.5 w-3.5 text-zinc-400" /> Email
                    </a>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-industrial animate-fade-in">
            No matches found.
          </div>
        )}
      </div>

      {isStaff && editing && (
        <PersonDialog
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            upsert(data, editing === "new" ? undefined : editing.id);
            setEditing(null);
          }}
        />
      )}

      {isStaff && deletingPerson && (
        <ConfirmDeleteDialog
          personName={deletingPerson.name}
          onConfirm={() => {
            remove(deletingPerson.id);
            setDeletingPerson(null);
          }}
          onCancel={() => setDeletingPerson(null)}
        />
      )}
    </AppShell>
  );
}
