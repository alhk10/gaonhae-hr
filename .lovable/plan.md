
# Finish security scan fixes

The first migration already handled the critical RLS issues (branch P&L, failed logins, scheduled classes, leave encashment, weekly slot config, P&L categories, system allowances/deductions, superadmin enumeration, employee_page_access, documents null-branch, invoice_action_requests, and the invoice WITH CHECK bug).

This plan covers everything still open from the scan.

## 1. Cron edge functions — add `CRON_SECRET` guard

Add `CRON_SECRET` as a runtime secret (you'll be prompted for a value — use any long random string).

Add this guard at the top of each of the 5 cron functions:
- `check-clock-reminders`
- `check-slot-reminders`
- `check-booking-reminders`
- `check-outstanding-fees`
- `check-grading-reminders`

```ts
const expected = Deno.env.get('CRON_SECRET');
const provided = req.headers.get('x-cron-secret');
if (!expected || provided !== expected) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

After deploy, update the existing `pg_cron` jobs that call these endpoints to include `"x-cron-secret": "<your-value>"` in the headers JSON. I'll generate the SQL for you to run in the SQL Editor (it can't go in a migration because it contains the secret value).

## 2. Email HTML escaping

`send-payslip-email` already escapes. Add the same `escapeHtml()` helper and wrap user-supplied strings in:
- `send-approval-email` — `recipientName`, `reviewerName`, `changesDescription`, `reviewNotes`
- `send-invoice-email` — `studentName`, `invoiceNumber`

## 3. Storage buckets — make sensitive ones private

Switch these buckets to `public = false` and update app code to fetch via signed URLs:
- `claim-receipts`
- `student-photos`
- `payment-proofs`
- `receipts`
- `notice-attachments`

Leave `invoice-qr-codes`, `education-files`, `social-media`, `social-caricatures`, `student-signatures`, `documents` as-is (documents is already private; signatures/social are intentionally public-readable).

For each affected bucket, replace `getPublicUrl(...)` calls with `createSignedUrl(path, 3600)` in the relevant services (claims, student photos, payments, notices).

## 4. Client-side fixes

- **Remove static PII fallbacks** — delete `STATIC_FALLBACKS` from `src/services/authOptimizationService.ts` and `STATIC_EMPLOYEE_FALLBACKS` from `src/services/authSessionService.ts`. Replace with empty maps and rely on Supabase queries (the existing fallback path will simply return `null` and the UI will show its loading/error state).
- **Replace `Math.random()` password generators** with `crypto.getRandomValues()` in:
  - `src/services/studentAuthProvisioningService.ts`
  - `src/services/bulkUserCreationService.ts`

## 5. Remaining warn-level RLS tightening

Add a focused migration:
- **`has_sales_access()`** — change from checking `can_view_dashboard` to checking a more specific flag. Simplest safe fix: only return true for superadmin (the dashboard view permission was being overloaded for financial writes). Branch staff that need invoice/credit access already get it through their dedicated `employee_invoice_access` policies.
- **`cctv_camera_secrets`** — add an explicit superadmin-only RLS policy so the no-policy lint clears (current behavior already denies, but being explicit silences the warning and documents intent).

## 6. Items intentionally NOT fixed (need your decision)

These were flagged but require product decisions before changing:

- **Realtime channel authorization** (`realtime.messages` RLS) — requires designing a topic-naming convention and is a larger architectural change.
- **Supabase Postgres version upgrade** and **leaked password protection** — Supabase dashboard toggles you control directly.
- **Extension in public schema** — moving extensions can break dependent code; usually left as-is.
- **`student_registrations` anon insert** — public registration form is intentional. Could add a captcha later if abuse appears.
- **`password_history` client SELECT** — would need to move password rotation logic into a SECURITY DEFINER RPC; non-trivial refactor.
- **Client-side role checks** — informational; RLS already enforces real security.

I'll list these in the final summary so you can address them when ready.

## Order of execution

1. Add `CRON_SECRET` (you'll be prompted).
2. Edit the 5 cron functions + 2 email functions (auto-deploys).
3. Edit the 4 client-side service files.
4. Migration: `has_sales_access` fix + `cctv_camera_secrets` policy + bucket privacy flips (`UPDATE storage.buckets SET public = false WHERE id IN (...)`).
5. Update services that read from those buckets to use signed URLs.
6. Output the SQL snippet you need to paste into the SQL Editor to update the existing cron job headers with the new secret.
