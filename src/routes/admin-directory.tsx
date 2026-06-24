import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStaffGuard } from "@/lib/guards";
import { AppShell } from "@/components/AppShell";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useDirectory, type NewPersonInput } from "@/lib/directory-store";
import { ROLE_LABELS, type Role, type Market, type MockUser } from "@/lib/mock-data";
import { Plus, Pencil, Search, X, Check, UserMinus, UserCheck, Trash2, Key } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-directory")({
  head: () => ({ meta: [{ title: "Manage Directory — X3 Communications" }] }),
  component: AdminDirectoryPage,
});

const ROLES: Role[] = ["admin", "staff", "foreman", "top-hand", "apprentice", "warehouse"];
const MARKETS: Market[] = ["socal"];
const MARKET_LABELS = ["", "All", "Corp", "X3 Management"];

function fmtName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
}

function AdminDirectoryPage() {
  useStaffGuard();
  const { allPeople, isDeactivated, upsert, deactivate, reactivate, remove } = useDirectory();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MockUser | "new" | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState<MockUser | null>(null);

  const list = useMemo(() => {
    return allPeople
      .filter((p) => showInactive || !isDeactivated(p.id))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          (p.title ?? "").toLowerCase().includes(q.toLowerCase()),
      )
      .sort((a, b) => fmtName(a.name).localeCompare(fmtName(b.name)));
  }, [allPeople, q, showInactive, isDeactivated]);

  return (
    <AppShell subtitle="Manage Directory">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-2xl font-black tracking-tight">Manage Directory</h2>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[11px] font-black uppercase tracking-wider text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add person
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or title…"
          className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm outline-none ring-primary focus:ring-2"
        />
      </div>

      <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        Show deactivated
      </label>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left font-bold w-12"></th>
                <th className="px-3 py-2.5 text-left font-bold">Name</th>
                <th className="px-3 py-2.5 text-left font-bold">Title / Role</th>
                <th className="px-3 py-2.5 text-left font-bold">Type</th>
                <th className="px-3 py-2.5 text-left font-bold">Market</th>
                <th className="px-3 py-2.5 text-left font-bold">Status</th>
                <th className="px-3 py-2.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const inactive = isDeactivated(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border/60 transition hover:bg-surface/60 ${
                      inactive ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                        {p.initials}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-bold">{fmtName(p.name)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.title ?? ROLE_LABELS[p.role]}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {(p as any).staffOrField ?? "Field"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.marketLabel ?? (p.market === "socal" ? "X3 Management" : "Las Vegas")}
                    </td>
                    <td className="px-3 py-2">
                      {inactive ? (
                        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          Inactive
                        </span>
                      ) : (
                        <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={async () => {
                            if (!p.email) {
                              toast.error("User does not have an email address.");
                              return;
                            }
                            try {
                              const { sendPasswordResetEmail } = await import("firebase/auth");
                              const { auth } = await import("@/lib/firebase");
                              await sendPasswordResetEmail(auth, p.email);
                              toast.success(`Password reset email sent to ${p.email}`);
                            } catch (err) {
                              toast.error(
                                `Failed to send password reset: ${(err as Error).message}`,
                              );
                            }
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition"
                          title="Send password reset link"
                          aria-label="Send password reset link"
                        >
                          <Key className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditing(p)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-primary"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {inactive ? (
                          <button
                            onClick={async () => {
                              try {
                                await reactivate(p.id);
                                toast.success(`${p.name} reactivated.`);
                              } catch (err) {
                                toast.error(`Failed to reactivate: ${(err as Error).message}`);
                              }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-success/40 text-success"
                            aria-label="Reactivate"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                await deactivate(p.id);
                                toast.success(`${p.name} deactivated.`);
                              } catch (err) {
                                toast.error(`Failed to deactivate: ${(err as Error).message}`);
                              }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-destructive/40 text-destructive"
                            aria-label="Deactivate"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingPerson(p)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    No people match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <PersonDialog
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            try {
              await upsert(data, editing === "new" ? undefined : editing.id);
              toast.success(`${data.name} saved successfully.`);
            } catch (err) {
              toast.error(`Failed to save: ${(err as Error).message}`);
            }
            setEditing(null);
          }}
        />
      )}

      {deletingPerson && (
        <ConfirmDeleteDialog
          personName={deletingPerson.name}
          onConfirm={async () => {
            try {
              await remove(deletingPerson.id);
              toast.success(`${deletingPerson.name} deleted successfully.`);
            } catch (err) {
              toast.error(`Failed to delete: ${(err as Error).message}`);
            }
            setDeletingPerson(null);
          }}
          onCancel={() => setDeletingPerson(null)}
        />
      )}
    </AppShell>
  );
}

function PersonDialog({
  existing,
  onClose,
  onSave,
}: {
  existing: MockUser | null;
  onClose: () => void;
  onSave: (data: NewPersonInput) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [role, setRole] = useState<Role>(existing?.role ?? "apprentice");
  const [market, setMarket] = useState<Market>(existing?.market ?? "socal");
  const [marketLabel, setMarketLabel] = useState(existing?.marketLabel ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");

  const valid = name.trim().length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-card sm:rounded-2xl"
      >
        <div className="flex items-start justify-between border-b border-border p-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {existing ? "Edit person" : "Add person"}
            </div>
            <div className="text-base font-black">
              {existing ? fmtName(existing.name) : "New person"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <Field label="Full name (First Last)">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-10 w-full rounded-md border border-input bg-surface px-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Market">
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as Market)}
                className="h-10 w-full rounded-md border border-input bg-surface px-2 text-sm"
              >
                {MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {m === "socal" ? "X3 Management" : "Las Vegas"}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Display label override (optional)">
            <select
              value={marketLabel}
              onChange={(e) => setMarketLabel(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-surface px-2 text-sm"
            >
              {MARKET_LABELS.map((l) => (
                <option key={l} value={l}>
                  {l || "(use market)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Foreman, Construction Manager"
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
            />
          </Field>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Phone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="555-555-5555"
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
              />
            </Field>
            <Field label="Email">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="first.last@x3corp.net"
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <button
            disabled={!valid}
            onClick={() =>
              onSave({
                name: name.trim(),
                role,
                market,
                marketLabel: marketLabel || undefined,
                title: title.trim() || undefined,
                phone: phone.trim(),
                email: email.trim(),
              })
            }
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
          >
            <Check className="h-4 w-4" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}
