import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useStaffGuard } from "@/lib/guards";
import { AppShell } from "@/components/AppShell";
import { useBriefing } from "@/lib/briefing-store";
import { TODAY, type Market } from "@/lib/mock-data";
import { addDays, fmtDayLong } from "@/lib/schedule-store";
import {
  Megaphone,
  ShieldAlert,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/daily-briefing")({
  head: () => ({ meta: [{ title: "Daily Briefing — X3 Communications" }] }),
  component: DailyBriefingPage,
});

function DailyBriefingPage() {
  useStaffGuard();
  const {
    getEffectiveDocSet,
    getOverride,
    saveBriefing,
    deleteBriefing,
    uploadDocument,
    removeDocument,
    uploadedDocs,
    getSectionAttachments,
  } = useBriefing();
  // Briefings go company-wide. We mirror writes to both markets but only edit one canonical view (socal).
  const market: Market = "socal";
  const [date, setDate] = useState(TODAY);

  const set = getEffectiveDocSet(market, date);
  const ov = getOverride(market, date);

  const initial = useMemo(
    () => ({
      aTitle: set?.announcement.title ?? "",
      aBody: set?.announcement.body ?? "",
      sTitle: set?.safety.title ?? "",
      sBody: set?.safety.body ?? "",
      lTitle: set?.lesson.title ?? "",
      lBody: set?.lesson.body ?? "",
    }),
    [
      market,
      date,
      set?.announcement.title,
      set?.announcement.body,
      set?.safety.title,
      set?.safety.body,
      set?.lesson.title,
      set?.lesson.body,
    ],
  );

  const [aTitle, setATitle] = useState(initial.aTitle);
  const [aBody, setABody] = useState(initial.aBody);
  const [sTitle, setSTitle] = useState(initial.sTitle);
  const [sBody, setSBody] = useState(initial.sBody);
  const [lTitle, setLTitle] = useState(initial.lTitle);
  const [lBody, setLBody] = useState(initial.lBody);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset fields when date changes
  useEffect(() => {
    setATitle(initial.aTitle);
    setABody(initial.aBody);
    setSTitle(initial.sTitle);
    setSBody(initial.sBody);
    setLTitle(initial.lTitle);
    setLBody(initial.lBody);
    setSavedAt(null);
    setError(null);
  }, [initial]);

  async function save() {
    const payload = {
      date,
      announcement: { title: aTitle, body: aBody },
      safety: { title: sTitle, body: sBody },
      lesson: { title: lTitle, body: lBody },
      documents: ov?.documents ?? [],
    };
    setSaving(true);
    setError(null);
    try {
      // Save briefing to X3 Management.
      await saveBriefing({ ...payload, market: "socal" });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      setError(
        message.includes("permission")
          ? "Daily Briefing could not save because Firestore permissions are still blocking writes. Publish signed-in write access, then try again."
          : "Daily Briefing could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(
    file: File,
    section: "announcement" | "safety" | "lesson" | "toolbox" = "toolbox",
  ) {
    setBusy(true);
    setError(null);
    try {
      // Upload document to X3 Management.
      await uploadDocument("socal", date, file, section);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      setError(
        message.includes("unauthorized")
          ? "This upload did not publish because toolbox storage permissions blocked the file upload."
          : message.includes("permission")
            ? "This upload did not publish because briefing write permissions are still blocking saves."
            : "This upload did not finish. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell subtitle="Daily Briefing">
      <h2 className="mb-1 text-2xl font-black tracking-tight">Daily Briefing</h2>
      <p className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
        Published company-wide
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
        <button
          onClick={() => setDate(addDays(date, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Calendar className="h-4 w-4 text-primary" />
          {fmtDayLong(date)}
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="ml-auto h-9 rounded-md border border-input bg-surface px-2 text-xs"
        />
      </div>

      <p className="mb-4 text-[11px] uppercase tracking-wider text-muted-foreground">
        {ov
          ? `Custom briefing saved ${new Date(ov.updatedAt).toLocaleString()}`
          : "Editing default content. Save to publish a custom briefing for this day."}
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Section
        icon={<Megaphone className="h-4 w-4" />}
        label="Announcement"
        onClear={() => {
          setATitle("");
          setABody("");
        }}
      >
        <input
          value={aTitle}
          onChange={(e) => setATitle(e.target.value)}
          placeholder="Title"
          className="mb-2 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
        />
        <textarea
          value={aBody}
          onChange={(e) => setABody(e.target.value)}
          rows={3}
          placeholder="Type a sentence or two — uploads optional"
          className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
        />
        <SectionAttachments
          section="announcement"
          market={market}
          date={date}
          busy={busy}
          onUpload={handleUpload}
          getSectionAttachments={getSectionAttachments}
          removeDocument={removeDocument}
        />
      </Section>

      <Section
        icon={<ShieldAlert className="h-4 w-4" />}
        label="Safety Topic"
        onClear={() => {
          setSTitle("");
          setSBody("");
        }}
      >
        <input
          value={sTitle}
          onChange={(e) => setSTitle(e.target.value)}
          placeholder="Title"
          className="mb-2 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
        />
        <textarea
          value={sBody}
          onChange={(e) => setSBody(e.target.value)}
          rows={3}
          placeholder="Type a sentence or two — uploads optional"
          className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
        />
        <SectionAttachments
          section="safety"
          market={market}
          date={date}
          busy={busy}
          onUpload={handleUpload}
          getSectionAttachments={getSectionAttachments}
          removeDocument={removeDocument}
        />
      </Section>

      <Section
        icon={<BookOpen className="h-4 w-4" />}
        label="Lessons Learned"
        onClear={() => {
          setLTitle("");
          setLBody("");
        }}
      >
        <input
          value={lTitle}
          onChange={(e) => setLTitle(e.target.value)}
          placeholder="Title"
          className="mb-2 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
        />
        <textarea
          value={lBody}
          onChange={(e) => setLBody(e.target.value)}
          rows={3}
          placeholder="Type a sentence or two — uploads optional"
          className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
        />
        <SectionAttachments
          section="lesson"
          market={market}
          date={date}
          busy={busy}
          onUpload={handleUpload}
          getSectionAttachments={getSectionAttachments}
          removeDocument={removeDocument}
        />
      </Section>

      <Section icon={<FileText className="h-4 w-4" />} label="Toolbox documents">
        <label className="mb-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <Plus className="h-4 w-4" />
          {busy ? "Uploading…" : "Upload PDF or DOC"}
          <input
            type="file"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        {(set?.documents ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No documents posted.</p>
        ) : (
          <ul className="space-y-1.5">
            {(set?.documents ?? []).map((d) => {
              const uploaded = uploadedDocs.find((x) => x.id === d.id);
              return (
                <li
                  key={d.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  {uploaded ? (
                    <a
                      href={uploaded.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate font-bold underline"
                    >
                      {d.name}
                    </a>
                  ) : (
                    <span className="flex-1 truncate font-bold">{d.name}</span>
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {d.type}
                  </span>
                  {uploaded && (
                    <button
                      onClick={() => removeDocument(uploaded)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-destructive/40 text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Default mock documents can't be removed — only uploaded files.
        </p>
      </Section>

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black uppercase tracking-wider text-primary-foreground shadow-glow active:scale-[0.98]"
        >
          <Check className="h-5 w-5" /> {saving ? "Saving…" : "Save briefing"}
        </button>
        {ov && (
          <button
            type="button"
            onClick={async () => {
              if (
                confirm(
                  "Are you sure you want to delete this custom briefing override? This will revert to default mock content.",
                )
              ) {
                setSaving(true);
                try {
                  await deleteBriefing("socal", date);
                  setSavedAt(null);
                } catch (err) {
                  setError("Failed to delete briefing.");
                } finally {
                  setSaving(false);
                }
              }
            }}
            disabled={saving}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 active:scale-[0.98] transition shrink-0"
            title="Delete custom briefing"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>
      {savedAt && (
        <p className="mt-2 text-center text-[11px] uppercase tracking-wider text-success">
          Saved at {savedAt}
        </p>
      )}
    </AppShell>
  );
}

function Section({
  icon,
  label,
  onClear,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-destructive hover:text-destructive/80 transition-colors"
            title={`Clear ${label}`}
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function SectionAttachments({
  section,
  market,
  date,
  busy,
  onUpload,
  getSectionAttachments,
  removeDocument,
}: {
  section: "announcement" | "safety" | "lesson";
  market: Market;
  date: string;
  busy: boolean;
  onUpload: (file: File, section: "announcement" | "safety" | "lesson" | "toolbox") => void;
  getSectionAttachments: (
    m: Market,
    d: string,
    s: "announcement" | "safety" | "lesson" | "toolbox",
  ) => Array<{
    id: string;
    name: string;
    type: "pdf" | "doc";
    url: string;
    storagePath: string;
    market: Market;
    date: string;
    sizeKb: number;
    uploadedAt: string;
  }>;
  removeDocument: (rec: any) => void;
}) {
  const atts = getSectionAttachments(market, date, section);
  return (
    <div className="mt-3 rounded-md border border-dashed border-border bg-surface/50 p-2">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <Plus className="h-3.5 w-3.5" />
        {busy ? "Uploading…" : "Attach PDF or DOC"}
        <input
          type="file"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f, section);
            e.target.value = "";
          }}
        />
      </label>
      {atts.length > 0 && (
        <ul className="mt-2 space-y-1">
          {atts.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
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
              <button
                onClick={() => removeDocument(d)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-destructive/40 text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
