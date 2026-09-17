# One combined "Needs matching or verification" list on the superadmin dashboard

## Today

The superadmin dashboard shows four separate cards — Grading payments, Competition payments,
Seminar payments, Uniforms & guards — each with its own search, sort and counter. School fee
payments are only on the Access grading list, so nothing gives one view of everything waiting.

## What will change

A single card, **Public submissions — needs matching or verification**, replaces those four
cards at the same place on the dashboard. It lists every outstanding payment from all five
sources in one list:

- Grading payments
- Competition payments
- Seminar payments
- School fee payments
- Uniforms & guards purchases

Each row shows the same information regardless of type: a coloured type badge, student name,
reference, email and birth date, branch, amount and payment method, submitted date, the
Matched / Verified chips, the proof and other uploaded images, and any import error.

Controls on the card:

- **Type filter** — All, plus one chip per type with its own count.
- **Search** by name, reference or email across all types.
- **Sort** — the existing toggle: unmatched first or unverified first, newest/oldest.
- Overall counter badge in the header (total still waiting).

Actions stay exactly what each type supports today and open the same dialogs:
Re-match, Verify, Import as Invoice, Edit details, Reject. Automatic matching and automatic
import keep running unchanged for every type.

Nothing is removed from the Access grading list; the per-type tabs there stay as they are.

## Technical notes

- New `src/services/submissionApprovalSources.ts`: one adapter per type declaring
  `key`, `label`, `fetch(branchId)`, `findMatches`, `match`, `rememberSubject`, `verify`,
  `import`, `reject`, `editComponent`, and a `toRow()` mapper to a shared
  `UnifiedSubmissionRow` (id, type, name, reference, email, dob, branch, amount, method,
  status, matchedStudentId, submittedAt, images, importError). Adapters wrap the existing
  service functions — no service logic is rewritten.
- New `src/components/dashboard/UnifiedSubmissionApprovals.tsx`: runs the five queries in
  parallel with their existing query keys (so counts and invalidation keep working), merges
  and sorts with `sortSubmissionsByAction`, renders the shared row (desktop table, two-line
  cards below `lg`), and drives the shared match dialog plus each type's existing edit dialog.
- Auto-match and auto-import sweeps (`runAutoMatchSweep`, `runAutoImportSweep`) are invoked
  per adapter from the merged component, preserving per-scope attempt tracking.
- `SuperadminDashboard.tsx` swaps the four `Public*Approvals` imports for the new component.
  `PublicGuardsPurchaseApprovals` and the three payment approval components stay in the
  codebase for the branch dashboard / Access usages that still render them.
- No database changes.
