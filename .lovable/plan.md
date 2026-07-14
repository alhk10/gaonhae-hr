## Problem

Uploading grading cards on the Competitions tab fails with `new row violates row-level security policy`. The recent security migration restricted `payment-proofs` INSERT to admins only, but the staff member uploading grading cards doesn't pass `check_employee_admin_access()`.

## Fix (two parts)

### 1. Frontend password gate

Before the existing "Upload grading card" dialog performs its upload, require the operator to enter one of two shared unlock passwords:

- `Hp84311884`
- `Hp97533488`

Behavior in `src/components/grading-list/GradingCardUploadDialog.tsx`:

- Add a small password `<Input type="password">` inside the dialog (above Add files).
- The **Upload** / **Upload & Verify** button stays disabled until the entered value exactly matches one of the two allowed passwords (client-side check).
- Once a matching password is entered, unlock the button; on submit, proceed with the current `adminUploadCompetitionGradingCards(...)` flow.
- Wrong password → inline error, no upload attempted.
- Passwords are hard-coded constants in that component (matches the user's request; no backend involvement).

No other dialogs are changed — this gate is scoped to the grading-card upload dialog only.

### 2. Backend: let the upload actually succeed

The password gate alone won't help while the storage RLS still blocks the INSERT. Relax `payment-proofs` INSERT so the write goes through, keeping reads admin-only (files are always served via signed URLs).

New migration adjusting `storage.objects` policies for bucket `payment-proofs`:

- **INSERT**: allow `anon` + `authenticated` (this also restores public grading/seminar/guards/chat payment proofs and student-portal proof uploads that the previous migration broke).
- **SELECT**: unchanged — superadmin or `check_employee_admin_access()` only.
- **UPDATE**: admins only (unchanged).
- **DELETE**: superadmin only (unchanged).

Other buckets touched by the last security migration (`documents`, `receipts`) stay as-is; only `payment-proofs` has non-admin writers.

## Verification

1. Open the Competitions tab, click Upload grading card for the failing row.
2. Try upload with an empty/wrong password → button disabled / error, no request sent.
3. Enter `Hp84311884` (or `Hp97533488`) → button enables, upload succeeds, `grading_card_urls` updates.
4. Confirm public payment portals and student-portal proof uploads still work (same bucket).
5. Confirm admins can still view proofs via signed URLs.

## Not in scope

- Rotating or storing these two passwords in the DB / secrets — kept as client-side constants per request.
- Any change to who can *see* proofs.
- Any other security-finding rework.