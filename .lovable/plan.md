# /grading-list — full-unlock deletes, confirmation dialog, auto-lock

Route: `/grading-list` → `src/pages/public/PublicGradingList.tsx` with 3 tabs (Grading, Competitions, Guards). Full unlock granted by password `Hp84311884` (already implemented as `unlockLevel === 'full'`, exposed as `canDelete`).

## 1. Delete row in every tab (only when fully unlocked with Hp84311884)

### Confirmation dialog (shared shape)
A single confirmation dialog is shown before any delete in any tab. It surfaces two critical pieces of context derived from the row before the user confirms:

- **Student match** — "Linked to student: <NAME>" when `matched_student_id` (or `student_id` for grading registrations) is set, otherwise "No matched student".
- **Invoice created** — "Invoice already created: <INVOICE_NUMBER>" when `matched_invoice_id` / `invoice_id` is set, otherwise "No invoice created yet".

When an invoice exists, the dialog shows a prominent warning ("Deleting this row will NOT delete the linked invoice — handle the invoice separately in Sales") and the Delete button stays enabled (the user explicitly chose full-unlock mode).

The dialog uses shadcn `AlertDialog` with `AlertDialogCancel` and a destructive `AlertDialogAction`. While the delete RPC is in flight the action shows a spinner and is disabled.

Implementation: a shared `<DeleteRowConfirmDialog>` component local to `PublicGradingList.tsx` takes `{ open, onOpenChange, title, studentName, studentMatched, invoiceNumber, busy, onConfirm }`. Each tab passes the relevant row's fields.

### Grading tab
- Extend the trash icon to render for both `submission` and `registration` rows when `canDelete`.
- Add service `adminDeleteGradingRegistration(id)` calling RPC `admin_delete_grading_registration(p_id uuid)`.
- `confirmDeleteRow` state already exists; reuse it. Look up linked invoice number via the row's `matched_invoice_id` (submission) or `invoice_id` (registration). If the row already carries the invoice number, use it; otherwise fetch it once on dialog open with a small `useQuery` (`select invoice_number from invoices where id = ?`).
- On confirm branch on `source`:
  - submission → `adminDeleteGradingSubmission`
  - registration → `adminDeleteGradingRegistration`

### Competitions tab (`CompetitionsTab`)
- Accept `canDelete` prop from parent.
- Append actions column with the trash icon when `canDelete`.
- Add service `adminDeleteCompetitionSubmission(id)` → RPC `admin_delete_competition_submission(p_id uuid)`.
- Reuse `<DeleteRowConfirmDialog>` with the row's `student_name`, `matched_student_id`, and `matched_invoice_id` → resolve invoice number with the same small lookup.
- On success: invalidate `['public-competition-list']`.

### Guards tab (`PublicGuardsPurchaseList` used embedded)
- Add optional `embedded?: boolean` and `canDelete?: boolean` props.
  - When `embedded`, skip the internal password gate and the internal Lock button; rely on parent's unlock.
  - Standalone derives `canDelete` from `sessionStorage.getItem('guards_list_unlock_level_v1') === 'full'`.
- Add trash column shown only when `canDelete`.
- Add service `adminDeleteGuardsPurchase(id)` → RPC `admin_delete_guards_purchase(p_id uuid)`.
- Reuse the same confirm dialog, passing `matched_student_id` and `invoice_id` (with invoice number lookup if needed).
- On success: invalidate `['guards-purchases']`.

## 2. Remove Lock button + auto-lock after 15 min

- Remove the header `Lock/Unlock` button block in `PublicGradingList.tsx` (lines ~1068–1075).
- Remove the embedded Lock button in `PublicGuardsPurchaseList.tsx` header (lines ~148–150) when standalone; when embedded the header is already hidden.
- Shared 15-minute idle auto-lock effect:
  - When `unlockLevel !== 'none'`, start a 15-minute timer.
  - Listeners on `mousemove`, `keydown`, `touchstart`, `click` reset the timer.
  - On expiry → call existing `handleLock()` (clears sessionStorage + state) and `toast.info('Auto-locked after 15 minutes of inactivity')`.
  - Mirror the same effect in standalone `PublicGuardsPurchaseList.tsx`.

## 3. Database — three SECURITY DEFINER RPCs

Mirrors existing `admin_delete_grading_submission`:

```sql
create or replace function public.admin_delete_grading_registration(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.grading_registrations where id = p_id;
end; $$;
grant execute on function public.admin_delete_grading_registration(uuid) to anon, authenticated;

create or replace function public.admin_delete_competition_submission(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.competition_payment_submissions where id = p_id;
end; $$;
grant execute on function public.admin_delete_competition_submission(uuid) to anon, authenticated;

create or replace function public.admin_delete_guards_purchase(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.guards_purchases where id = p_id;
end; $$;
grant execute on function public.admin_delete_guards_purchase(uuid) to anon, authenticated;
```

Note: deletes only remove the source row. The linked invoice (if any) is intentionally left untouched and must be handled separately — surfaced by the confirmation dialog warning.

## Files touched

- `supabase/migrations/<new>.sql` — three delete RPCs
- `src/services/gradingPaymentSubmissionService.ts` — `adminDeleteGradingRegistration`
- `src/services/competitionPaymentSubmissionService.ts` — `adminDeleteCompetitionSubmission`
- `src/services/guardsPurchaseService.ts` — `adminDeleteGuardsPurchase`
- `src/pages/public/PublicGradingList.tsx` — shared `<DeleteRowConfirmDialog>`, broaden delete to registrations, add Competitions delete column, pass `canDelete` to Guards tab, remove Lock button, add 15-min idle auto-lock
- `src/pages/public/PublicGuardsPurchaseList.tsx` — `embedded`/`canDelete` props, delete column with confirm dialog, remove Lock button, standalone keeps its own auto-lock
