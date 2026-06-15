# Fix: Employees cannot submit claims

## Root cause (most likely)

The submit-claim pipeline itself is healthy (DB, RLS policies, partner RPC all correct, both employees have valid auth+employee records, and Seokjun successfully submitted on 10 Jun). What changed for Albert & Seokjun is the **receipt they're trying to upload**:

1. **File-type allow-list is too narrow.** `ReceiptUpload.tsx` and `FILE_UPLOAD_CONSTANTS.ALLOWED_DOCUMENT_TYPES` only accept `image/jpeg`, `image/png`, `application/pdf`. Modern phones save photos as:
   - iPhone → `image/heic` / `image/heif`
   - Android (some) → `image/webp`
   These get rejected with "Only JPG, PNG, and PDF files are allowed" before the upload even starts.
2. **5 MB hard cap.** Camera photos at default quality often exceed 5 MB, especially on newer iPhones — the user sees "File size must be less than 5MB" and assumes the system is broken.
3. **Silent error toasts.** Several `toast("...")` calls in `SubmitClaim.tsx` and `ReceiptUpload.tsx` pass a bare string. Depending on the sonner version this sometimes renders an empty / hard-to-read toast, so employees don't see the actual reason.

The DB/RLS layer is fine — verified:
- `claims` INSERT policy: `employee_id = get_current_employee_id() AND status='Pending'` — matches the regular submit flow.
- `claim-receipts` bucket has correct `INSERT/SELECT` policies scoped to `auth.uid()/...`.
- Both employees' `auth.users.email` match their `employees.email`, so `get_current_employee_id()` returns the right id.

## Changes

### 1. Receipt upload — accept more types, larger files, clearer errors
**Files:** `src/components/claim/ReceiptUpload.tsx`, `src/services/receiptUploadService.ts`, `src/config/constants.ts`

- Expand `ALLOWED_DOCUMENT_TYPES` to: `image/jpeg, image/png, image/jpg, image/webp, image/heic, image/heif, application/pdf`.
- Raise `MAX_FILE_SIZE` from 5 MB → **15 MB** (more realistic for phone photos; storage bucket has no server-side limit so this is the only gate).
- Update the helper text under the upload area to: "JPG, PNG, HEIC, WEBP, PDF (max 15 MB)".
- Keep `accept="image/*,.pdf"` on the hidden `<input>` (already permissive).

### 2. Surface real upload/submit errors
**Files:** `src/components/claim/ReceiptUpload.tsx`, `src/pages/SubmitClaim.tsx`

- Replace bare `toast("message")` with `toast.error("Receipt upload failed", { description: errorMsg })` / `toast.success(...)` so the underlying reason is always visible.
- In `handleSubmitClaim`, when the Supabase insert errors, include `error.message` in the toast description (currently swallowed into a generic "Error submitting claim").

### 3. Sanity check after the fix
- Ask the user to have Seokjun & Albert retry. If submission still fails, the toast will now show the exact Supabase error, which will point at either storage (path/policy) or `claims` insert (RLS) without further guesswork.

## Out of scope (intentionally not changing)

- RLS policies on `claims` and `storage.objects` — they're correct.
- The partner claim RPC flow — Albert & Seokjun are Full-Time Instructors, not partners.
- Auto-conversion of HEIC → JPEG in the browser — adds a heavy dependency; accepting HEIC and letting it upload as-is is sufficient (admins viewing in modern browsers/macOS/iOS can open HEIC; if Windows reviewers can't preview, we can revisit with a conversion step).

## Technical notes

- `FILE_UPLOAD_CONSTANTS.ALLOWED_DOCUMENT_TYPES` is `as const`; widening it is a one-line change.
- Storage bucket `claim-receipts` has `file_size_limit = NULL` and `allowed_mime_types = NULL`, so it accepts whatever the client uploads — no Supabase config change needed.
- No DB migration required.
