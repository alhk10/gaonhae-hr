## Goal

In the Public Grading List (edit mode), for submission rows with `pending_verification`:
1. Show payment proof as a clickable thumbnail (click to enlarge in a lightbox dialog).
2. Remove the inline external-link button for proof.
3. Add an inline **Verify** button that marks the submission as paid and verified (status → `verified`), and a **Reject** button.

After verification, the submission still appears in the Superadmin/Branch dashboard approvals so an admin can match it to a student and issue the invoice from there.

## Scope

- Frontend changes in `src/pages/public/PublicGradingList.tsx` (thumbnail, lightbox, Verify/Reject buttons, remove old proof link).
- Frontend changes in `src/components/dashboard/PublicGradingSubmissionApprovals.tsx` to show **verified-but-not-imported** submissions in addition to `pending_verification`.
- Service updates in `src/services/gradingPaymentSubmissionService.ts`:
  - New `verifyGradingSubmission(id, verifiedBy)` RPC wrapper that sets status to `verified` (no invoice yet).
  - Update `getPendingGradingSubmissions` and `getPendingGradingSubmissionsCount` to include rows where `status IN ('pending_verification','verified')` AND `matched_invoice_id IS NULL` (i.e. not yet imported).
- DB migration: add a new `admin_verify_grading_submission(p_id, p_verified_by)` SECURITY DEFINER RPC that sets `status='verified'`, `verified_by`, `verified_at`. Keep existing `admin_import_grading_submission` unchanged (it remains the action that creates the invoice).

## UX flow

```text
[Public Grading List]                      [Dashboard Approvals card]
  pending_verification row                    shows pending + verified
    [thumbnail] [Verify] [Reject]               (not-yet-imported)
        |          |
        |          v
        |   status -> verified                  status badge: Verified
        |   row stays visible in list           [Match student] -> [Import]
        |                                         creates invoice + payment
        v                                         status -> imported
    click thumbnail -> lightbox dialog            row disappears
```

## Changes — PublicGradingList.tsx

- **Proof cell**: replace the `<a>` + `ExternalLink` icon with a small `SignedImage` thumbnail (`h-8 w-8 object-cover rounded border cursor-zoom-in`). Clicking opens a lightbox `<Dialog>` showing the full-size resolved image. Fallback to a muted `—` if no proof.
- **Remove** the existing inline external-link proof button entirely.
- **Action cells** (only for `r.source === 'submission'` and `r.paid_status === 'pending_verification'`):
  - Add green check icon button → confirms then calls `verifyGradingSubmission(submission_id, verifiedBy)`. Toast on success, invalidates list query.
  - Add red X icon button → opens reject-reason dialog → `rejectGradingSubmission(submission_id, reason, verifiedBy)`.
- Keep the existing edit-slot and delete buttons.
- Add a single `lightboxUrl` state for the enlarged-image dialog (max-w-3xl, image fills width).
- `verifiedBy` from `useAuth()` → `user?.employeeId || user?.email || 'system'`.

## Changes — PublicGradingSubmissionApprovals.tsx

- Update query/filter so it shows submissions where `status` is `pending_verification` OR (`status` = `verified` AND `matched_invoice_id` IS NULL).
- Show a status badge per row: `Pending` (amber) or `Verified` (green). For `Verified` rows, the **Verify & Import** button label becomes **Import as Invoice** (same handler — it requires a matched student).
- "Match Student" + "Import" actions remain unchanged. Reject still available.

## Changes — gradingPaymentSubmissionService.ts

- Add `verifyGradingSubmission(id, verifiedBy)` calling `admin_verify_grading_submission` RPC.
- `getPendingGradingSubmissions(branchId?)`: change the filter from `.eq('status','pending_verification')` to `.in('status', ['pending_verification','verified'])` plus `.is('matched_invoice_id', null)`.
- `getPendingGradingSubmissionsCount(branchId?)`: same filter change.

## Changes — DB migration

```sql
create or replace function public.admin_verify_grading_submission(
  p_id uuid,
  p_verified_by text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.grading_payment_submissions
     set status = 'verified',
         verified_by = p_verified_by,
         verified_at = now()
   where id = p_id
     and status = 'pending_verification';
  if not found then
    raise exception 'Submission % not pending verification', p_id;
  end if;
end;
$$;

grant execute on function public.admin_verify_grading_submission(uuid, text) to authenticated;
```

(Assumes `verified_by` and `verified_at` columns already exist on `grading_payment_submissions`; if not, add them in the same migration.)

## Acceptance

- Pending row in Public Grading List shows a clickable proof thumbnail and inline Verify / Reject buttons; the old external-link icon is gone.
- Clicking the thumbnail enlarges the image in a dialog.
- Clicking Verify flips status to `verified`; the row still surfaces in both Superadmin and Branch dashboard approval cards (with a "Verified" badge) until it is matched to a student and imported as an invoice.
- Existing Match + Import flow continues to be the only path that creates the invoice.
