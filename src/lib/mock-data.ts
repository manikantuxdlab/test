import { importedScheduleOverrides } from "./imported-schedule-overrides";

export type Role = "admin" | "staff" | "foreman" | "top-hand" | "apprentice" | "warehouse";
export type Market = "socal" | "vegas";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  staff: "Staff",
  foreman: "Foreman",
  "top-hand": "Top Hand",
  apprentice: "Apprentice",
  warehouse: "Warehouse",
};

export const CREWMAN_ROLES: Role[] = ["foreman", "top-hand", "apprentice", "warehouse"];
export const STAFF_ROLES: Role[] = ["admin", "staff"];

export interface MockUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: Role;
  title?: string;
  market: Market;
  /** Display-only override for market label (e.g. "All", "Corp"). Filtering still uses `market`. */
  marketLabel?: string;
  crewId?: string;
  initials: string;
  scheduledDates: string[];
  /** When true, user can sign in but does not appear in the Directory. */
  hiddenFromDirectory?: boolean;
  staffOrField?: "Staff" | "Field";
}

export interface Crew {
  id: string;
  name: string;
  market: Market;
  foremanId: string;
  memberIds: string[];
}

export interface DailyDocSet {
  date: string;
  market: Market;
  announcement: { id: string; title: string; body: string };
  safety: { id: string; title: string; body: string };
  lesson: { id: string; title: string; body: string };
  documents: { id: string; name: string; type: "pdf" | "doc"; sizeKb: number; url?: string }[];
}

export interface DailySchedule {
  id: string;
  userId: string;
  market: Market;
  date: string;
  crewName: string;
  members: string[];
  projectCode: string;
  adpNumber: string;
  siteAddress: string;
  mapsUrl: string;
  scopeOfWork: string;
  approvedOnsite: string;
  startTime: string;
  endTime: string;
  hoursRemaining: number;
  daysRemaining: number;
  specialInstructions: string;
  towerOwner?: string;
}

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function emailFor(name: string) {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")}@x3corp.net`;
}

/**
 * Real email overrides per roster name. Sources:
 *   - SoCal schedule TO line (X3 corp + personal emails)
 *   - LV crew BCC list (provided by Dave)
 * Anyone NOT here AND not staff/foreman gets a blank email (renders as "—" in Directory).
 */
const EMAIL_OVERRIDES: Record<string, string> = {
  // SoCal personal emails
  "Cesar Gonzalez": "91.gonzalez.c@gmail.com",
  "Miguel Soberano Jr.": "miggy.smallz0513@gmail.com",
  "David Cortez": "davidcortezz2004@gmail.com",
  "Fernando Gomez": "ffomez@yahoo.com",
  "Freddy Tepox": "freddy.tepox97@icloud.com",
  "Eric Hukel": "erichukel@gmail.com",
  "Fred Galindo": "galindofederico858@gmail.com",
  "Guillermo Alvizo": "alvizo.guillermo1@gmail.com",
  "Federico Castillo": "federicocastillo601@gmail.com",
  "Obrien Paniagua": "obrienpaniagua1@gmail.com",
  "Kyle Reno": "kylereno88@gmail.com",
  "Ernesto Velasquez": "ernesto.velasquez171@gmail.com",
  "Eddie Serrano": "eddieserrano02@gmail.com",
  "Axel Najera": "nsjeraaxel@gmail.com",
  "Thomas McKnight": "thomasmcknight32@gmail.com",
  // Las Vegas crew (BCC list)
  "Armando Lopez": "armando101590@yahoo.com",
  "Juan Lopez": "lopezjuan21@icloud.com",
  "Alejandro Parada": "alex00702@gmail.com",
  "Juan Rodriguez": "rdzjuan1996@gmail.com",
  "Kiefer Stahl": "kiefer.stahl@gmail.com",
  "Efrain Tovar": "efrain1tovar@gmail.com",
  "Ramon Zavalza": "rz722@hotmail.com",
  // Additional overrides
  "Will Bell": "str8paintballer@msn.com",
  "Michale Hernandez": "dingler260@yahoo.com",
  "Michael Hernandez": "dingler260@yahoo.com",
  "Nelson Montano": "nelson.mantano@x3corp.net",
  "Rob Rodriguez": "rob.rodriguez@x3corp.net",
  "Michael Tanseco": "michael.tanseco@gmail.com",
  "Albert Torres": "alberto.torres@x3corp.net",
  "Adrian Vazquez": "adrian@reliable702.com",
  "Johnathan Velazquez": "john14chambers@gmail.com",
  "Shreyansh Test": "cshrey1234@gmail.com",
};

