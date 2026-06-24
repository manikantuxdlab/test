import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Search, Printer, BookOpen, ShieldCheck } from "lucide-react";
import { useSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/mock-data";

export const Route = createFileRoute("/help")({
  component: HelpPage,
});

type Step = { title: string; detail: string };
type Topic = {
  q: string;
  summary: string;
  steps?: Step[];
  tips?: string[];
  screenshot?: ScreenshotKey;
};
type Section = { title: string; topics: Topic[] };

/* ------------------------------------------------------------------ */
/* Screenshot mockups (inline SVG so they always render, even offline) */
/* ------------------------------------------------------------------ */

type ScreenshotKey =
  | "login"
  | "home"
  | "schedule"
  | "acknowledge"
  | "directory"
  | "directory-edit"
  | "toolbox"
  | "daily-briefing"
  | "dashboard"
  | "schedule-builder"
  | "reports"
  | "history-slider";

function Screenshot({ k, caption }: { k: ScreenshotKey; caption: string }) {
  return (
    <figure className="my-3 overflow-hidden rounded-md border border-border bg-surface print:break-inside-avoid">
      <div className="bg-[hsl(var(--background))] p-2">
        <div className="mx-auto w-full max-w-md">
          <ScreenshotSvg k={k} />
        </div>
      </div>
      <figcaption className="border-t border-border bg-card px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        Screenshot · {caption}
      </figcaption>
    </figure>
  );
}

function ScreenshotSvg({ k }: { k: ScreenshotKey }) {
  // Shared mock palette — uses literal colors only inside the SVG mockup
  const bg = "#0e1116";
  const card = "#1a1f27";
  const line = "#2a313c";
  const text = "#e6e8eb";
  const sub = "#8a93a3";
  const accent = "#f59e0b";

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <svg viewBox="0 0 360 240" className="h-auto w-full">
      <rect width="360" height="240" fill={bg} />
      <rect x="0" y="0" width="360" height="22" fill={card} />
      <circle cx="12" cy="11" r="3" fill="#ef4444" />
      <circle cx="22" cy="11" r="3" fill="#f59e0b" />
      <circle cx="32" cy="11" r="3" fill="#22c55e" />
      {children}
    </svg>
  );

  const T = (x: number, y: number, t: string, size = 9, color = text, weight = 400) => (
    <text
      x={x}
      y={y}
      fontFamily="ui-sans-serif, system-ui"
      fontSize={size}
      fill={color}
      fontWeight={weight}
    >
      {t}
    </text>
  );

  switch (k) {
    case "login":
      return (
        <Frame>
          {T(140, 60, "X3 SIGN IN", 14, text, 800)}
          <rect x="100" y="80" width="160" height="22" rx="4" fill={card} stroke={line} />
          {T(108, 95, "username", 9, sub)}
          <rect x="100" y="110" width="160" height="22" rx="4" fill={card} stroke={line} />
          {T(108, 125, "••••••••", 9, sub)}
          <rect x="100" y="142" width="160" height="24" rx="4" fill={accent} />
          {T(160, 158, "SIGN IN", 10, "#0e1116", 800)}
        </Frame>
      );
    case "home":
      return (
        <Frame>
          {T(12, 38, "HOME", 11, text, 800)}
          {[
            ["Schedule", 0],
            ["Toolbox", 1],
            ["Directory", 2],
            ["Acknowledge", 3],
          ].map(([label, i]) => (
            <g key={label as string}>
              <rect
                x={12 + ((i as number) % 2) * 172}
                y={56 + Math.floor((i as number) / 2) * 64}
                width="160"
                height="56"
                rx="8"
                fill={card}
                stroke={line}
              />
              {T(
                24 + ((i as number) % 2) * 172,
                90 + Math.floor((i as number) / 2) * 64,
                label as string,
                11,
                text,
                700,
              )}
            </g>
          ))}
        </Frame>
      );
    case "schedule":
      return (
        <Frame>
          {T(12, 38, "SCHEDULE — TODAY", 11, text, 800)}
          <rect x="12" y="48" width="336" height="60" rx="6" fill={card} stroke={line} />
          {T(20, 66, "Job #4821 · La Jolla Pull", 10, text, 700)}
          {T(20, 82, "Foreman: J. Ruiz", 9, sub)}
          {T(20, 96, "Crew: 4 · Start 06:30", 9, sub)}
          <rect x="12" y="116" width="336" height="60" rx="6" fill={card} stroke={line} />
          {T(20, 134, "Notes", 9, accent, 800)}
          {T(20, 150, "Bring 200ft cat6, lift permit on site.", 9, text)}
          <rect x="12" y="184" width="100" height="22" rx="4" fill={card} stroke={line} />
          {T(20, 199, "◀ Yesterday", 9, text)}
          <rect x="248" y="184" width="100" height="22" rx="4" fill={card} stroke={line} />
          {T(282, 199, "Today", 9, text)}
        </Frame>
      );
    case "acknowledge":
      return (
        <Frame>
          {T(12, 38, "PENDING ACKNOWLEDGEMENTS", 10, text, 800)}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect
                x="12"
                y={52 + i * 50}
                width="336"
                height="42"
                rx="6"
                fill={card}
                stroke={line}
              />
              {T(
                20,
                70 + i * 50,
                ["Daily Briefing", "Safety Topic", "SOP Update"][i],
                10,
                text,
                700,
              )}
              {T(20, 84 + i * 50, "Tap to read & acknowledge", 8, sub)}
              <rect x="280" y={62 + i * 50} width="60" height="22" rx="4" fill={accent} />
              {T(289, 77 + i * 50, "ACK", 9, "#0e1116", 800)}
            </g>
          ))}
        </Frame>
      );
    case "directory":
      return (
        <Frame>
          {T(12, 38, "DIRECTORY", 11, text, 800)}
          <rect x="12" y="46" width="336" height="22" rx="4" fill={card} stroke={line} />
          {T(20, 61, "🔍 Search by last name…", 9, sub)}
          {[
            ["Ruiz, Jose", "Foreman · X3 Management"],
            ["Patel, Anika", "Top-Hand · X3 Management"],
            ["Nguyen, Tran", "Apprentice · X3 Management"],
          ].map(([n, r], i) => (
            <g key={i}>
              <rect
                x="12"
                y={76 + i * 44}
                width="336"
                height="38"
                rx="6"
                fill={card}
                stroke={line}
              />
              {T(20, 92 + i * 44, n as string, 10, text, 700)}
              {T(20, 106 + i * 44, r as string, 8, sub)}
              {T(310, 99 + i * 44, "✎", 12, accent, 800)}
            </g>
          ))}
        </Frame>
      );
    case "directory-edit":
      return (
        <Frame>
          {T(12, 38, "EDIT PERSON", 11, text, 800)}
          {["First name", "Last name", "Role", "Market", "Phone", "Email"].map((l, i) => (
            <g key={l}>
              {T(12, 60 + i * 26, l, 8, sub)}
              <rect
                x="12"
                y={64 + i * 26}
                width="336"
                height="18"
                rx="3"
                fill={card}
                stroke={line}
              />
            </g>
          ))}
          <rect x="248" y="218" width="100" height="20" rx="4" fill={accent} />
          {T(280, 232, "SAVE", 9, "#0e1116", 800)}
        </Frame>
      );
    case "toolbox":
      return (
        <Frame>
          {T(12, 38, "TOOLBOX", 11, text, 800)}
          {["Safety Bulletins", "SOPs", "Training PDFs"].map((c, i) => (
            <g key={c}>
              <rect
                x="12"
                y={50 + i * 56}
                width="336"
                height="48"
                rx="6"
                fill={card}
                stroke={line}
              />
              {T(20, 70 + i * 56, c, 10, text, 700)}
              {T(20, 86 + i * 56, "3 documents", 8, sub)}
              {T(330, 78 + i * 56, "›", 14, accent, 800)}
            </g>
          ))}
        </Frame>
      );
    case "daily-briefing":
      return (
        <Frame>
          {T(12, 38, "DAILY BRIEFING — COMPANY-WIDE", 9, text, 800)}
          <rect x="12" y="48" width="336" height="80" rx="6" fill={card} stroke={line} />
          {T(20, 66, "Title", 8, sub)}
          {T(20, 82, "Morning Safety Reminder", 10, text, 700)}
          {T(20, 100, "Body", 8, sub)}
          {T(20, 116, "Hydrate. Inspect harnesses before climb…", 9, text)}
          <rect x="12" y="138" width="160" height="22" rx="4" fill={card} stroke={line} />
          {T(20, 153, "📎 Attach document", 9, text)}
          <rect x="248" y="138" width="100" height="22" rx="4" fill={accent} />
          {T(272, 153, "PUBLISH", 9, "#0e1116", 800)}
        </Frame>
      );
    case "dashboard":
      return (
        <Frame>
          {T(12, 38, "DASHBOARD", 11, text, 800)}
          {[
            ["Active Jobs", "12"],
            ["Acks Pending", "3"],
            ["Crew On Shift", "47"],
            ["Briefings Sent", "1"],
          ].map(([l, v], i) => (
            <g key={i}>
              <rect
                x={12 + (i % 2) * 172}
                y={50 + Math.floor(i / 2) * 56}
                width="160"
                height="48"
                rx="6"
                fill={card}
                stroke={line}
              />
              {T(20 + (i % 2) * 172, 70 + Math.floor(i / 2) * 56, l as string, 9, sub)}
              {T(20 + (i % 2) * 172, 90 + Math.floor(i / 2) * 56, v as string, 16, accent, 800)}
            </g>
          ))}
        </Frame>
      );
    case "schedule-builder":
      return (
        <Frame>
          {T(12, 38, "SCHEDULE BUILDER", 10, text, 800)}
          <rect x="12" y="48" width="100" height="22" rx="4" fill={card} stroke={line} />
          {T(20, 63, "📅 Pick date", 9, text)}
          <rect x="248" y="48" width="100" height="22" rx="4" fill={accent} />
          {T(272, 63, "PUBLISH", 9, "#0e1116", 800)}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect
                x="12"
                y={80 + i * 42}
                width="336"
                height="36"
                rx="6"
                fill={card}
                stroke={line}
              />
              {T(20, 96 + i * 42, `Job #482${i + 1}`, 10, text, 700)}
              {T(20, 108 + i * 42, "Crew: drag to assign", 8, sub)}
            </g>
          ))}
        </Frame>
      );
    case "reports":
      return (
        <Frame>
          {T(12, 38, "REPORTS", 11, text, 800)}
          {["Schedule History", "Acknowledgements", "Daily Briefing Archive"].map((c, i) => (
            <g key={c}>
              <rect
                x="12"
                y={50 + i * 52}
                width="336"
                height="44"
                rx="6"
                fill={card}
                stroke={line}
              />
              {T(20, 70 + i * 52, c, 10, text, 700)}
              <rect x="278" y={60 + i * 52} width="62" height="22" rx="4" fill={accent} />
              {T(290, 75 + i * 52, "EXPORT", 8, "#0e1116", 800)}
            </g>
          ))}
        </Frame>
      );
    case "history-slider":
      return (
        <Frame>
          {T(12, 38, "SCHEDULE HISTORY SETTINGS", 9, text, 800)}
          {["X3 Management"].map((m, i) => (
            <g key={m}>
              <rect
                x="12"
                y={56 + i * 80}
                width="336"
                height="68"
                rx="6"
                fill={card}
                stroke={line}
              />
              {T(20, 74 + i * 80, m, 10, text, 700)}
              {T(20, 88 + i * 80, "Previous days visible to crewmen", 8, sub)}
              <rect x="20" y={102 + i * 80} width="280" height="4" rx="2" fill={line} />
              <rect x="20" y={102 + i * 80} width="120" height="4" rx="2" fill={accent} />
              <circle cx="140" cy={104 + i * 80} r="6" fill={accent} />
              {T(310, 107 + i * 80, "3", 10, accent, 800)}
            </g>
          ))}
        </Frame>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

const CREWMAN_RULES: Section = {
  title: "Rule Set — Crewman & Foreman",
  topics: [
    {
      q: "The rules every field user must follow",
      summary: "Read this once. It answers most of the day-to-day questions before they come up.",
      tips: [
        "Sign in only with the credentials your admin gave you. Don't share accounts.",
        "Acknowledgements come first. You can't open Schedule, Toolbox, or Contacts until your queue is clear.",
        "If you're not working a scheduled day, mark it OFF / PTO / HOL / ELR / LOA so acknowledgements don't pile up.",
        "Foremen and Warehouse can see schedules for ALL sites.",
        "Crewmen (Top-Hand / Apprentice) only see their own personal schedule — by design.",
        "Date range for crew roles: today and one day prior. Older history lives with Staff.",
        "Schedules are LIVE. The moment a manager saves a job, it appears on your phone — there is no separate 'publish' step in Schedule Builder.",
        "Daily Briefings are company-wide and seen by all active crew members.",
        "If something looks wrong, contact your foreman or staff lead via Contacts before acting on it.",
      ],
    },
  ],
};

const STAFF_RULES: Section = {
  title: "Rule Set — Staff & Admin",
  topics: [
    {
      q: "The rules every staff/admin must follow",
      summary: "Operational ground rules for managers building schedules and publishing content.",
      tips: [
        "Up to 5 managers can build schedules at once. Each manager owns 4–8 crews.",
        "Live availability: as soon as you select a Foreman or Crewman on a job, every other manager sees them flagged in orange ('Booked on another job') the next time their picker refreshes — no double-booking.",
        "Already-assigned people are still selectable (in case of intentional re-assignment) but the warning color makes mistakes obvious.",
        "Schedule Builder has NO 'Publish' button. Saving a job IS publishing — crewmen see it on their next refresh.",
        "Daily Briefing IS published explicitly — it has a Publish button because it triggers an acknowledgement for every active crew member.",
        "Foremen and Warehouse get full schedule visibility. Crewmen only see themselves.",
        "Roles are stored centrally; changing a role takes effect the next time that person loads the app.",
        "Use Reports → Export to pull CSVs for payroll, compliance, or audits. Don't screenshot.",
        "When in doubt about who can see what, check the Visibility Matrix below.",
      ],
    },
    {
      q: "Visibility matrix — who sees what",
      summary: "Quick reference for role-based access.",
      tips: [
        "Admin / Staff: Everything. All history, all reports, all admin tools.",
        "Foreman: Full schedule visibility, all toolbox docs, contacts, daily briefing acks.",
        "Warehouse: Same as Foreman (full schedule visibility) plus warehouse tools.",
        "Top-Hand / Apprentice: Personal schedule only (today + 1 day prior), toolbox, contacts, acks.",
      ],
    },
    {
      q: "Why is there no Publish button on Schedule Builder?",
      summary: "Saving a job in Schedule Builder is the publish step. There is no second click.",
      steps: [
        {
          title: "You build the job",
          detail: "Pick the date, fill in project code, address, SOW, hours, crew, and managers.",
        },
        {
          title: "You tap Save Job",
          detail: "The job is written to the live database immediately.",
        },
        {
          title: "Crewmen see it on next refresh",
          detail:
            "Anyone assigned (and any foreman/warehouse with full visibility) sees the job appear in their schedule the next time they open the app or pull-to-refresh.",
        },
        {
          title: "Edits are also live",
          detail:
            "Re-opening a job and saving any change pushes the update the same way. No publish step needed.",
        },
      ],
      tips: [
        "Daily Briefing is the exception — it has a Publish button because publishing it generates an acknowledgement requirement for every crew member.",
      ],
    },
  ],
};

const USER_SECTIONS: Section[] = [
  CREWMAN_RULES,
  {
    title: "Getting Started",
    topics: [
      {
        q: "How do I sign in?",
        summary: "Use the credentials your administrator gave you to access the app.",
        screenshot: "login",
        steps: [
          {
            title: "Open the app",
            detail:
              "Launch X3 Communications on your phone or browser. The Sign In screen loads first.",
          },
          {
            title: "Enter your username",
            detail:
              "Type the username assigned to you (usually first initial + last name). Not case-sensitive.",
          },
          {
            title: "Enter your password",
            detail: "Type your password exactly as given. The eye icon shows/hides what you typed.",
          },
          {
            title: "Tap Sign In",
            detail:
              "If your credentials are correct you'll land on the Home screen. If not, double-check spelling and try again.",
          },
        ],
        tips: [
          "Forgot your password? Contact a staff member or admin — only they can reset it.",
          "If the app says 'Inactive user', your account has been deactivated. Ask an admin to reactivate.",
        ],
      },
      {
        q: "What does the home screen show?",
        summary: "The home screen is your launch pad to every area you have access to.",
        screenshot: "home",
        steps: [
          {
            title: "Top bar",
            detail:
              "Shows your initials (top right) and a Help icon (?). Tap your initials to sign out, tap ? to return here.",
          },
          {
            title: "Main tiles",
            detail:
              "Schedule, Toolbox, Directory, and Acknowledgements. Tiles you don't have access to are hidden.",
          },
          {
            title: "Pending banner",
            detail:
              "If you have unread acknowledgements, a banner at the top blocks Schedule/Toolbox until you complete them.",
          },
        ],
      },
      {
        q: "How do I sign out?",
        summary: "Sign out from the header to protect your account on shared devices.",
        steps: [
          {
            title: "Find your initials",
            detail: "Top right corner of every page shows a circle with your initials.",
          },
          {
            title: "Tap the log-out icon",
            detail: "Right next to your initials. You'll be returned to the Sign In screen.",
          },
        ],
      },
    ],
  },
  {
    title: "Acknowledgements",
    topics: [
      {
        q: "Why am I being asked to acknowledge a document?",
        summary:
          "Crewmen must confirm they've read safety, briefing, and policy documents before continuing.",
        screenshot: "acknowledge",
        tips: [
          "Acknowledgements are tracked per person — staff can see exactly who has and hasn't read each item.",
          "Re-published documents reset your acknowledgement, so you may see a familiar item appear again.",
        ],
      },
      {
        q: "How do I complete an acknowledgement?",
        summary: "Open each pending item, read the content, then confirm.",
        screenshot: "acknowledge",
        steps: [
          {
            title: "Open Acknowledgements",
            detail:
              "From the Home screen, tap the Acknowledgements tile (or the red banner at the top).",
          },
          {
            title: "Tap a pending item",
            detail: "Items with the orange ACK button still need your attention.",
          },
          {
            title: "Read the full content",
            detail:
              "Scroll all the way to the bottom — the Acknowledge button only enables once you've reached the end.",
          },
          {
            title: "Tap Acknowledge",
            detail:
              "You may be asked to type your name to confirm. Submit, and the item disappears from your queue.",
          },
        ],
      },
      {
        q: "Can I skip an acknowledgement?",
        summary: "No. Pending items block Schedule, Toolbox, and Directory until completed.",
        tips: [
          "If something looks wrong (e.g., blank document), contact your foreman before acknowledging.",
        ],
      },
    ],
  },
  {
    title: "Schedule",
    topics: [
      {
        q: "How do I see my schedule?",
        summary: "View today's job, your crew, the location, and notes from your foreman.",
        screenshot: "schedule",
        steps: [
          {
            title: "Tap Schedule on Home",
            detail: "Or use the bottom navigation if visible on your device.",
          },
          {
            title: "Review the job card",
            detail:
              "Job number, location, foreman, start time, and crew list are shown at the top.",
          },
          {
            title: "Read the notes section",
            detail:
              "Special instructions, equipment, or permits required appear in orange-highlighted notes.",
          },
          {
            title: "Switch dates",
            detail: "Use the ◀ Yesterday and Today ▶ buttons at the bottom to flip between days.",
          },
        ],
      },
      {
        q: "How far back can I view past schedules?",
        summary: "Crewmen see today and one day prior. Staff and admins see full history.",
        screenshot: "schedule",
        tips: [
          "If you need an older schedule for payroll or records, ask a staff member to look it up in Reports.",
          "The date picker greys out dates you can't access.",
        ],
      },
      {
        q: "Who do I contact if my schedule looks wrong?",
        summary:
          "Reach out to your foreman or staff lead first — Directory has their contact info.",
        steps: [
          { title: "Open Directory", detail: "From the Home screen." },
          { title: "Filter to Staff", detail: "Tap the Staff toggle at the top." },
          {
            title: "Tap a phone number",
            detail: "It opens your phone's dialer. Tap an email to send a message.",
          },
        ],
      },
    ],
  },
  {
    title: "Toolbox & Documents",
    topics: [
      {
        q: "What's in the Toolbox?",
        summary:
          "Safety bulletins, SOPs, training PDFs — anything staff has published for the crew.",
        screenshot: "toolbox",
        steps: [
          { title: "Open Toolbox from Home", detail: "Documents are grouped into categories." },
          { title: "Tap a category", detail: "Expands to show the documents inside." },
          {
            title: "Tap a document",
            detail: "Opens the PDF in your browser or downloads it for offline reading.",
          },
        ],
      },
      {
        q: "Can I download documents?",
        summary: "Yes — every document opens in a viewer with a download option.",
        tips: [
          "Downloads stay on your phone until you delete them. Useful for jobs without signal.",
        ],
      },
    ],
  },
  {
    title: "Directory",
    topics: [
      {
        q: "How do I find a coworker?",
        summary: "Search or filter the directory; names are sorted Last, First.",
        screenshot: "directory",
        steps: [
          { title: "Open Directory", detail: "From the Home screen." },
          {
            title: "Type a last name",
            detail: "The list filters as you type. Partial matches work.",
          },
          {
            title: "Use the role toggles",
            detail: "Filter by Crewman or Staff to narrow the list.",
          },
          {
            title: "Tap a contact method",
            detail: "Tap the phone number to call, or the email to send a message.",
          },
        ],
      },
      {
        q: "Can I edit my own information?",
        summary: "No. Contact a staff member or admin to update your details.",
      },
    ],
  },
  {
    title: "Daily Briefing",
    topics: [
      {
        q: "Where do I find the daily briefing?",
        summary:
          "It appears in your Acknowledgements queue and is archived for staff under Reports.",
        screenshot: "acknowledge",
        steps: [
          {
            title: "Look at the Home banner",
            detail: "A new briefing shows up as a pending acknowledgement at the top.",
          },
          { title: "Tap to read", detail: "Scroll through the body and any attached documents." },
          {
            title: "Acknowledge",
            detail: "Once you've read it, tap Acknowledge to clear it from your queue.",
          },
        ],
      },
      {
        q: "Who gets the daily briefing?",
        summary:
          "Daily briefings are company-wide. Everyone signed in under X3 Management gets the same briefings, announcements, safety topics, and toolbox documents.",
      },
    ],
  },
];

const ADMIN_SECTIONS: Section[] = [
  STAFF_RULES,
  {
    title: "Dashboard & Reports",
    topics: [
      {
        q: "What does the Dashboard show?",
        summary:
          "Live admin overview: active jobs, crew on today, pending acknowledgements, and quick links.",
        screenshot: "dashboard",
        steps: [
          { title: "Sign in as Admin or Staff", detail: "Crewman roles do not see Dashboard." },
          { title: "Open Dashboard from Home", detail: "Top tile in the staff section." },
          {
            title: "Tap a metric card",
            detail:
              "Active Jobs opens the Active Jobs page, Crew On Today opens Contacts, and Pending Acks opens the Acknowledgements roster — all scoped to the selected market.",
          },
          {
            title: "Use the quick-link tiles",
            detail: "Jump straight to Schedule Builder, Daily Briefing, Directory, and Reports.",
          },
        ],
      },
      {
        q: "What is Schedule History Settings?",
        summary:
          "Admin-only control that limits how many past days of schedule data crewmen can see.",
        screenshot: "history-slider",
        steps: [
          { title: "Open Dashboard", detail: "Sign in as Admin." },
          { title: "Scroll to Schedule History Settings", detail: "Below the Headcount section." },
          {
            title: "Drag the slider",
            detail: "0 = today only. Increase to show more previous days for X3 Management.",
          },
          {
            title: "Changes apply immediately",
            detail: "No save button — the new limit takes effect on the crewman's next page load.",
          },
        ],
        tips: ["Staff and admins always see full history regardless of this slider."],
      },
      {
        q: "How do I export reports?",
        summary:
          "Reports → pick a category → set a date range → tap CSV or Print at the top right.",
        screenshot: "reports",
        steps: [
          { title: "Open Reports from Home", detail: "Available to staff and admins only." },
          { title: "Pick a category", detail: "Schedule, Announcements, Safety, or Lessons." },
          {
            title: "Filter by date range",
            detail: "Use the From / To date pickers to narrow results.",
          },
          {
            title: "Tap CSV or Print",
            detail:
              "CSV downloads a spreadsheet you can open in Excel or share via email. Print opens your browser's print dialog.",
          },
        ],
        tips: [
          "Daily Briefing content is exported via the Announcements, Safety, and Lessons categories (one per section).",
        ],
      },
    ],
  },
  {
    title: "Directory Management",
    topics: [
      {
        q: "How do I add a new person?",
        summary: "Staff/Admin can add anyone to the directory in under a minute.",
        screenshot: "directory-edit",
        steps: [
          { title: "Open Directory", detail: "Signed in as staff or admin." },
          { title: "Tap Add Person", detail: "Top-right button on the Directory page." },
          {
            title: "Fill in the form",
            detail:
              "First name, Last name, Role (Foreman/Top-Hand/Apprentice/Warehouse/Staff/Admin), Market (defaults to X3 Management), Title, Phone, Email.",
          },
          {
            title: "Tap Save",
            detail: "The new person appears immediately in the list, sorted by last name.",
          },
        ],
        tips: ["Phone numbers can be entered in any format — they're normalized automatically."],
      },
      {
        q: "How do I edit or deactivate a user?",
        summary: "Use the row actions: Edit, Deactivate, Reactivate, or Delete.",
        screenshot: "directory",
        steps: [
          { title: "Find the person", detail: "Search by last name or scroll." },
          { title: "Tap the ✎ pencil to edit", detail: "Update any field, then Save." },
          {
            title: "Tap Deactivate to hide them",
            detail: "They stay in your records but disappear from crewman views.",
          },
          {
            title: "Tap Reactivate or Delete",
            detail:
              "Reactivate restores visibility. Delete removes the user permanently — only available for users you added (system seed users cannot be deleted).",
          },
        ],
      },
      {
        q: "Can I see deactivated people?",
        summary: "Yes — toggle Show Deactivated at the top of the Directory page.",
      },
    ],
  },
  {
    title: "Schedule Builder",
    topics: [
      {
        q: "How do I build a schedule?",
        summary:
          "Pick a date, add jobs, assign crews. Saving a job IS publishing — there is no separate Publish button.",
        screenshot: "schedule-builder",
        steps: [
          { title: "Open Schedule Builder", detail: "From the Home screen (staff/admin only)." },
          {
            title: "Pick a date",
            detail: "Use the date arrows or date picker to select the schedule date.",
          },
          {
            title: "Add a job",
            detail:
              "Tap Add Job, then fill in project code, address, SOW, hours, foreman, crew, and managers.",
          },
          {
            title: "Tap Save Job",
            detail:
              "The job goes live immediately. Crewmen and foremen with visibility see it on their next refresh — there is no Publish step.",
          },
          {
            title: "Use Last Schedule (optional)",
            detail:
              "If the day is empty, tap Use Last Schedule to copy jobs from the most recent prior day with a schedule (looks back up to 14 days). Existing jobs are not overwritten.",
          },
        ],
        tips: [
          "Live availability: a person already on another job in the same window is flagged in orange in the picker so you don't double-book.",
          "Daily Briefing is the only screen with a Publish button, because publishing it triggers an acknowledgement for every crew member.",
        ],
      },
      {
        q: "Can I import a schedule?",
        summary: "Yes — upload a CSV or paste tabular data.",
        steps: [
          { title: "Open Schedule Builder", detail: "Tap Import at the top right." },
          {
            title: "Upload a CSV",
            detail: "Or paste rows directly. Required columns: date, job, foreman, crew.",
          },
          {
            title: "Review the preview",
            detail: "Mismatched names get a yellow warning so you can fix them before committing.",
          },
          {
            title: "Confirm import",
            detail: "Imported overrides take priority over generated schedules.",
          },
        ],
      },
    ],
  },
  {
    title: "Daily Briefing (Admin)",
    topics: [
      {
        q: "How do I publish a daily briefing?",
        summary: "Compose, attach per-section documents, save — updates the system immediately.",
        screenshot: "daily-briefing",
        steps: [
          {
            title: "Open Daily Briefing",
            detail: "From the Home screen tile, or the Dashboard quick link (staff/admin only).",
          },
          {
            title: "Pick a date",
            detail: "Use the date arrows or date picker. Each calendar day has its own briefing.",
          },
          {
            title: "Fill in Announcement, Safety Topic, Lessons Learned",
            detail:
              "Title + body for each section. Keep it short — crewmen read this on their phones.",
          },
          {
            title: "Attach PDFs/DOCs per section",
            detail:
              "Each section (Announcement / Safety / Lessons) has its own Attach PDF or DOC slot. The Toolbox documents section at the bottom is for general files.",
          },
          {
            title: "Tap Save Briefing",
            detail:
              "The briefing immediately appears as a pending acknowledgement for every active crew member in X3 Management.",
          },
        ],
        tips: [
          "Briefings are company-wide — all crew members see the same briefing by design.",
          "Crewmen see the inline PDF preview on the Acknowledge screen before they confirm.",
        ],
      },
    ],
  },
  {
    title: "Acknowledgements (Admin)",
    topics: [
      {
        q: "How do I see who has acknowledged what?",
        summary: "Roster sorted Last, First with status per item.",
        screenshot: "acknowledge",
        steps: [
          {
            title: "Open Acknowledgements",
            detail:
              "Staff/Admin only. Reachable from the Dashboard 'Pending Acks' tile or the Home screen.",
          },
          { title: "Filter by document or person", detail: "Use the toggles at the top." },
          {
            title: "Read the status column",
            detail: "Green check = acknowledged with timestamp. Grey dash = pending.",
          },
          {
            title: "Export via Reports",
            detail:
              "Use Reports → Announcements / Safety / Lessons → CSV to pull the underlying briefing data for compliance records.",
          },
        ],
      },
      {
        q: "Can I require a re-acknowledgement?",
        summary: "Yes — re-publishing a document resets crewmen's status for that item.",
      },
    ],
  },
  {
    title: "User Roles & Permissions",
    topics: [
      {
        q: "What are the roles?",
        summary:
          "Admin and Staff have full access. Foreman, Top-Hand, Apprentice, Warehouse are crewman roles.",
        tips: [
          "Crewmen must complete acknowledgements before using Schedule/Toolbox/Directory.",
          "Crewmen can only view today and one day prior in Schedule.",
          "Only Admins see Schedule History Settings on the Dashboard.",
        ],
      },
      {
        q: "How do I change someone's role?",
        summary: "Edit the user from the Directory and pick a new role.",
        screenshot: "directory-edit",
        steps: [
          { title: "Open Directory", detail: "Signed in as Admin." },
          { title: "Tap the ✎ on the user", detail: "Opens the Edit Person dialog." },
          {
            title: "Change the Role dropdown",
            detail: "Pick from Foreman, Top-Hand, Apprentice, Warehouse, Staff, Admin.",
          },
          { title: "Save", detail: "The user's permissions change on their next page load." },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* UI                                                                 */
/* ------------------------------------------------------------------ */

function TopicCard({ topic, defaultOpen }: { topic: Topic; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="print:break-inside-avoid">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-accent/40"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-foreground">{topic.q}</span>
        <span className="text-lg leading-none text-muted-foreground print:hidden">
          {open ? "−" : "+"}
        </span>
      </button>
      <div className={`${open ? "block" : "hidden"} px-4 pb-4 print:block`}>
        <p className="text-sm leading-relaxed text-muted-foreground">{topic.summary}</p>

        {topic.screenshot && <Screenshot k={topic.screenshot} caption={topic.q} />}

        {topic.steps && topic.steps.length > 0 && (
          <ol className="mt-3 space-y-2.5">
            {topic.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-black text-primary-foreground">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground">{s.title}</div>
                  <div className="text-sm leading-relaxed text-muted-foreground">{s.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        )}

        {topic.tips && topic.tips.length > 0 && (
          <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5">
            <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-primary">
              Tips
            </div>
            <ul className="space-y-1">
              {topic.tips.map((t, i) => (
                <li key={i} className="text-xs leading-relaxed text-foreground">
                  • {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Accordion({ topics, query }: { topics: Topic[]; query: string }) {
  const filtered = useMemo(() => {
    if (!query) return topics;
    const q = query.toLowerCase();
    return topics.filter((t) => {
      const haystack = [
        t.q,
        t.summary,
        ...(t.steps?.flatMap((s) => [s.title, s.detail]) ?? []),
        ...(t.tips ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [topics, query]);

  if (filtered.length === 0) {
    return <div className="px-4 py-3 text-sm text-muted-foreground">No matching topics.</div>;
  }
  return (
    <div className="divide-y divide-border">
      {filtered.map((t, i) => (
        <TopicCard key={t.q} topic={t} defaultOpen={!!query} />
      ))}
    </div>
  );
}

function HelpPage() {
  const { user } = useSession();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  const [tab, setTab] = useState<"user" | "admin">("user");
  const [query, setQuery] = useState("");

  const sections = useMemo(
    () => (tab === "admin" && isStaff ? ADMIN_SECTIONS : USER_SECTIONS),
    [tab, isStaff],
  );

  const visibleSections = useMemo(() => {
    if (!query) return sections;
    const q = query.toLowerCase();
    return sections
      .map((s) => ({
        ...s,
        topics: s.topics.filter((t) => {
          const haystack = [
            t.q,
            t.summary,
            ...(t.steps?.flatMap((st) => [st.title, st.detail]) ?? []),
            ...(t.tips ?? []),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        }),
      }))
      .filter((s) => s.topics.length > 0);
  }, [sections, query]);

  return (
    <AppShell title="User Guide & Documentation" subtitle="Help Center">
      {/* Top toolbar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="relative w-full md:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help topics, steps, tips…"
            className="h-10 w-full rounded-md border border-border bg-card pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {isStaff && (
            <div className="inline-flex rounded-md border border-border bg-card p-1">
              <button
                onClick={() => setTab("user")}
                className={`flex-1 flex items-center justify-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                  tab === "user"
                    ? "bg-primary text-primary-foreground animate-fade-in"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" /> Crewman
              </button>
              <button
                onClick={() => setTab("admin")}
                className={`flex-1 flex items-center justify-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                  tab === "admin"
                    ? "bg-primary text-primary-foreground animate-fade-in"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Staff & Admin
              </button>
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-accent"
          >
            <Printer className="h-4 w-4" /> Print to PDF
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-black">X3 Communications — User Guide</h1>
        <p className="text-sm text-muted-foreground">
          {tab === "admin" ? "Staff & Admin Documentation" : "Crewman & Foreman Documentation"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 print:block">
        {/* TOC sidebar - hidden on mobile, visible on desktop */}
        <aside className="sticky top-24 self-start print:hidden hidden md:block">
          <div className="rounded-lg border border-border bg-card p-3 shadow-industrial">
            <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              On this page
            </div>
            <nav className="flex flex-col">
              {visibleSections.map((s) => {
                const id = s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return (
                  <a
                    key={s.title}
                    href={`#${id}`}
                    className="rounded px-2 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    {s.title}
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="space-y-4 print:space-y-2">
          {visibleSections.length === 0 && (
            <div className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-industrial">
              No topics match "{query}".
            </div>
          )}

          {visibleSections.map((section) => {
            const id = section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return (
              <section
                key={section.title}
                id={id}
                className="overflow-hidden rounded-lg border border-border bg-card scroll-mt-24 shadow-industrial print:break-inside-avoid"
              >
                <header className="border-b border-border bg-surface/50 px-4 py-2.5">
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">
                    {section.title}
                  </h2>
                </header>
                <Accordion topics={section.topics} query={query} />
              </section>
            );
          })}

          <p className="pt-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground print:hidden">
            Need more help? Contact your administrator.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
