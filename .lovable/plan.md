# Competition tab tweaks (`/grading-list` → Competitions)

File: `src/pages/public/PublicGradingList.tsx` — the "Singapore Open Poomsae" table (~lines 2004-2100).

## Changes

1. **Reorder columns** so Cert and Proof sit just before Actions:
   - New order: Branch · Student · Belt · Categories · Status · Amount · Poomsae 1 · Poomsae 2 · **Cert** · **Proof** · Actions · (delete)
   - Move both `<TableHead>` definitions and their matching `<TableCell>` bodies accordingly. No logic changes.

2. **One category per line** in the Categories cell:
   - Change the wrapper from `flex flex-wrap gap-1` to `flex flex-col items-start gap-1` so each `<Badge>` renders on its own row.

3. **Sort by student name** (A→Z, case-insensitive):
   - Before `.map(...)`, sort the rows: `[...rows].sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''))`.

## Out of scope
No changes to data fetching, services, mutations, or other tabs.
