# Summary approvals: act directly on the row

## What changes
In `/access` Summary → Approvals & verifications, each row stops sending staff to another tab. Instead each row shows everything needed to decide, with Verify and Reject on the row itself.

Each row shows:
- Date/time, type badge, branch, amount (with S$/A$ currency)
- **Student name** — clickable, opens the student details dialog (same one used in Attendance/Students)
- **Invoice number** (when linked) — clickable, opens the invoice details dialog
- Supporting details per type: items/term/class (school fees), grading slot + date + belt (grading), event + categories (competition/seminar), items + sizes (guards), scanned amount vs amount due and match status
- Supporting documents as small thumbnails: payment proof(s), passport photo / grading card / certificates where present; click to enlarge
- **Verify** and **Reject** buttons (Reject asks for a reason)

Rules kept as today:
- Buttons only appear when the password is allowed to approve (`canApprove`); others see details only
- Verify/Reject call the same existing actions each tab uses now (same matching checks, grading-card reminder dialog, auto-invoice behaviour, shortage handling)
- New student / detail-change rows keep their existing approve/reject section
- After an action the row disappears and counts refresh

Mobile: rows wrap into 2–3 lines (name/type, details/thumbnails, buttons).

## Technical details
- `SummaryTab.tsx`: keep raw source row on each `ApprovalItem`; new `ApprovalRow` component renders details + thumbnails and buttons.
- Reuse existing per-tab verify/reject service functions (school fees, grading, competition, seminar, guards) and the grading-card reminder dialog; invalidate the matching queries afterwards.
- Reuse existing student profile dialog and `InvoiceDetailDialog`; resolve invoice id from the row's invoice reference.
- Proof images via existing signed-URL helpers used in each tab.
