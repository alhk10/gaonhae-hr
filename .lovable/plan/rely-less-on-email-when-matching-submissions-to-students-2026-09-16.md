# Rely less on email when matching submissions to students

## Why

Families use one email for every child, so email is currently the single strongest signal in
the match score (0.5 out of 1.4 — the same weight as the full name, and more than the birth
date at 0.3). That is why a sibling can outrank the right child, as in the Winston/Charlotte
Ho suggestion list where both siblings scored purely on "email match, same branch".

## What will change

1. **Email becomes a weak supporting signal, not a decider.**
   New weighting: name 0.6, birth date 0.5, email 0.15, branch 0.1. A shared family email can
   no longer lift a wrong sibling above the right child; the name and birth date decide.

2. **A shared email counts for even less.**
   When the same email belongs to more than one student, the email contribution drops to zero
   for that person — it carries no information about which child it is.

3. **Email alone never produces an automatic link.**
   A row is only auto-matched when the name agrees and the birth date either agrees or is
   missing. Anything recognised only by email or mobile stays for staff to confirm.

4. **Remembered manual matches stop keying on email or mobile alone.**
   Only "name + birth date" and "name + birth date + email" are remembered, so a later
   payment for a sibling on the same email is never silently linked to the first child.

5. **Same rules in the other scorers.**
   Uniforms & guards purchases and Hello callback matching use their own point systems; email
   is reduced there too (guards 2 → 1 point, callbacks 3 → 1 point) and shared emails score
   zero, keeping every screen consistent.

6. **Clearer reasons in the suggestion list.**
   The reason line shows "shared family email" instead of "email match" when the address
   belongs to several students, so staff can see why the score is low.

## Technical notes

- Migration rewriting the five scoring functions: `find_grading_submission_student_matches`,
  `find_competition_submission_student_matches`, `find_seminar_submission_student_matches`,
  `find_school_fees_submission_student_matches`, and the guards equivalent if present.
  Each gains a shared-email check (`count(*) > 1` over students sharing that address,
  including `alt_emails`) and the new weights; the candidate filter stays as is so email-only
  candidates are still shown, just ranked lower.
- `MAX_MATCH_SCORE` in `src/utils/submissionMatchConfidence.ts` moves from 1.4 to 1.35;
  `AUTO_MATCH_THRESHOLD` (77) and `AUTO_MATCH_GAP` (10) stay unchanged.
- `pickAutoMatch` gains a requirement that the chosen candidate's name similarity clears
  `NAME_SIMILARITY_FLOOR` and its birth date agrees or is absent.
- `buildIdentityKeys` drops the `em:` and `ph:` keys; `getOverrideGuards` and
  `rememberMatch` therefore only store and recall strong keys, and the weak-key handling
  (`preferredIsStrong` / `preferredIsWeak`) can be removed.
- Client scorers updated in `src/services/guardsPurchaseService.ts` and
  `src/services/chatCallbackApprovalService.ts`.
- No table or column changes.
