# Plan: Competitions table — two-line rows when content overflows

## What we're changing
In the **Competitions** tab (the table shown in the uploaded screenshot), the row has too many columns to fit comfortably. When the viewport is too narrow for the full horizontal row, each registration row will stack its content across **two lines** instead of remaining a single cramped line with horizontal scrolling.

## Scope
- File: `src/pages/public/PublicGradingList.tsx`, specifically the `CompetitionsTab` table body.
- Desktop (wide) layout stays as a regular horizontal table.
- Narrow/mobile breakpoint: switch data rows to a 2-line stacked card-like row.

## Proposed layout
**Line 1 — core registration details**
Competition date/time, Reporting, Court, Branch, Student, Age, Belt, Categories, Status, Amount.

**Line 2 — poomsae / documents / actions**
Poomsae 1, Poomsae 2, Certificate, Grading Card, Photo, Proof, Docs, Registered, Edit/Verify/Delete actions.

## Implementation notes
- Use a Tailwind responsive breakpoint (`lg:` or `md:`) inside the `TableRow` / `TableCell` structure.
- Keep all existing interactivity: date-time inputs, court input, poomsae selects, verify/reject buttons, file thumbnails, delete/registered checkboxes.
- Editable inputs may be slightly rearranged but must remain reachable.
- The branch colour strip on the left (`borderLeft`) will be preserved.
- Avoid horizontal scroll on narrow screens; let rows wrap naturally.
- Run `npx tsgo --noEmit -p tsconfig.app.json` and check `/tmp/observability/build-errors.log` after edits.

## Out of scope
- No changes to data, filters, print/PDF logic, or event settings.
- No changes to the desktop table layout above the breakpoint.
