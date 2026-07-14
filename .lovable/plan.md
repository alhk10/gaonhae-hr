Scope: `src/pages/public/PublicGradingList.tsx` — Competitions table only (no schema or service changes).

### 1. Column changes
- Remove the **Event** column (header + cell at ~line 2211 / 2244).
- Insert a new **Grading Card** column between **Cert** and **Proof** (after line 2225).
  - Cell renders the grading card icon/thumb currently living in the Docs column: if `require_grading_card && isFoundationToBlackTip(current_belt)` show green `IdCard` (with count badge) opening `setGradingCardDialog(...)`; otherwise `—`.
  - Keep the same icon in the Docs column as well? No — move it out of Docs into this new column to avoid duplication.

### 2. Column sizing
- **Court**: shrink input to ~4 characters. Change `CourtCell` input `w-[70px]` → `w-[42px]`, add `maxLength={4}`.
- **Poomsae 1 / Poomsae 2**: reduce width by 20%. The `Select` inside `renderPoomsae` inherits its width; add an explicit `w-[112px]` (down from the current ~140px effective) on the `SelectTrigger`, or wrap the cell in a `w-[112px]` container.

### 3. Auto-default Reporting time
- Already implemented in `DateTimeCell` (line 2059–2064): setting `competition_at` writes `reporting_at = competition_at − 90 min`. Verify and leave as-is. No further changes needed here unless the user wants the default to also fire on rows where `reporting_at` is manually cleared (out of scope unless requested).

### 4. Auto-sort by competition time
- In the table body sort (line 2236), replace the name-only sort with:
  1. `competition_at` ascending (nulls last)
  2. tiebreak by `student_name`
- Matches the sort already used by `handlePrintPdf` (lines 2138–2143) — reuse the same comparator.

### 5. Colour-code branches
- Fetch branches via existing `useBranches` / `getBranches` and build a `branchId → color` map (fallback `#6b7280`).
- On each `TableRow`, apply a left border in the branch colour, e.g. `style={{ borderLeft: '4px solid <color>' }}`, and tint the Branch cell text/background lightly with the same colour (`backgroundColor: <color>15`).
- Uses the existing `branches.color` field (same source used by `SlotBooking` / `AdminSlotBooking`).

### Out of scope
- Database migrations, service layer, PDF print output, other tabs (Grading / Seminars / Guards).
- Behavior of the `reporting_at` field when the user manually edits it (still user-editable and saved as typed).

### Verification
- Open Competitions tab: Event column gone, Grading Card column appears between Cert and Proof, rows sorted by competition time, Court input narrow (4 chars), Poomsae dropdowns visibly narrower, each row shows its branch colour on the left edge.
- Edit a competition time → reporting time auto-updates to −1h30m.
