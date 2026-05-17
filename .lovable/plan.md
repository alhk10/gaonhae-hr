## Plan: Admin edit mode on /grading-list

Add a small discrete unlock button (top-right of page) that prompts for a password. Correct password `Hp97533488` enables an in-memory "edit mode" for the session (no persistence). When edit mode is on, the list reveals extra info and inline admin controls.

### 1. UI — unlock toggle (`PublicGradingList.tsx`)
- Top-right: tiny ghost icon button (Lock / Unlock from lucide-react), `text-muted-foreground`, no label.
- On click: shadcn `Dialog` with single password input + Unlock button.
- Compare against hard-coded constant `ADMIN_UNLOCK_PASSWORD = 'Hp97533488'`. On match, set `editMode = true` (React state only, lost on refresh). Wrong → toast error.
- Once unlocked, icon switches to Unlock + small "Edit" label; clicking again locks.

Acceptable: password is in client bundle. This page is public/staff-facing convenience, not a security boundary. (Note this trade-off to user.)

### 2. List row — extra columns when edit mode is on
For each row (single-line layout), append on the right (before/after status badge):
- **Amount** — `$amount` (from submission row, registrations show `—`).
- **Proof** — small link/eye icon → opens `proof_url` in new tab.
- **Update slot** — pencil icon → opens dialog with `Select` of all upcoming grading slots (date · time · branch). Save calls update RPC.
- **Delete** — trash icon (red) → confirm dialog → delete RPC.

Only `source = 'submission'` rows get Delete / Update-slot / Amount / Proof. Registration rows show "—" for those columns.

### 3. Data — extend `get_public_grading_list` RPC
Current RPC doesn't return `id`, `amount`, or `proof_url`. Migration to update the function so submission rows include:
- `id uuid` (the `grading_payment_submissions.id`)
- `amount numeric`
- `proof_url text`

(Registration rows return `null` for those three.)
Update `PublicGradingListRow` TS interface accordingly.

### 4. Data — slot list for "Update slot"
Reuse existing `getPublicGradingSlots` (already returns upcoming slots with branch/date/time). Dialog Select uses those.

### 5. New RPCs (SECURITY DEFINER, public-callable)
- `admin_update_grading_submission_slot(p_id uuid, p_slot_id uuid)` — updates `grading_payment_submissions.resolved_grading_slot_id`. No auth check (page is public; password gate is client-side only).
- `admin_delete_grading_submission(p_id uuid)` — deletes the row from `grading_payment_submissions`.

Wired through new helpers in `gradingPaymentSubmissionService.ts`:
- `adminUpdateGradingSubmissionSlot(id, slotId)`
- `adminDeleteGradingSubmission(id)`

After mutation, invalidate the `['public-grading-list']` react-query key.

### Security note to surface to user
Hard-coded password in client JS + open RPCs = security through obscurity. Anyone who reads the page source can read the password and call the RPCs. If real protection is wanted later, move these mutations behind an authenticated edge function or staff session. Acknowledged for now per request.

### Out of scope
- Editing other fields (name, belt, amount value).
- Audit log.
- Server-side enforcement of password.