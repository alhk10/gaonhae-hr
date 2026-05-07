# Security Hardening — Final Pass

Buckets are already private and most RLS gaps were closed in the previous migration. This pass closes the remaining scanner findings, refactors UI to use signed URLs (so private buckets actually work), and tightens RPC exposure.

## Goal

Drive remaining `error`-level findings to zero and reduce `warn` findings to only those that require the Supabase Dashboard.

## Scope

### 1. Database / RLS migration

**Verify previous fixes landed** (re-query `pg_policies`); re-apply if missing:
- `published_pl_reports` writes → superadmin / branch finance only
- `student_class_enrollments` writes → branch staff / superadmin
- `student_scheduled_classes` all CRUD → branch staff / student-self for SELECT
- `letter_templates` writes → admin/superadmin
- `leave_encashment_config` / `leave_encashment_records` SELECT → owner or payroll admin
- `monday_holiday_leave_adjustments` SELECT → owner or payroll admin
- `grading_term_scorecard_columns` writes → superadmin (kept SELECT auth)
- `students` INSERT → fix `eia.branch_id = students.branch_id` bug
- `slot_booking_edit_requests` / `grading_deletion_requests` UPDATE → superadmin/admin only
- `invoice_action_requests` SELECT → requester, branch staff, or superadmin
- `claims` INSERT → already enforces `status='Pending'` ✓

**New tightening:**
- Tighten remaining `WITH CHECK true` INSERT policies that don't need it:
  - `inventory_orders` INSERT/UPDATE → require admin
  - `invoice_deletion_requests`, `payment_deletion_requests`, `invoice_discount_approvals` INSERT → require requester = current user / branch staff
  - `notice_payments` INSERT → require `student_id = current_student_id()` or branch staff
  - `superadmin_users` INSERT → drop `with_check true`, restrict to existing superadmin
- Fix three remaining functions missing `SET search_path`: `get_current_user_role`, `get_current_employee_id`, `has_admin_access`.
- Revoke `EXECUTE` on sensitive SECURITY DEFINER aggregation functions from `anon` and `authenticated`:
  - `get_eligible_employees_with_entitlements`, `calculate_unused_leave_for_encashment`, `process_leave_encashment`, `force_book_*`, `admin_reset_password`.

### 2. Storage URL refactor (signed URLs)

Buckets are already private. Existing components still call `getPublicUrl` on them, which returns dead links. Refactor to use the existing `resolveStorageUrl` helper (from `src/utils/storageUrl.ts`) which produces signed URLs.

Files to update:
- `src/components/dashboard/StudentDashboard.tsx` (passport photos)
- `src/components/dashboard/StudentProfileCompletionDialog.tsx`
- `src/components/notices/NoticePopupDialog.tsx`, `CreateEditNoticeDialog.tsx` (notice attachments)
- `src/components/sales/ViewEditPaymentDialog.tsx`, `CreatePaymentDialog.tsx` (payment proofs)
- `src/components/dashboard/PaySchoolFeesDialog.tsx`, `PayGradingDialog.tsx`, `SubmitClaimDialog.tsx`
- `src/components/claim/ClaimsManagementContent.tsx`, `AddClaimDialog.tsx`, `EmployeeClaimHistory.tsx`, `ClaimsApprovals.tsx`
- `src/services/noticeService.ts`, `claimsService.ts`, `documentService.ts`
- `src/pages/StudentRegistration.tsx`, `SubmitClaim.tsx`, `Claims.tsx`, `PayrollProcessing.tsx`

Pattern: replace `supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl` with `await resolveStorageUrl(bucket, path)` which returns a 1-hour signed URL for private buckets and the public URL otherwise.

### 3. Edge Function

`documents-ai-match` already had JWT auth added previously. Verify and additionally check the caller has access to the document (superadmin or branch access on the document's branch).

### 4. Security memory

Update `mem://security` (via `security--update_memory`) to record:
- All five sensitive buckets are private; UI must use `resolveStorageUrl`.
- `claims` INSERT enforces `Pending`; partner auto-approval only via `partner_create_approved_claim` RPC.
- Aggregation/admin RPCs are not directly callable by `authenticated`.
- Remaining warnings (Postgres upgrade, leaked-password protection, extension-in-public) require Dashboard action by the user.

### 5. Mark findings fixed / dashboard items

Mark `manage_security_finding` for items resolved; leave Dashboard-only items (Postgres upgrade, leaked-password protection, extension move) as open with a clear note for the user.

## Manual steps required (user action)

1. Supabase Dashboard → **Auth → Policies** → enable **Leaked Password Protection**.
2. Supabase Dashboard → **Settings → Infrastructure** → upgrade Postgres to latest.
3. Supabase Dashboard → **Database → Extensions** → move extensions from `public` to `extensions` schema.

## Out of scope

- Rewriting client-side role checks (informational finding; RLS is the real boundary).
- Penetration testing / integration tests for RLS.

## Deliverables

- 1 migration file (RLS fixes + REVOKEs + search_path fixes).
- ~15-20 frontend file edits switching to `resolveStorageUrl`.
- Updated security memory.
- Findings marked fixed where applicable.
