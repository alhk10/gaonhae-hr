# Remember alternate emails when matching submissions

## Goal

When a submission (grading, competition, event/seminar, school fees, uniforms & guards) is matched to a student whose email differs from the one used on the form, keep both emails on the student record. Future submissions sent from either address then match automatically.

## Behaviour

- Matching a submission to a student saves the submission's email onto the student as an extra known email, when it is a valid, non-empty address that is not already the student's main email or an existing extra email.
- The student's main email is never overwritten; extras are additional addresses only.
- Matching suggestions treat a hit on any known email (main or extra) exactly like a main-email hit today, so the confidence score and the "email match" reason stay the same.
- The result: a parent paying from a second address gets auto-matched at the usual confidence threshold on the next submission.

## Technical details

Database migration:

1. `ALTER TABLE public.students ADD COLUMN alt_emails text[] NOT NULL DEFAULT '{}'` (no grant/RLS changes needed — existing table).
2. Helper `public._student_email_matches(p_student_id uuid, p_email text) returns boolean` — or, simpler, inline the check — comparing `lower(email)` against `lower(s.email)` and `lower(x) for x in s.alt_emails`.
3. Helper `public._remember_student_email(p_student_id uuid, p_email text)` (SECURITY DEFINER, `search_path = public`): trims/lowercases, ignores null/empty/invalid values and any address already known, otherwise appends to `alt_emails`.
4. Update the match RPCs to call the helper with the submission's email after setting `matched_student_id`:
   - `admin_match_grading_submission`
   - `admin_match_competition_submission`
   - `admin_match_seminar_submission`
   - `admin_match_school_fees_submission`
   - the guards purchase match/finalize RPC (`admin_match_*`/finalize used by `guardsPurchaseService`)
   - the import-as-new-student paths do not need it (the student is created with that email).
5. Update the scorers so `email_match` becomes
   `lower(coalesce(sub.email,'')) <> '' AND (lower(coalesce(s.email,'')) = lower(sub.email) OR lower(sub.email) = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails,'{}')) e))`:
   - `find_grading_submission_student_matches`
   - `find_competition_submission_student_matches`
   - `find_seminar_submission_student_matches`
   - `find_school_fees_submission_student_matches`
   - the guards match finder
   Score weights, reason strings and the `WHERE email_match OR dob_match OR name_sim >= 0.4` filter stay unchanged.

No frontend changes are required; `src/integrations/supabase/types.ts` regenerates automatically after the migration.

## Out of scope

- Editing alternate emails in the student profile UI (can be added later if wanted).
- Backfilling alternate emails from historical submissions.
