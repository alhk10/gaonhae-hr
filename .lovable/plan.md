# Auto-verify payments with a clean proof scan

## Goal
The Payment Verification queue on the superadmin dashboard only shows payments that actually need a human: proof screenshot mismatched the amount, scan couldn't read it, or no scan exists. Payments whose proof scan clearly matches are verified automatically and never appear in the queue.

## Why Javen Gan appeared
His parent paid $479.60 by PayNow via /hello and uploaded a screenshot. The proof scan read $479.60 (99% confidence, recipient GAONHAE TAEKWONDO LLP) — a clean match — but the payment still waited for manual verification. Under this change it would have been verified automatically.

## Changes

### 1. Database: auto-verify on clean scan (migration)
- Trigger on `payments`: when `proof_scan_status` becomes `'match'` (scan amount equals the expected amount), set `is_verified = true`, `verification_status = 'verified'`, `verified_by = 'auto_scan'`, `verified_at = now()`.
- Only fires for non-cash payments with a proof upload; never touches rejected rows.
- The existing payment→invoice status sync then moves the invoice to `verified` when fully paid and verified.

### 2. Backfill existing clean matches
- One-off update: all currently pending non-cash payments with `proof_scan_status = 'match'` get verified with `verified_by = 'auto_scan'` (this clears Javen Gan's INV-202609-0386 from the queue and marks his invoice Paid & Verified).

### 3. Queue stays as-is
- `PaymentVerificationApprovals.tsx` needs no change: auto-verified payments simply no longer match the pending filter. Mismatched, unreadable, and unscanned payments still appear for staff review with Edit / Reject / Verify.

## Safety
- Only exact-amount matches auto-verify; any mismatch, low readability, or missing scan stays manual.
- Auto-verified rows are distinguishable (`verified_by = 'auto_scan'`) so staff can audit them later.

## Verification
- Confirm Javen Gan's payment is verified and gone from the queue.
- Typecheck + build pass.
