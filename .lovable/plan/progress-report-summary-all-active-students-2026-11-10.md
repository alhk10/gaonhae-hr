# Progress report summary: all active students

- Summary page lists every active student in the branch (employees excluded), sorted by name, not only those with a saved card.
- New "Progress Card" column before "Ready for Grading Test": shows "Done" (with report date) or "Not done".
- Students without a card show "—" for readiness; paid date still comes from the term's grading payment.
- Card pages after the summary are still printed only for students who have a saved card.

## Technical details
- `access_progress_report`: drive from `students` (branch, status 'active', not employee) LEFT JOIN `student_progress_cards` for the selected terms; add `has_card` flag; paid date keyed by student + selected terms.
- `progressCardPdf.ts`: add column (widths rebalanced to fit A4 with wrapping); render card pages only for `has_card` rows.
- `ProgressReportRow` type gains `has_card`.
- Regenerate a sample PDF and check layout visually.