function resolveEmail(name: string, role: Role): string {
  const over = EMAIL_OVERRIDES[name];
  if (over) return over;
  return emailFor(name);
}

function usernameFor(name: string, market: Market) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `${market}.${slug}`;
}

function toPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw;
}

function mapUrl(address: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

function timeFromFraction(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  const totalMinutes = Math.round(n * 24 * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function splitWindow(value: string) {
  const parts = value.split("-").map((part) => part.trim());
  if (parts.length < 2) return { startTime: value, endTime: value };
  return { startTime: parts[0], endTime: parts[1] };
}

function hoursFromWindow(startTime: string, endTime: string) {
  const parse = (input: string) => {
    const match = input.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (!match) return 0;
    let hour = Number(match[1]) % 12;
    const minute = Number(match[2]);
    const meridiem = match[3]?.toLowerCase();
    if (meridiem === "pm") hour += 12;
    if (!meridiem && Number(match[1]) === 24) hour = 0;
    return hour * 60 + minute;
  };
  const start = parse(startTime);
  let end = parse(endTime);
  if (end <= start) end += 24 * 60;
  return Math.max(1, Math.round((end - start) / 60));
}

function localIsoToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function uniqueSortedDates(dates: string[]) {
  return [...new Set(dates)].sort();
}

export const TODAY = localIsoToday();
export const DEFAULT_DEMO_PASSWORD = "X3Demo!2026";
export const DEFAULT_CREW_PASSWORD = "X3Crew!2026";

export function passwordForRole(_role: Role): string {
  // Single shared demo password for all roles to simplify rollout.
  return DEFAULT_DEMO_PASSWORD;
}
function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

const SOCAL_HISTORY_DATES = getDatesInRange("2026-05-08", TODAY);
const VEGAS_HISTORY_DATES = getDatesInRange("2026-05-08", TODAY);

const MARKET_HISTORY_DATES: Record<Market, string[]> = {
  socal: SOCAL_HISTORY_DATES,
  vegas: VEGAS_HISTORY_DATES,
};
const RECENT_14 = MARKET_HISTORY_DATES.socal;
const TODAY_ONLY = [TODAY];
const OFF_TODAY = RECENT_14.filter((date) => date !== TODAY);

function user(
  id: string,
  name: string,
  phone: string,
  role: Role,
  market: Market,
  title: string,
  scheduledDates: string[] = RECENT_14,
  crewId?: string,
  marketLabel?: string,
): MockUser {
  const staffOrField = ["admin", "staff"].includes(role) ? "Staff" : "Field";
  return {
    id,
    name,
    username: usernameFor(name, market),
    email: resolveEmail(name, role),
    phone: toPhone(phone),
    role,
    title,
    market,
    marketLabel,
    crewId,
    initials: initials(name),
    scheduledDates,
    staffOrField,
  };
}

export function findUserByCredentials(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (!normalizedIdentifier) return null;
  const candidate = users.find(
    (u) => u.username === normalizedIdentifier || u.email.toLowerCase() === normalizedIdentifier,
  );
  if (!candidate) return null;
  return password === passwordForRole(candidate.role) ? candidate : null;
}

export const users: MockUser[] = [
  user("u-test-shrey", "Shreyansh Test", "123.456.7890", "foreman", "socal", "Test Crewman"),
  user(
    "u1",
    "Charlie Tran",
    "562.841.5303",
    "admin",
    "socal",
    "Director of Operations",
    RECENT_14,
    undefined,
    "All",
  ),
  user("u2", "Daniel McClellan", "760.224.4202", "admin", "socal", "Sr. Construction Manager"),
  user("u3", "Daniel Lord", "760.691.0237", "staff", "socal", "Construction Manager"),
  user("u4", "Dustin Wong", "760.533.3737", "staff", "socal", "Construction Manager"),
  user("u5", "Christian Preciado", "760.224.1344", "staff", "socal", "Construction Manager"),
  user(
    "u7",
    "Deb Kuntze",
    "760.271.5226",
    "staff",
    "socal",
    "Human Resources / Safety",
    RECENT_14,
    undefined,
    "Corp",
  ),
  user("u8", "Albert Torres", "760.224.1597", "warehouse", "socal", "Warehouse & Fleet Manager"),
  user("u9", "Michael Tanseco", "443.253.7034", "warehouse", "socal", "Warehouse Assistant"),
  user("u10", "Tony Santos", "760.979.7770", "warehouse", "socal", "Warehouse & Fleet Manager"),
  user("u11", "Rob Rodriguez", "760.445.8656", "warehouse", "socal", "Warehouse Assistant"),
  user("u12", "Jason Andrews", "951.349.9595", "foreman", "socal", "Foreman", RECENT_14, "c1"),
  user("u13", "Christian Tepox", "949.400.7341", "foreman", "socal", "Foreman", RECENT_14, "c1"),
  user("u14", "Freddy Tepox", "714.884.1914", "apprentice", "socal", "Crewman", RECENT_14, "c1"),
  user("u15", "Steven Rodriguez", "562.667.7018", "foreman", "socal", "Foreman", RECENT_14, "c2"),
  user("u16", "Fred Galindo", "626.488.4943", "apprentice", "socal", "Crewman", RECENT_14, "c2"),
  user(
    "u17",
    "Michael Hernandez",
    "626.252.8756",
    "apprentice",
    "socal",
    "Crewman",
    RECENT_14,
    "c2",
  ),
  user("u18", "Miguel Soberano", "562.662.1031", "foreman", "socal", "Foreman", RECENT_14, "c3"),
  user("u19", "Cesar Gonzalez", "714.909.9516", "apprentice", "socal", "Crewman", RECENT_14, "c3"),
  user(
    "u20",
    "Guillermo Alvizo",
    "714.580.6126",
    "apprentice",
    "socal",
    "Crewman",
    RECENT_14,
    "c3",
  ),
  user("u21", "Manny Santistevan", "626.991.3770", "foreman", "socal", "Foreman", RECENT_14, "c4"),
  user("u22", "Ramon Zavalza", "702.274.1999", "apprentice", "socal", "Crewman", RECENT_14, "c4"),
  user("u23", "Blake Devore", "213.257.5022", "foreman", "socal", "Foreman", RECENT_14, "c5"),
  user("u24", "Scott Devore", "213.703.0136", "foreman", "socal", "Foreman", RECENT_14, "c5"),
  user("u25", "David Cortez", "909.757.4424", "apprentice", "socal", "Crewman", RECENT_14, "c5"),
  user("u26", "Richard Romero", "714.801.6016", "warehouse", "socal", "Crewman", RECENT_14, "c6"),
  user("u27", "Manlio Imperial", "760.271.9038", "foreman", "socal", "Foreman", RECENT_14, "c7"),
  user("u28", "Eddie Serrano", "909.641.8384", "apprentice", "socal", "Crewman", RECENT_14, "c7"),
  user(
    "u29",
    "Johnathan Velazquez",
    "310.753.6136",
    "apprentice",
    "socal",
    "Crewman",
    RECENT_14,
    "c7",
  ),
  user("u30", "Hosea Weathers", "562.387.5974", "foreman", "socal", "Foreman", RECENT_14, "c8"),
  user("u31", "Gregory Davila", "310.404.5354", "apprentice", "socal", "Crewman", RECENT_14, "c8"),
  user("u32", "Craig Brown", "213.618.8768", "foreman", "socal", "Foreman", RECENT_14, "c9"),
  user("u33", "Will Bell", "562.357.1128", "apprentice", "socal", "Crewman", RECENT_14, "c9"),
  user("u34", "Victor Martinez", "818.292.6572", "foreman", "socal", "Foreman", RECENT_14, "c10"),
  user(
    "u35",
    "Federico Castillo",
    "818.478.0282",
    "apprentice",
    "socal",
    "Crewman",
    RECENT_14,
    "c10",
  ),
  user("u36", "Ricky Torres", "323.244.7886", "foreman", "socal", "Foreman", RECENT_14, "c11"),
  user("u37", "Kyle Reno", "909.977.1090", "apprentice", "socal", "Crewman", RECENT_14, "c11"),
  user("u38", "Ramon Ojeda", "760.685.0322", "foreman", "socal", "Foreman", RECENT_14, "c12"),
  user("u39", "Eric Hukel", "562.313.0449", "apprentice", "socal", "Crewman", RECENT_14, "c12"),
  user(
    "u40",
    "Obrien Paniagua",
    "909.549.6210",
    "apprentice",
    "socal",
    "Crewman",
    RECENT_14,
    "c12",
  ),
  user("u41", "Jonathan Najera", "760.685.0239", "foreman", "socal", "Foreman", RECENT_14, "c13"),
  user("u42", "Axel Najera", "619.830.8206", "apprentice", "socal", "Crewman", RECENT_14, "c13"),
  user("u43", "Bryce Olsen", "951.764.7676", "foreman", "socal", "Foreman", RECENT_14, "c14"),
  user("u44", "Aaron Thompson", "760.415.1362", "foreman", "socal", "Foreman", RECENT_14, "c15"),
  user(
    "u45",
    "Thomas McKnight",
    "682.330.8934",
    "apprentice",
    "socal",
    "Crewman",
    RECENT_14,
    "c15",
  ),
  user("u46", "David Orozco", "760.000.0000", "foreman", "socal", "Foreman", RECENT_14, "c16"),
  user("u47", "Jacob Apodaca", "760.000.0001", "foreman", "socal", "Foreman", RECENT_14, "c16"),
  user(
    "u48",
    "Ernesto Velasquez",
    "661.466.3425",
    "apprentice",
    "socal",
    "Crewman",
    RECENT_14,
    "c16",
  ),
  user(
    "u49",
    "Miguel Soberano Jr.",
    "951.623.9021",
    "apprentice",
    "socal",
    "Crewman",
    OFF_TODAY,
    "c16",
  ),
  user("u50", "Jesse Torres", "619.598.5149", "foreman", "socal", "Foreman", OFF_TODAY, "c16"),
  user("u51", "Alfonso Velazquez", "714.264.8755", "foreman", "socal", "Foreman", OFF_TODAY, "c16"),
  user("u52", "Fernando Gomez", "714.300.5995", "apprentice", "socal", "Crewman", OFF_TODAY, "c16"),

  user("u54", "Flavio Saldivar", "725.268.0131", "staff", "socal", "Project Manager"),
  user("u57", "Nelson Montano", "702.931.6727", "warehouse", "socal", "Warehouse Manager"),
  user(
    "u58",
    "Ranier Delmundo",
    "702.409.8504",
    "foreman",
    "socal",
    "Foreman",
    VEGAS_HISTORY_DATES,
    "v1",
  ),
  user(
    "u59",
    "Kiefer Stahl",
    "610.930.6299",
    "apprentice",
    "socal",
    "Crewman",
    VEGAS_HISTORY_DATES,
    "v1",
  ),
  user(
    "u60",
    "Armando Lopez",
    "702.773.7665",
    "top-hand",
    "socal",
    "Crewman",
    VEGAS_HISTORY_DATES,
    "v1",
  ),
  user(
    "u61",
    "Jovon Brown",
    "702.582.3161",
    "foreman",
    "socal",
    "Foreman",
    VEGAS_HISTORY_DATES,
    "v2",
  ),
  user(
    "u62",
    "Juan Rodriguez",
    "702.937.6046",
    "apprentice",
    "socal",
    "Crewman",
    VEGAS_HISTORY_DATES,
    "v2",
  ),
  user(
    "u63",
    "Juan Lopez",
    "702.724.5477",
    "top-hand",
    "socal",
    "Crewman",
    VEGAS_HISTORY_DATES,
    "v2",
  ),
  user(
    "u64",
    "Javier Loya Mendoza",
    "702.280.1423",
    "foreman",
    "socal",
    "Foreman",
    VEGAS_HISTORY_DATES,
    "v3",
  ),
  user(
    "u65",
    "Efrain Tovar",
    "702.325.5967",
    "top-hand",
    "socal",
    "Crewman",
    VEGAS_HISTORY_DATES,
    "v3",
  ),
  user(
    "u66",
    "Alejandro Parada",
    "702.773.7665",
    "top-hand",
    "socal",
    "Crewman",
    VEGAS_HISTORY_DATES,
    "v3",
  ),
  user("u69", "Giovani Osorio", "760.224.5799", "foreman", "socal", "Foreman", TODAY_ONLY, "v5"),
  user("u70", "Adrian Vazquez", "702.235.8137", "top-hand", "socal", "Crewman", TODAY_ONLY, "v6"),

  // Corp & Project Coordinator staff
  user(
    "u71",
    "Heidi Hopp",
    "760.519.9580",
    "staff",
    "socal",
    "Accounting Manager",
    RECENT_14,
    undefined,
    "Corp",
  ),
  user(
    "u72",
    "Rosemarie Lasam",
    "",
    "staff",
    "socal",
    "Accounting Assistant",
    RECENT_14,
    undefined,
    "Corp",
  ),
  user(
    "u73",
    "Maica Havana",
    "+63 956 053 8151",
    "staff",
    "socal",
    "HR Assistant",
    RECENT_14,
    undefined,
    "Corp",
  ),
  user(
    "u74",
    "Roselie Ibutnandi",
    "",
    "staff",
    "socal",
    "Project Coordinator",
    RECENT_14,
    undefined,
    "SoCal",
  ),
  user(
    "u75",
    "Cindy Naig",
    "",
    "staff",
    "socal",
    "Project Coordinator",
    RECENT_14,
    undefined,
    "All",
  ),
  user(
    "u76",
    "Rowena Gambala",
    "",
    "staff",
    "socal",
    "Project Coordinator",
    RECENT_14,
    undefined,
    "SoCal",
  ),

  // Hidden owner login — does not appear in Directory or headcount totals.
  {
    id: "u-dave",
    name: "Dave Cranford",
    username: "dave.cranford",
    email: "dave.cranford@x3corp.net",
    phone: "",
    role: "admin",
    title: "Owner",
    market: "socal",
    marketLabel: "All",
    initials: "DC",
    scheduledDates: [],
    hiddenFromDirectory: true,
  },
];

export const crews: Crew[] = [
  {
    id: "c1",
    name: "SoCal Crew 1",
    market: "socal",
    foremanId: "u12",
    memberIds: ["u12", "u13", "u14"],
  },
  {
    id: "c2",
    name: "SoCal Crew 2",
    market: "socal",
    foremanId: "u15",
    memberIds: ["u15", "u16", "u17"],
  },
  {
    id: "c3",
    name: "SoCal Crew 3",
    market: "socal",
    foremanId: "u18",
    memberIds: ["u18", "u19", "u20"],
  },
  { id: "c4", name: "SoCal Crew 4", market: "socal", foremanId: "u21", memberIds: ["u21", "u22"] },
  {
    id: "c5",
    name: "SoCal Crew 5",
    market: "socal",
    foremanId: "u23",
    memberIds: ["u23", "u24", "u25"],
  },
  {
    id: "c6",
    name: "SoCal Warehouse Support",
    market: "socal",
    foremanId: "u26",
    memberIds: ["u26"],
  },
  {
    id: "c7",
    name: "SoCal Crew 7",
    market: "socal",
    foremanId: "u27",
    memberIds: ["u27", "u28", "u29"],
  },
  { id: "c8", name: "SoCal Crew 8", market: "socal", foremanId: "u30", memberIds: ["u30", "u31"] },
  { id: "c9", name: "SoCal Crew 9", market: "socal", foremanId: "u32", memberIds: ["u32", "u33"] },
  {
    id: "c10",
    name: "SoCal Crew 10",
    market: "socal",
    foremanId: "u34",
    memberIds: ["u34", "u35"],
  },
  {
    id: "c11",
    name: "SoCal Crew 11",
    market: "socal",
    foremanId: "u36",
    memberIds: ["u36", "u37"],
  },
  {
    id: "c12",
    name: "SoCal Crew 12",
    market: "socal",
    foremanId: "u38",
    memberIds: ["u38", "u39", "u40"],
  },
  {
    id: "c13",
    name: "SoCal Crew 13",
    market: "socal",
    foremanId: "u41",
    memberIds: ["u41", "u42"],
  },
  { id: "c14", name: "SoCal Crew 14", market: "socal", foremanId: "u43", memberIds: ["u43"] },
  {
    id: "c15",
    name: "SoCal Crew 15",
    market: "socal",
    foremanId: "u44",
    memberIds: ["u44", "u45"],
  },
  {
    id: "c16",
    name: "SoCal Crew 16",
    market: "socal",
    foremanId: "u46",
    memberIds: ["u46", "u47", "u48", "u49", "u50", "u51", "u52"],
  },
  {
    id: "v1",
    name: "Vegas Crew 1",
    market: "socal",
    foremanId: "u58",
    memberIds: ["u58", "u59", "u60"],
  },
  {
    id: "v2",
    name: "Vegas Crew 2",
    market: "socal",
    foremanId: "u61",
    memberIds: ["u61", "u62", "u63"],
  },
  {
    id: "v3",
    name: "Vegas Crew 3",
    market: "socal",
    foremanId: "u64",
    memberIds: ["u64", "u65", "u66"],
  },
  { id: "v5", name: "Vegas Crew 5", market: "socal", foremanId: "u69", memberIds: ["u69"] },
  { id: "v6", name: "Vegas Crew 6", market: "socal", foremanId: "u70", memberIds: ["u70"] },
];

// Default briefing content has been cleared so the Daily Briefing starts as
// a blank canvas.  Admins create custom content via the Daily Briefing page
// which is persisted in Firestore.  Trashing that content reverts to blank.

export const dailyDocs: DailyDocSet[] = RECENT_14.flatMap((date) => [
  {
    date,
    market: "socal" as const,
    announcement: { id: `a-socal-${date}`, title: "", body: "" },
    safety: { id: `s-socal-${date}`, title: "", body: "" },
    lesson: { id: `l-socal-${date}`, title: "", body: "" },
    documents: [],
  },
]);

export const scheduleTemplates: ScheduleTemplate[] = [];
const scheduleTemplateByUserId = new Map<string, ScheduleTemplate>();

type ScheduleOverrideInput = {
  userId: string;
  market: Market;
  date: string;
  crewName?: string;
  members?: string[];
  projectCode?: string;
  adpNumber?: string;
  siteAddress?: string;
  scopeOfWork?: string;
  approvedOnsite?: string;
  startTime?: string;
  endTime?: string;
  shift?: string;
  daysRemaining?: number;
  hoursRemaining?: number;
  specialInstructions?: string;
};

function makeScheduleOverride(input: ScheduleOverrideInput): DailySchedule {
  const base = scheduleTemplateByUserId.get(input.userId);
  const normalizedShift = input.shift?.replace(/[–—]/g, "-");
  const shift = normalizedShift ? splitWindow(normalizedShift) : undefined;
  const startTime = input.startTime ?? shift?.startTime ?? base?.startTime ?? "N/A";
  const endTime = input.endTime ?? shift?.endTime ?? base?.endTime ?? "N/A";
  const daysRemaining = input.daysRemaining ?? base?.baseDays ?? 0;
  const fallbackHours =
    base?.baseHours ?? hoursFromWindow(startTime, endTime) * Math.max(1, daysRemaining);

  return {
    id: `${input.userId}-${input.date}`,
    userId: input.userId,
    market: input.market,
    date: input.date,
    crewName: input.crewName ?? base?.crewName ?? "Crew assignment",
    members: input.members ?? base?.members ?? [],
    projectCode: input.projectCode ?? base?.projectCode ?? "TBD",
    adpNumber: input.adpNumber ?? base?.adpNumber ?? "TBD",
    siteAddress: input.siteAddress ?? base?.siteAddress ?? "No address provided",
    mapsUrl: mapUrl(input.siteAddress ?? base?.siteAddress ?? "Las Vegas, NV"),
    scopeOfWork: input.scopeOfWork ?? base?.scopeOfWork ?? "Awaiting scope.",
    approvedOnsite: input.approvedOnsite ?? base?.approvedOnsite ?? startTime,
    startTime,
    endTime,
    hoursRemaining: input.hoursRemaining ?? fallbackHours,
    daysRemaining,
    specialInstructions: input.specialInstructions ?? base?.specialInstructions ?? "",
    towerOwner: base?.towerOwner ?? "",
  };
}

const scheduleOverrides: DailySchedule[] = importedScheduleOverrides.map((schedule) =>
  makeScheduleOverride(schedule),
);

const overrideScheduleKeys = new Set(
  scheduleOverrides.map((schedule) => `${schedule.userId}:${schedule.date}`),
);

const defaultSchedules: DailySchedule[] = scheduleTemplates.flatMap((template) =>
  MARKET_HISTORY_DATES[template.market]
    .filter((date) => !overrideScheduleKeys.has(`${template.userId}:${date}`))
    .map((date, idx) => ({
      id: `${template.userId}-${date}`,
      userId: template.userId,
      market: template.market,
      date,
      crewName: template.crewName,
      members: template.members,
      projectCode: template.projectCode,
      adpNumber: template.adpNumber,
      siteAddress: template.siteAddress,
      mapsUrl: template.mapsUrl,
      scopeOfWork: template.scopeOfWork,
      approvedOnsite: template.approvedOnsite,
      startTime: template.startTime,
      endTime: template.endTime,
      hoursRemaining: Math.max(
        0,
        template.baseHours -
          idx * Math.max(1, Math.floor(template.baseHours / Math.max(template.baseDays, 1)) || 1),
      ),
      daysRemaining: Math.max(0, template.baseDays - idx),
      specialInstructions: template.specialInstructions,
      towerOwner: template.towerOwner ?? "",
    })),
);

export const schedules: DailySchedule[] = [...scheduleOverrides, ...defaultSchedules];

const userIdByName = new Map(users.map((user) => [user.name, user.id]));
const scheduledDatesByUser = new Map<string, Set<string>>();

for (const schedule of schedules) {
  if (!scheduledDatesByUser.has(schedule.userId))
    scheduledDatesByUser.set(schedule.userId, new Set());
  scheduledDatesByUser.get(schedule.userId)?.add(schedule.date);

  for (const member of schedule.members) {
    const memberId = userIdByName.get(member);
    if (!memberId) continue;
    if (!scheduledDatesByUser.has(memberId)) scheduledDatesByUser.set(memberId, new Set());
    scheduledDatesByUser.get(memberId)?.add(schedule.date);
  }
}

for (const user of users) {
  const dates = scheduledDatesByUser.get(user.id);
  if (!dates?.size) continue;
  user.scheduledDates = [...dates].sort();
}

export function getScheduleForUser(
  userId: string,
  market: Market,
  date = TODAY,
): DailySchedule | undefined {
  const direct = schedules.find(
    (s) => s.userId === userId && s.market === market && s.date === date,
  );
  if (direct) return direct;
  const user = users.find((u) => u.id === userId);
  if (!user) return undefined;
  return schedules.find(
    (s) =>
      s.market === market &&
      s.date === date &&
      s.members.some((member) => member.includes(user.name)),
  );
}

export function getSchedulesForMarket(market: Market, date = TODAY): DailySchedule[] {
  return schedules.filter((s) => s.market === market && s.date === date);
}

export function getUsersByMarket(market: Market): MockUser[] {
  return users.filter((u) => u.market === market && !u.hiddenFromDirectory);
}

export function getDailyDocSet(market: Market, date: string): DailyDocSet | undefined {
  return dailyDocs.find((d) => d.market === market && d.date === date);
}

export function getMaxPreviousDatesForMarket(market: Market): number {
  return Math.max(
    0,
    [...new Set(MARKET_HISTORY_DATES[market].filter((date) => date <= TODAY))].length - 1,
  );
}

export function getDatesToAcknowledge(
  user: MockUser,
  previousDatesToShow = getMaxPreviousDatesForMarket(user.market),
): string[] {
  const eligibleDates = [...new Set(user.scheduledDates)]
    .filter((date) => date <= TODAY && Boolean(getDailyDocSet(user.market, date)))
    .sort();
  const previousDates = eligibleDates
    .filter((date) => date < TODAY)
    .slice(-Math.max(0, previousDatesToShow));

  return eligibleDates.includes(TODAY) ? [...previousDates, TODAY] : previousDates;
}

export function ackItemIdsForDate(market: Market, date: string): string[] {
  const set = getDailyDocSet(market, date);
  if (!set) return [];
  return [set.announcement.id, set.safety.id, set.lesson.id, ...set.documents.map((d) => d.id)];
}

function visible(list: MockUser[]): MockUser[] {
  return list.filter((u) => !u.hiddenFromDirectory);
}

export function headcountByRole(market: Market) {
  // Per-market: count each market entry as its own seat (Manny in SoCal + Manny
  // in Vegas = two seats, since they are distinct schedule assignments).
  const list = visible(getUsersByMarket(market));
  const tally = (r: Role) => list.filter((u) => u.role === r).length;
  return {
    foreman: tally("foreman"),
    topHand: tally("top-hand"),
    apprentice: tally("apprentice"),
    warehouse: tally("warehouse"),
    staff: tally("staff") + tally("admin"),
    total: list.length,
  };
}

export function headcountGrandTotal() {
  // Grand total mirrors per-market counts so dual-market staff (e.g. Manny in
  // both SoCal and Vegas) are counted in each market they serve.
  const list = visible(users);
  const tally = (r: Role) => list.filter((u) => u.role === r).length;
  return {
    foreman: tally("foreman"),
    crewman: tally("top-hand") + tally("apprentice"),
    warehouse: tally("warehouse"),
    staff: tally("staff") + tally("admin"),
    total: list.length,
  };
}

export function hoursForSchedule(schedule: DailySchedule) {
  return hoursFromWindow(schedule.startTime, schedule.endTime);
}
