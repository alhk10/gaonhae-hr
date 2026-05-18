## Goal

Enhance the public Grading List (`/grading-list`) with:
1. **Inline certificate download** per registration row (gated behind admin unlock).
2. **Multi-select + mass certificate download** in the page header.
3. **Branch filter** next to the existing date filter (default: All branches).

All changes are scoped to `src/pages/public/PublicGradingList.tsx`. No backend/schema/service changes.

## 1. Inline PDF certificate download (per row)

- Visible only when `editMode === true` (i.e. either password unlocked: `ADMIN_UNLOCK_PASSWORD` `Hp97533488` standard, or `ADMIN_FULL_UNLOCK_PASSWORD` `39SeagullWalk` full). Hidden on the fully public/locked view.
- Add a trailing icon-button column (`Cert`) inside the existing `editMode` action group in each slot table.
- Rendered only when `r.source === 'registration'`. Submission rows show nothing.
- Handler `handleDownloadCertificate(row)`:
  - Build `GradingCertificateInput` from `r.student_name`, `r.current_belt` (pre-grading belt), `r.grading_date`, `scorecard: []`.
  - Toast error if `grading_date` missing.
  - Call `downloadGradingCertificatePDF(input, "Certificate_{NAME}_{BELT}_{DDMMYYYY}.pdf")` matching the sanitization used in `GradingListTab.runCertificate`.
- Skip page 2 (scorecard) in `src/utils/gradingCertificatePDFGenerator.ts → generateGradingCertificatePDF` when `scorecard` is empty AND no `result` is supplied. Existing call sites (which pass scorecard) are unaffected.

## 2. Multi-select + mass certificate download

- Visible only when `editMode === true`, placed in the header `Card` next to the existing Summary PDF download button.
- Per-row checkbox in a new leading column of each slot table (registration rows only; submissions show blank). Checked-state tracked in a `Set<string>` keyed by a stable row id (`${r.source}:${r.submission_id ?? `${r.student_name}|${r.grading_date}|${r.current_belt}`}`).
- Add "Select all" checkbox in each slot's table header that toggles all eligible registration rows in that slot.
- New header button "Download selected certificates" (`Award` icon + count badge). Disabled when zero selected.
- Handler `handleDownloadSelectedCertificates()`:
  - Map selected rows to `GradingCertificateInput[]` (same field mapping as single).
  - Call `generateBulkGradingCertificatesPDFAsync(inputs, onProgress)` from `gradingCertificatePDFGenerator`.
  - Toast progress (loading id) like `GradingListTab.runBulkDownload`.
  - Save as `Certificates_Bulk_{YYYYMMDD}.pdf`.

## 3. Branch filter

- Add `branchFilter` state (default `'all'`) and a `Select` next to the existing date `Select` in the header `Card`.
- Options derived from filtered rows' `branch_name` (unique, sorted, exclude null → `'—'`).
- Apply filter in the existing `useMemo` that builds `filteredRows`, AFTER the date filter:
  - `branchFilter === 'all' ? rows : rows.filter(r => (r.branch_name || '—') === branchFilter)`.
- Layout: header `Card` becomes `flex flex-wrap gap-2` so date + branch + buttons wrap nicely on mobile (925px viewport).
- Branch filter is **always visible** (not gated by edit mode).

## Verification

- `/grading-list` locked: branch filter shows; cert and mass-cert buttons hidden.
- Unlock with `Hp97533488`: cert icon per registration row, Summary PDF button, mass-cert button + checkboxes appear.
- Select 3 registration rows across different slots → click mass download → bulk PDF with 3 certificate pages saves.
- Single row download → certificate-only PDF (no scorecard page) with correct name/belt/date.
- Branch filter `Balmoral`: only Balmoral grouped slots render; date filter still works in combination.
- Row missing `grading_date` → toast error, nothing downloads.
