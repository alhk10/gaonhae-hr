In the `/grading-list` Competitions tab, expand each submission into one row per category (duplicating all submission-level info) and auto-recalculate the Reporting time whenever Competition time changes.

What changes:
- Each row in the competition table is replaced by N rows, one per `category_names` entry. The Categories column shows just that one category name. All other columns (Competition, Reporting, Court, Branch, Student, Belt, Status, Amount, Poomsae 1, Poomsae 2, Cert, Proof, Actions) repeat the submission-level value on every row.
- Edits on duplicated rows still target the underlying submission (Poomsae change, Accept/Reject, datetime/court edits, delete) — there is no per-category data.
- Sorting stays by student name (A→Z); within a student, categories keep their stored order.
- When the Competition date/time is saved, Reporting is always recalculated to `competition - 1h30m` and persisted (overwriting any prior reporting value). Clearing Competition clears Reporting.

Technical details (`src/pages/public/PublicGradingList.tsx`):
- Build a flattened list: for each sorted submission, emit `(category_names.length || 1)` rows; key = `${submission_id}__${index}`.
- Render the single category name in the Categories cell as plain text on its own line (current single-row-per-category layout, no badge).
- `scheduleMutation` for `competition_at`: when the new value is non-null, also include `reporting_at = ISO(competition - 90min)`; when null, set `reporting_at = null`. The Reporting cell remains editable independently afterward.
- Reporting cell continues to save independently when edited directly.

Out of scope: no DB schema changes, no changes to Grading/Seminars/Guards tabs, no per-category data model.