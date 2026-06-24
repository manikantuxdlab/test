import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { useBriefing } from "@/lib/briefing-store";
import { AppShell } from "@/components/AppShell";
import { TODAY, CREWMAN_ROLES, STAFF_ROLES } from "@/lib/mock-data";
import {
  FileText,
  Check,
  Upload,
  Trash2,
  Megaphone,
  ShieldAlert,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Toolbox Docs — X3 Communications" }] }),
  component: DocsPage,
});

function DocsPage() {
  const navigate = useNavigate();
  const { user, selectedMarket, isAcked, acknowledge, getDocsForDate } = useSession();
  const { uploadDocument, removeDocument, uploadedDocs, getSectionAttachments } = useBriefing();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);
  if (!user) return null;

  const market = selectedMarket ?? user.market;

  const docs = getDocsForDate(market, TODAY);
  const toolboxAckId = docs.length > 0 ? `toolbox-${market}-${TODAY}` : null;
  const isCrewman = CREWMAN_ROLES.includes(user.role);
  const isStaff = STAFF_ROLES.includes(user.role);

  const announcementAtts = getSectionAttachments(market, TODAY, "announcement");
  const safetyAtts = getSectionAttachments(market, TODAY, "safety");
  const lessonAtts = getSectionAttachments(market, TODAY, "lesson");

  return (
    <AppShell subtitle="Toolbox">
      <h2 className="mb-1 text-2xl font-black tracking-tight">Toolbox</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </p>

      {isStaff && (
        <Link
          to="/daily-briefing"
          className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/15"
        >
          <span className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Edit Announcement, Safety Topic, Lessons Learned in
            Daily Briefing
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {(announcementAtts.length > 0 || safetyAtts.length > 0 || lessonAtts.length > 0) && (
        <div className="mb-4 space-y-2">
          {announcementAtts.length > 0 && (
            <SectionAttachmentsBlock
              icon={<Megaphone className="h-4 w-4" />}
              title="Announcement attachments"
              atts={announcementAtts}
              isStaff={isStaff}
              removeDocument={removeDocument}
            />
          )}
          {safetyAtts.length > 0 && (
            <SectionAttachmentsBlock
              icon={<ShieldAlert className="h-4 w-4" />}
              title="Safety attachments"
              atts={safetyAtts}
              isStaff={isStaff}
              removeDocument={removeDocument}
            />
          )}
          {lessonAtts.length > 0 && (
            <SectionAttachmentsBlock
              icon={<BookOpen className="h-4 w-4" />}
              title="Lessons attachments"
              atts={lessonAtts}
              isStaff={isStaff}
              removeDocument={removeDocument}
            />
          )}
        </div>
      )}

      {isStaff && (
        <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-4 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <Upload className="h-4 w-4" />
          {busy ? "Uploading…" : "Upload toolbox document"}
          <input
            type="file"
            className="hidden"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                await uploadDocument(market, TODAY, file);
              } catch (err) {
                console.error(err);
                if (err instanceof Error && err.message.toLowerCase().includes("unauthorized")) {
                  alert("Upload was blocked by toolbox storage permissions.");
                }
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
        </label>
      )}

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
          No documents posted today.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left font-bold">Document</th>
                  <th className="px-3 py-2.5 text-left font-bold">Type</th>
                  <th className="px-3 py-2.5 text-left font-bold">Size</th>
                  <th className="px-3 py-2.5 text-left font-bold">File</th>
                  <th className="px-3 py-2.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const done = toolboxAckId ? isAcked(toolboxAckId) : isAcked(d.id);
                  const uploaded = uploadedDocs.find((x) => x.id === d.id);
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-border/60 hover:bg-surface/60 transition"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate font-bold">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
                        {d.type}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.sizeKb}KB</td>
                      <td className="px-3 py-2.5">
                        {d.url ? (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold uppercase tracking-wider text-primary underline"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          {isCrewman && (
                            <button
                              disabled={done}
                              onClick={() => acknowledge(toolboxAckId ?? d.id, user.id)}
                              className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold uppercase tracking-wider text-primary-foreground transition active:scale-[0.98] disabled:bg-success disabled:text-success-foreground"
                            >
                              {done ? (
                                <>
                                  <Check className="h-3.5 w-3.5" /> Acked
                                </>
                              ) : (
                                "Acknowledge"
                              )}
                            </button>
                          )}
                          {isStaff && uploaded && (
                            <button
                              type="button"
                              onClick={() => removeDocument(uploaded)}
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-destructive/40 text-destructive"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SectionAttachmentsBlock({
  icon,
  title,
  atts,
  isStaff,
  removeDocument,
}: {
  icon: React.ReactNode;
  title: string;
  atts: Array<{
    id: string;
    name: string;
    type: "pdf" | "doc";
    url: string;
    storagePath: string;
    market: any;
    date: string;
    sizeKb: number;
    uploadedAt: string;
  }>;
  isStaff: boolean;
  removeDocument: (rec: any) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <ul className="space-y-1.5">
        {atts.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
          >
            <FileText className="h-4 w-4 text-primary" />
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate font-bold underline"
            >
              {d.name}
            </a>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {d.type}
            </span>
            {isStaff && (
              <button
                onClick={() => removeDocument(d)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-destructive/40 text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
