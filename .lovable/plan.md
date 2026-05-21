# Investigation + Multi-Term Booking on /hello

## 1. Why Kayden has no Term 3 2026 invoice

Kayden Hii (Morley) has these invoices:

| Invoice | Status | Line items | Item term_id |
|---|---|---|---|
| INV-2026-00249 | verified | Blue >> Red Tip grading, **Unlimited** | Term 2 (93c68375…) |
| INV-2026-00257 | verified | Poomsae Seminar | — |
| INV-2026-00266 | verified | Kyorugi Seminar | — |
| INV-2026-00298 | verified | South West Open, National Athlete License, **Competition Class** | Term 3 (53974447…) |

So the only "regular term" lesson invoice is **Unlimited tagged to Term 2 2026**. No Unlimited / regular lesson invoice exists for Term 3 2026 — confirming the user's report.

However the `entitlements` row created from that Term 2 Unlimited line was inserted with `valid_from = 2026-07-13` and `valid_to = 2026-09-18` — those are **Term 3 dates**, not Term 2 (Term 2 = 28/04 → 03/07). That is why `/hello` resolves Kayden's "active term" to Term 3 even though no invoice was issued for it.

Root cause: at invoice creation/edit time, the entitlement's `valid_from/valid_to` was written from a different term than the metadata.term_id currently stored on the line item. The entitlement-creation code (`invoiceService.ts` ~L575-606) reads `term_id` → looks up `term_calendars` once at insert; later term-edits on the invoice item don't propagate to the entitlement (memory only notes "changing a line item's term clears class slots"). The item's term_id was almost certainly later changed from Term 3 → Term 2, leaving a Term-3-windowed entitlement orphaned.

Action: surface this to the user and let them decide. Two clean fixes:
- (a) Re-issue an actual Term 3 2026 Unlimited invoice for Kayden, then delete the orphaned Term 3 entitlement so it gets recreated correctly from the new invoice; **or**
- (b) Correct the existing item's metadata.term_id back to Term 3 (if Term 2 was the mistake) — entitlement already matches Term 3.

I will not run either repair until you confirm which is correct.

Going forward I'll also add a safeguard: when a paid invoice item's `metadata.term_id` is changed, re-sync the linked entitlement's `valid_from`/`valid_to` to the new term (mirroring the existing "clear class slots" behavior).

## 2. Show current + future invoiced terms when scheduling / rescheduling

Today `/hello` resolves a **single** term via `_resolve_public_student_term` (active enrollment first, else any active entitlement) and the booking UI is hard-bound to that one term.

Change: let the student pick among **all terms they have a paid / active invoice-derived entitlement for**, starting from "current" (today inside the term window or most-recent past) and including every future invoiced term, in chronological order.

### Backend (new RPC)

- New `get_public_student_invoiced_terms(p_session_id, p_student_id)` SECURITY DEFINER returning rows of `{term_id, term_name, start_date, end_date, class_type, is_unlimited, sessions_total, sessions_remaining, is_current}` derived from:
  - active `entitlements` for the student, scoped to their branch, joined to `term_calendars` where the term overlaps `entitlement.valid_from/valid_to`;
  - dedup by `term_id`; flag the one containing `CURRENT_DATE` (or, if none, the next upcoming) as `is_current = true`;
  - ordered by `start_date` ascending, starting from the current term.
- Reuse the same session-validation guard as the other public RPCs.
- Update `get_public_student_term_context` / `get_public_student_term_bookings` / `get_public_term_slot_capacities` to accept an **explicit `p_term_id`** (optional) and only fall back to the auto-resolver when omitted. No behavior change when omitted.

### Frontend (`PublicHelloChat.tsx` + `publicChatService.ts`)

- After match, fetch `get_public_student_invoiced_terms`. Default selection = the `is_current` row.
- Render a compact term switcher above the calendar: horizontally scrollable chips like `Term 2 2026 · current` / `Term 3 2026` / `Term 4 2026`, ordered current → future. Hidden when only one term exists (current behavior preserved).
- Selected term drives the existing `termCtx`, holidays, bookings, capacity queries (all keyed by `selectedTermId`).
- "Remarks (optional)" + 2-row textarea already in place — no change.
- Empty / error states unchanged; if the new RPC returns no rows, fall back to today's auto-resolved single term so Kayden still sees Term 3 until his invoicing is reconciled.

### Files touched
- New Supabase migration: add `get_public_student_invoiced_terms`; add optional `p_term_id` to the 3 existing public RPCs; (optional) trigger to re-sync entitlement validity when `invoice_items.metadata->>'term_id'` changes on a paid invoice.
- `src/services/publicChatService.ts`: add `getInvoicedTerms(sessionId, studentId)` + pass `termId` through to existing helpers.
- `src/pages/public/PublicHelloChat.tsx`: add `selectedTermId` state, term-chip switcher, thread it through all term-dependent queries.

No changes to other dashboards or to `/pay`.
