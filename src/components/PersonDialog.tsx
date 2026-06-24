import { useState } from "react";
import { ROLE_LABELS, type Role, type Market, type MockUser } from "@/lib/mock-data";
import type { NewPersonInput } from "@/lib/directory-store";
import { X, Check } from "lucide-react";

const ROLES: Role[] = ["admin", "staff", "foreman", "top-hand", "apprentice", "warehouse"];
const MARKETS: Market[] = ["socal"];
const MARKET_LABELS = ["", "All", "Corp", "X3 Management"];

function fmtName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
}

export function PersonDialog({
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
  const [staffOrField, setStaffOrField] = useState<"Staff" | "Field">(() => {
    if (existing?.staffOrField) return existing.staffOrField;
    const currentRole = existing?.role ?? "apprentice";
    return ["admin", "staff"].includes(currentRole) ? "Staff" : "Field";
  });

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setStaffOrField(["admin", "staff"].includes(newRole) ? "Staff" : "Field");
  };

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
                onChange={(e) => handleRoleChange(e.target.value as Role)}
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
          <Field label="Type (Staff / Field)">
            <select
              value={staffOrField}
              onChange={(e) => setStaffOrField(e.target.value as "Staff" | "Field")}
              className="h-10 w-full rounded-md border border-input bg-surface px-2 text-sm"
            >
              <option value="Field">Field Crew</option>
              <option value="Staff">Office Staff / Management</option>
            </select>
          </Field>
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
                staffOrField,
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
