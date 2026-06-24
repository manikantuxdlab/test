import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useSession, usePendingAck } from "@/lib/session";
import { useBriefing } from "@/lib/briefing-store";
import { getDatesToAcknowledge, users, STAFF_ROLES } from "@/lib/mock-data";
import { useSchedule, getDynamicDatesToAcknowledge } from "@/lib/schedule-store";
import { useDirectory } from "@/lib/directory-store";
import { AppShell } from "@/components/AppShell";
import {
  Megaphone,
  ShieldAlert,
  BookOpen,
  FileText,
  Check,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/acknowledge")({
  head: () => ({ meta: [{ title: "Operations acknowledgement — X3 Field Ops" }] }),
  component: AckPage,
});

type Section = "announcement" | "safety" | "lesson" | "documents";

function AckPage() {
  const navigate = useNavigate();
  const {
    user,
    isHydrated,
    selectedMarket,
    historySettings,
    acknowledge,
    isAcked,
    getDocsForDate,
    getToolboxAckId,
    getAckItemIdsForDate,
    getProgressForDate,
  } = useSession();
  const { dates, pending, isCrewman } = usePendingAck();
  const { jobs } = useSchedule();
  const { allPeople } = useDirectory();
  const targetUserId = new URLSearchParams(globalThis.location?.search ?? "").get("userId");
  const isStaff = Boolean(user && STAFF_ROLES.includes(user.role));
  const targetUser =
    isStaff && targetUserId ? (allPeople.find((u) => u.id === targetUserId) ?? null) : null;
  const ackUser = targetUser ?? user;
  const ackMarket = targetUser?.market ?? selectedMarket ?? ackUser?.market;
  const ackDates = useMemo(() => {
    if (!ackUser || !ackMarket) return [];
    return targetUser
      ? getDynamicDatesToAcknowledge(ackUser, jobs, historySettings[ackMarket])
      : dates;
  }, [ackUser, ackMarket, targetUser, dates, historySettings, jobs]);

  // Day index (0 = oldest pending day). Skip past completed days automatically.
  const firstIncompleteIdx = useMemo(() => {
    if (!ackUser || !ackMarket) return 0;
    for (let i = 0; i < ackDates.length; i++) {
      const p = getProgressForDate(ackUser.id, ackMarket, ackDates[i]);
      if (!p.complete) return i;
    }
    return Math.max(0, ackDates.length - 1);
  }, [ackDates, ackUser, ackMarket, getProgressForDate]);

  const [dayIdx, setDayIdx] = useState(firstIncompleteIdx);
  const [openSection, setOpenSection] = useState<Section | null>(null);

  useEffect(() => {
    setDayIdx(firstIncompleteIdx);
  }, [firstIncompleteIdx]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!ackMarket) {
      navigate({ to: "/" });
      return;
    }
    if (targetUser) return;
    if (!isCrewman) {
      navigate({ to: "/" });
      return;
    }
    // No auto-redirect when pending === 0 — let user review/re-open past acks.
  }, [user, ackMarket, isCrewman, navigate, targetUser, isHydrated]);

  if (!isHydrated || !ackMarket) return null;
  if (!ackUser) return null;
  if (ackDates.length === 0) {
    return (
      <AppShell title="X3 Communications" subtitle="Operations acknowledgement">
        <div className="mx-auto max-w-xl text-center py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success mx-auto mb-4 animate-in fade-in zoom-in duration-300">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-white">All Caught Up!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You have no pending documents or daily briefings to acknowledge.
          </p>
          <button
            onClick={() => navigate({ to: "/schedule" })}
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition active:scale-[0.98]"
          >
            Go to My Schedule
          </button>
        </div>
      </AppShell>
    );
  }
  const { getEffectiveDocSet, getSectionAttachments, uploadedDocs } = useBriefing();
  const date = ackDates[dayIdx];
  const set = getEffectiveDocSet(ackMarket, date);
  if (!set) return null;
  const docs = getDocsForDate(ackMarket, date);
  const announcementAtts = getSectionAttachments(ackMarket, date, "announcement");
  const safetyAtts = getSectionAttachments(ackMarket, date, "safety");
  const lessonAtts = getSectionAttachments(ackMarket, date, "lesson");
  const docUrlById = new Map(uploadedDocs.map((u) => [u.id, u.url] as const));

  const itemIds = getAckItemIdsForDate(ackMarket, date);
  const doneCount = itemIds.filter((id) => isAcked(id, ackUser.id)).length;
  const dayComplete = doneCount === itemIds.length;
  const toolboxAckId = getToolboxAckId(ackMarket, date);
  const docsComplete = toolboxAckId ? isAcked(toolboxAckId, ackUser.id) : true;

  const isBacklog = ackDates.length > 1;
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <AppShell title="X3 Communications" subtitle="Operations acknowledgement">
      <div className="mx-auto max-w-xl">
        {isBacklog && (
          <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <div className="font-bold text-white">
              Welcome back — {ackDates.length} day{ackDates.length === 1 ? "" : "s"} of pending
              docs.
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Work through each day in order to resume full access.
            </div>
          </div>
        )}

        {targetUser && (
          <div className="mb-3 rounded-lg border border-border bg-card px-3 py-2 text-xs">
            <div className="font-bold text-white">Acknowledging for {targetUser.name}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              {ackMarket === "socal" ? "X3 Management" : "Las Vegas"} · {targetUser.role}
            </div>
          </div>
        )}

        <div className="mb-2.5 flex items-center justify-between gap-1">
          <button
            onClick={() => setDayIdx(Math.max(0, dayIdx - 1))}
            disabled={dayIdx === 0}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border disabled:opacity-30 transition hover:bg-accent"
            aria-label="Previous day"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Day {dayIdx + 1} of {ackDates.length}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-white">
              <Calendar className="h-3.5 w-3.5 text-primary" /> {dateLabel}
            </div>
          </div>
          <button
            onClick={() => setDayIdx(Math.min(ackDates.length - 1, dayIdx + 1))}
            disabled={dayIdx === ackDates.length - 1 || !dayComplete}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border disabled:opacity-30 transition hover:bg-accent"
            aria-label="Next day"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mb-3.5 rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Progress:
              </span>
              <span className="text-xs font-bold text-white">
                {doneCount} of {itemIds.length} complete
              </span>
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border transition-colors ${
                dayComplete
                  ? "border-success/30 bg-success/5 text-success"
                  : "border-primary/30 bg-primary/5 text-primary"
              }`}
            >
              {dayComplete ? "Ready" : `${doneCount}/${itemIds.length}`}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full transition-all duration-300 ${dayComplete ? "bg-success" : "bg-primary"}`}
              style={{ width: `${(doneCount / Math.max(1, itemIds.length)) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {Boolean(
            set.announcement.title?.trim() ||
            set.announcement.body?.trim() ||
            announcementAtts.length > 0,
          ) && (
            <AckButton
              icon={<Megaphone className="h-4.5 w-4.5" />}
              label="Announcement"
              title={set.announcement.title || "Announcement"}
              acked={isAcked(set.announcement.id, ackUser.id)}
              open={openSection === "announcement"}
              onToggle={() =>
                setOpenSection(openSection === "announcement" ? null : "announcement")
              }
            >
              <p className="text-xs leading-relaxed text-muted-foreground">
                {set.announcement.body}
              </p>
              <AttachmentList atts={announcementAtts} />
              <AckBtn
                done={isAcked(set.announcement.id, ackUser.id)}
                onClick={() => acknowledge(set.announcement.id, ackUser.id)}
              />
            </AckButton>
          )}

          {Boolean(
            set.safety.title?.trim() || set.safety.body?.trim() || safetyAtts.length > 0,
          ) && (
            <AckButton
              icon={<ShieldAlert className="h-4.5 w-4.5" />}
              label="Safety Topic"
              title={set.safety.title || "Safety Topic"}
              acked={isAcked(set.safety.id, ackUser.id)}
              open={openSection === "safety"}
              onToggle={() => setOpenSection(openSection === "safety" ? null : "safety")}
            >
              <p className="text-xs leading-relaxed text-muted-foreground">{set.safety.body}</p>
              <AttachmentList atts={safetyAtts} />
              <AckBtn
                done={isAcked(set.safety.id, ackUser.id)}
                onClick={() => acknowledge(set.safety.id, ackUser.id)}
              />
            </AckButton>
          )}

          {Boolean(
            set.lesson.title?.trim() || set.lesson.body?.trim() || lessonAtts.length > 0,
          ) && (
            <AckButton
              icon={<BookOpen className="h-4.5 w-4.5" />}
              label="Lessons Learned"
              title={set.lesson.title || "Lessons Learned"}
              acked={isAcked(set.lesson.id, ackUser.id)}
              open={openSection === "lesson"}
              onToggle={() => setOpenSection(openSection === "lesson" ? null : "lesson")}
            >
              <p className="text-xs leading-relaxed text-muted-foreground">{set.lesson.body}</p>
              <AttachmentList atts={lessonAtts} />
              <AckBtn
                done={isAcked(set.lesson.id, ackUser.id)}
                onClick={() => acknowledge(set.lesson.id, ackUser.id)}
              />
            </AckButton>
          )}

          {docs.length > 0 && (
            <AckButton
              icon={<FileText className="h-4.5 w-4.5" />}
              label="Toolbox"
              title={`${docs.length} document${docs.length === 1 ? "" : "s"} from operations`}
              acked={docsComplete}
              open={openSection === "documents"}
              onToggle={() => setOpenSection(openSection === "documents" ? null : "documents")}
            >
              <ul className="space-y-2">
                {docs.map((d) => {
                  const done = toolboxAckId
                    ? isAcked(toolboxAckId, ackUser.id)
                    : isAcked(d.id, ackUser.id);
                  const url = docUrlById.get(d.id);
                  return (
                    <li
                      key={d.id}
                      className="overflow-hidden rounded-md border border-border bg-surface"
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 truncate text-xs font-bold underline text-white hover:text-primary transition-colors"
                          >
                            {d.name}
                          </a>
                        ) : (
                          <span className="flex-1 truncate text-xs font-bold text-white">
                            {d.name}
                          </span>
                        )}
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 shrink-0">
                          {d.type} · {d.sizeKb}KB
                        </span>
                      </div>
                      {url && d.type === "pdf" && (
                        <iframe
                          src={url}
                          title={d.name}
                          className="h-56 w-full border-t border-border bg-background"
                        />
                      )}
                      <div className="px-3 pb-3">
                        <AckBtn
                          done={done}
                          onClick={() => acknowledge(toolboxAckId ?? d.id, ackUser.id)}
                          small
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </AckButton>
          )}
        </div>

        <button
          disabled={!dayComplete}
          onClick={() => {
            if (dayIdx < ackDates.length - 1) setDayIdx(dayIdx + 1);
            else navigate({ to: targetUser ? "/acknowledgements" : "/schedule" });
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          {dayIdx < ackDates.length - 1 ? "Next Day" : "Continue"}{" "}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </AppShell>
  );
}

function AckButton({
  icon,
  label,
  title,
  acked,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  acked: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`overflow-hidden rounded-lg border bg-card transition-colors ${acked ? "border-success/30 bg-success/[0.02]" : "border-border hover:border-zinc-800"}`}
    >
      <button onClick={onToggle} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${acked ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}
        >
          {acked ? <Check className="h-4.5 w-4.5" /> : icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
          <div className="truncate text-xs font-bold text-white">{title}</div>
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 text-muted-foreground transition ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-2.5 border-t border-zinc-900 px-3.5 pb-3.5 pt-2.5">{children}</div>
      )}
    </article>
  );
}

function AckBtn({ done, onClick, small }: { done: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      disabled={done}
      onClick={onClick}
      className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-md font-bold uppercase tracking-wider transition active:scale-[0.98] disabled:bg-success/80 disabled:text-success-foreground ${
        small ? "h-8 text-[11px]" : "h-9 text-xs"
      } bg-primary text-primary-foreground shadow-glow`}
    >
      {done ? (
        <>
          <Check className="h-3.5 w-3.5" /> Acknowledged
        </>
      ) : (
        "Acknowledge"
      )}
    </button>
  );
}

function AttachmentList({
  atts,
}: {
  atts: Array<{ id: string; name: string; type: "pdf" | "doc"; url: string }>;
}) {
  if (!atts || atts.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {atts.map((d) => (
        <div key={d.id} className="overflow-hidden rounded-md border border-zinc-900 bg-surface">
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-xs font-bold underline text-white hover:text-primary transition-colors"
            >
              {d.name}
            </a>
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 shrink-0">
              {d.type}
            </span>
          </div>
          {d.type === "pdf" ? (
            <iframe
              src={d.url}
              title={d.name}
              className="h-48 w-full border-t border-zinc-900 bg-background"
            />
          ) : (
            <div className="border-t border-zinc-900 px-2.5 py-1.5 text-[11px] text-muted-foreground">
              Open the document above to review before acknowledging.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
