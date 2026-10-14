# Add delete icon to Perth seminar and competition logs

## Goal
Staff unlocked the `/perthcomp` registration log (discreet lock icon, password `Hp97533488`) can delete a wrong or duplicate registration from both the Seminars tab and the Competition tab. A person row gets a red trash icon that asks for confirmation, then removes the row.

## Changes

### 1. Database migration
Add `public.delete_perth_event_registration(p_password text, p_id uuid)`:
- SECURITY DEFINER, returns boolean (true if a row was deleted).
- Validates the password with the same SHA-256 digest check used by `get_perth_event_log`; raises "Invalid password" otherwise.
- Deletes from `perth_event_registrations` by id; capacity counts treat deleted rows as gone automatically, so freed slots become available again.
- `REVOKE ALL ... FROM PUBLIC`, then `GRANT EXECUTE ... TO anon, authenticated, service_role` (the log is reached via password, no session).

### 2. Log dialog UI — `src/pages/public/PublicPerthComp.tsx`
- Import `Trash2` from lucide-react.
- In `personLine`, add a red trash icon button next to the existing proof/details line (title "Delete registration").
- On click: confirm via `window.confirm` naming the person, call the new RPC with the password entered at unlock, then:
  - success → remove the row from local `rows` state (counts, sections, groups and PDFs update from the same state) and show a confirmation toast;
  - error → error toast.
- Rows appear in both tabs when a person has both seminars and competition events; deleting the row removes it everywhere, which is correct since one registration = one row.
- Keep the PDF export behaviour unchanged — deleted people simply no longer appear.

## Verification
- Build passes; migration applies cleanly.
- Playwright: unlock the log with the password, confirm a delete icon renders on seminar and competition rows, and confirm the confirmation prompt appears.

## Technical notes
- Deletion is permanent and cannot be undone by staff; the confirm dialog states this.
- No change to the public registration form or student flows.
