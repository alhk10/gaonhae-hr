# Perth Comp registration log: add, edit, manual upload and matching

Applies to the password-protected **Registration log** on `/perthcomp` (Seminars and Competition tabs).

## What staff will see
- **Add entry** button at the top of the log. It opens a form with the same fields as the public form: name, gender, DOB, club, grade, email, phone, seminars, competition events and payment proof (upload or paste). Use it for paper forms and club collation sheets.
- **Edit** button on every row, next to Delete. It opens the same form with the saved details, so staff can fix names, DOB, grade, events or seminars, and replace the proof.
- **Manual match to Gaonhae student**: a student search inside the form (name, ID, DOB). Picking a student links the entry and applies the $40 rate; **Unlink** reverts to $45. Rows show a "Matched: STU…" badge, or "Not matched".
- **Upload / replace proof** on each row, without opening the full form. New proof is scanned and the "Amount matches / differs" badge updates.
- Totals are recalculated on every save from the rate and number of seminars/events. Seat limits and event rules still apply, with a warning that staff can confirm past when an event is full.

## Rules kept
- The log password is still needed for every add, edit, upload and match. The server checks it each time.
- Every add, edit and match change is written to the existing staff log.
- Duplicate check: the same name and DOB cannot be added twice. Staff are told to edit the existing entry instead.

## Technical details
- New SECURITY DEFINER RPCs, all checking the log password:
  - `admin_perth_upsert_registration(p_password, p_id null|uuid, payload jsonb)` validates seminars/events, eligibility and caps (with `p_override_cap`), recomputes unit_price/total from `student_id`, and inserts or updates `perth_event_registrations`.
  - `admin_perth_set_student_match(p_password, p_id, p_student_id null)`.
  - `admin_perth_set_proof(p_password, p_id, p_proof_url)` then calls the existing `record_perth_proof_scan` flow.
  - `admin_perth_search_students(p_password, p_query)` returns id, name, DOB, belt and branch only.
- Proof uploads use the existing Perth proof storage path, with unique filenames.
- UI: new `PerthRegistrationEditDialog` in `PublicPerthComp.tsx`, reusing the public form's field components and the app-wide paste-to-upload.
- Dates shown as DD/MM/YYYY.
