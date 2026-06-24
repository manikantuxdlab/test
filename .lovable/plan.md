## Goal

Make X3 Field Ops usable on phones (and tablets) end-to-end, and replace the desktop sidebar with a proper mobile navigation pattern on small screens.

## 1. AppShell — responsive layout + mobile nav

`src/components/AppShell.tsx` currently hard-locks the page to desktop (`min-w-[1024px]`) and always renders the sidebar. Changes:

- Remove `min-w-[1024px]`; let the layout reflow down to 360px.
- Sidebar (`SideNav`) shown only on `md+` screens. Keep current collapse behavior on desktop.
- On mobile (`<md`):
  - Top bar gets a hamburger button on the left and condenses padding (`px-4 py-3`).
  - Tapping hamburger opens a slide-in drawer (shadcn `Sheet` from the left) containing the same nav items + user/logout footer.
  - Add a **bottom tab bar** with the 4–5 most-used items for the current role (Crewman: Home, Schedule, Toolbox, Directory, Help; Staff: Home, Operations, Schedule, Directory, More). "More" opens the drawer for overflow items.
  - Reserve bottom padding on `<main>` so content isn't hidden under the tab bar.
- Top bar profile chip collapses to just the avatar circle on mobile (hide name text).

## 2. Per-route responsive fixes

Audit and fix each route so nothing requires horizontal scroll on a 375px viewport. Common patterns to apply:

- Replace fixed multi-column grids (`grid-cols-3/4`) with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/4`.
- Wrap wide tables (Reports, Acknowledgements, Admin Directory, Schedule Builder job rows) in `overflow-x-auto` containers, or switch to stacked card view under `md`.
- Reduce page padding on mobile: `px-4 py-4 md:px-8 md:py-6` in `AppShell` main.
- Make filter/toolbar rows wrap (`flex-wrap gap-2`) instead of single-line.
- Dialogs/sheets: ensure `max-h-[90vh] overflow-y-auto` and full-width on mobile.

Routes to touch: `dashboard.tsx`, `index.tsx`, `schedule.tsx`, `schedule-builder.tsx`, `acknowledge.tsx`, `acknowledgements.tsx`, `active-jobs.tsx`, `contacts.tsx`, `documents.tsx`, `daily-briefing.tsx`, `reports.tsx`, `admin-directory.tsx`, `profile.tsx`, `help.tsx`, `login.tsx`.

Also `src/components/ScheduleCard.tsx` and `PersonDialog.tsx` for card/dialog widths.

## 3. Touch targets & typography

- Minimum tap target 40px (`h-10`) for buttons in mobile views.
- Bump base font where it's currently `text-[10–11px]` in headers so labels remain legible on phones.

## 4. Verification

- Use preview at 375×812 (iPhone), 768 (tablet), and 1280 (desktop).
- Walk: Login → Dashboard → Schedule → Schedule Builder → Acknowledge → Documents → Contacts → Reports. Confirm no horizontal scroll, drawer + bottom tabs work, sidebar reappears on `md+`.

## Out of scope

- No business-logic changes (scheduling rules, ack gating, auth flow stay as-is).
- No visual redesign — same tokens, same red/black/gray theme.
