

## Plan: Fix All Security Issues

This plan addresses all 6 agent security findings and the relevant Supabase linter findings while preserving all existing functionality.

### Summary of Issues & Fixes

---

### 1. Remove Hardcoded PII/Salary Data (ERROR - `INFO_LEAKAGE`)

**Files:** `src/services/authOptimizationService.ts`, `src/services/authSessionService.ts`

Remove `STATIC_FALLBACKS`, `EMAIL_TO_EMPLOYEE_ID`, and `STATIC_EMPLOYEE_FALLBACKS` maps that contain real employee names, salaries, emails, and superadmin flags. Replace with empty maps. The fallback logic flow (database → cache → static) remains, but static will simply return `null`, falling through to the extended database query which already exists as Fallback 4.

Also remove `DebugAuthPanel.tsx` which hardcodes a superadmin email (`alhk10@gmail.com`) in the UI. It's not imported anywhere, so deletion is safe.

---

### 2. Add JWT Auth to Edge Functions (ERROR - `OPEN_ENDPOINTS`)

**Files:** `supabase/functions/send-payslip-email/index.ts`, `supabase/functions/push-notification/index.ts`, `supabase/functions/send-approval-email/index.ts`, `supabase/functions/send-invoice-email/index.ts`

For **application-level functions** (`send-payslip-email`, `send-approval-email`, `send-invoice-email`):
- Add JWT validation using `getClaims()` at the top of each handler
- Create a Supabase client with the caller's auth header
- Return 401 if no valid token

For **push-notification**: Since it's called both by clients AND by cron functions (which use the service role key), add auth that accepts either a valid user JWT or the service role key. Check the Authorization header, create client, call `getClaims()` — service role key will also pass since it's a valid JWT.

**Cron functions** (`check-clock-reminders`, etc.) already use `Authorization: Bearer ${supabaseServiceKey}` when calling push-notification, so they'll continue to work.

Config stays `verify_jwt = false` as required by the signing-keys pattern.

---

### 3. HTML Escaping in Email Templates (ERROR - `email_html_injection`)

**Files:** All 4 edge functions above + `send-approval-email`, `send-invoice-email`

Add an `escapeHtml()` helper to each edge function and wrap all user-supplied values (`employeeName`, `month`, `recipientName`, `reviewerName`, `reviewNotes`, `changesDescription`, `studentName`, `invoiceNumber`) with it before HTML interpolation.

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

---

### 4. Fix `active_employees` View (ERROR - `PUBLIC_DATA_EXPOSURE` + Supabase `SUPA_security_definer_view`)

**Database migration:** Recreate the view with `security_invoker = true`:

```sql
DROP VIEW IF EXISTS public.active_employees;
CREATE VIEW public.active_employees
WITH (security_invoker = true) AS
SELECT id, name, nric, date_of_birth, residency_status, type, position, department,
       email, phone, join_date, resign_date, base_salary, bank_name, bank_account_number,
       qualifications, created_at, updated_at, emergency_contact, emergency_phone,
       nationality, gender, address, postal_code
FROM public.employees
WHERE resign_date IS NULL OR resign_date > CURRENT_DATE;
```

This ensures the view respects RLS policies of the calling user.

---

### 5. Restrict Sensitive RPC Functions (WARN - `DEFINER_OR_RPC_BYPASS`)

**Database migration:** Revoke direct client execute permissions on data-aggregation functions that shouldn't be called directly:

```sql
REVOKE EXECUTE ON FUNCTION public.get_eligible_employees_with_entitlements FROM anon;
REVOKE EXECUTE ON FUNCTION public.force_book_ryan_slots FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.force_book_eldon_slots FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_password FROM anon;
```

The `force_book_*` functions are one-off admin utilities that should not be callable from the client at all.

---

### 6. Storage Buckets (WARN - `STORAGE_EXPOSURE`) — Informational Only

Making buckets private requires updating all file-access code to use signed URLs. This is a medium-effort change that could break file display throughout the app. I recommend addressing this separately to avoid disrupting functionality. Will note this as a follow-up.

---

### Files Modified

| File | Change |
|------|--------|
| `src/services/authOptimizationService.ts` | Remove static PII fallback maps |
| `src/services/authSessionService.ts` | Remove static employee fallback map |
| `src/components/DebugAuthPanel.tsx` | Delete file |
| `supabase/functions/send-payslip-email/index.ts` | Add JWT auth + HTML escaping |
| `supabase/functions/push-notification/index.ts` | Add JWT auth |
| `supabase/functions/send-approval-email/index.ts` | Add JWT auth + HTML escaping |
| `supabase/functions/send-invoice-email/index.ts` | Add JWT auth + HTML escaping |
| Database migration | Fix `active_employees` view + revoke sensitive RPCs |

### Preserved Functionality
- All email sending works (just requires authenticated callers, which the app already provides via `supabase.functions.invoke()`)
- Cron functions continue to call push-notification with service role key
- Auth fallback chain still works (database → cache → extended query), just without hardcoded PII
- All UI role checks remain for UX purposes

